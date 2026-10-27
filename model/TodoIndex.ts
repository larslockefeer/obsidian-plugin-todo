import { EventRef, TAbstractFile, TFile, Vault } from 'obsidian';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { TodoPluginSettings } from '../model/TodoPluginSettings';
import { DateParser } from '../util/DateParser';
import { TodoParser } from '../model/TodoParser';

const READ_CONCURRENCY = 8;
const NOTIFY_INTERVAL_MS = 100;

export class TodoIndex {
  private todos = new Map<string, TodoItem[]>();
  private settings: TodoPluginSettings;
  private parser: TodoParser;
  private eventRefs: EventRef[] = [];
  private revisions = new Map<string, number>();
  private generation = 0;
  private indexing = true;
  private disposed = false;
  private notifyTimer: number | undefined;

  constructor(
    private vault: Vault,
    settings: TodoPluginSettings,
    private listener: (todos: TodoItem[]) => void,
  ) {
    this.settings = { ...settings };
    this.parser = this.createParser();
  }

  getTodos(): TodoItem[] {
    return ([] as TodoItem[]).concat(...Array.from(this.todos.values()));
  }

  isIndexing(): boolean {
    return this.indexing;
  }

  async initialize(): Promise<void> {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.indexing = true;
    // Subscribe before reading: mobile sync and edits can arrive during the scan.
    this.registerEventHandlers();
    const files = this.vault.getMarkdownFiles().map((file) => ({
      file,
      path: file.path,
      revision: this.revisions.get(file.path) ?? 0,
    }));
    const paths = new Set(files.map(({ path }) => path));
    for (const path of this.todos.keys()) {
      if (!paths.has(path)) this.todos.delete(path);
    }
    this.invokeListener();

    // Bound memory / I/O pressure, but don't serialize every mobile file read.
    // Yield between batches even when cachedRead resolves immediately.
    for (let start = 0; start < files.length; start += READ_CONCURRENCY) {
      if (this.disposed || generation !== this.generation) return;
      await Promise.all(files.slice(start, start + READ_CONCURRENCY).map(({ file, path, revision }) => {
        if (file.path !== path || (this.revisions.get(path) ?? 0) !== revision) return;
        return this.indexFile(file);
      }));
      if (start + READ_CONCURRENCY < files.length) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }
    }
    if (this.disposed || generation !== this.generation) return;
    this.indexing = false;
    this.invokeListener();
  }

  dispose(): void {
    this.disposed = true;
    this.generation++;
    this.eventRefs.forEach((ref) => this.vault.offref(ref));
    this.eventRefs = [];
    this.cancelNotification();
  }

  async setStatus(todo: TodoItem, newStatus: TodoItemStatus): Promise<void> {
    const file = this.vault.getAbstractFileByPath(todo.sourceFilePath);
    if (!(file instanceof TFile)) return;
    const contents = await this.vault.read(file);
    const newTodo = `[${newStatus === TodoItemStatus.Done ? 'x' : ' '}] ${todo.description}`;
    const newContents = contents.substring(0, todo.startIndex) + newTodo + contents.substring(todo.startIndex + todo.length);
    await this.vault.modify(file, newContents);
  }

  setSettings(settings: TodoPluginSettings): void {
    const oldSettings = this.settings;
    this.settings = { ...settings };
    this.parser = this.createParser();
    if (
      this.eventRefs.length &&
      (oldSettings.dateFormat !== settings.dateFormat || oldSettings.dateTagFormat !== settings.dateTagFormat)
    ) {
      void this.initialize().catch((error: unknown) => {
        console.error('[obsidian-plugin-todo] Failed to reindex tasks', error);
      });
    }
  }

  private createParser(): TodoParser {
    return new TodoParser(new DateParser(this.settings.dateTagFormat, this.settings.dateFormat));
  }

  private indexAbstractFile(file: TAbstractFile): void {
    if (file instanceof TFile && file.extension === 'md') void this.indexFile(file);
  }

  private async indexFile(file: TFile): Promise<void> {
    const path = file.path;
    const generation = this.generation;
    const revision = (this.revisions.get(path) ?? 0) + 1;
    this.revisions.set(path, revision);
    const parser = this.parser;
    try {
      const contents = await this.vault.cachedRead(file);
      if (this.disposed || generation !== this.generation || this.revisions.get(path) !== revision) return;
      // Completed tasks need no date parsing or TodoItem allocation in the index.
      const todos = await parser.parseTasks(path, contents, true);
      if (this.disposed || generation !== this.generation || this.revisions.get(path) !== revision) return;
      if (todos.length) this.todos.set(path, todos);
      else this.todos.delete(path);
      this.scheduleNotification();
    } catch (error) {
      // One unreadable note must not prevent the rest of the vault from loading.
      console.warn(`[obsidian-plugin-todo] Failed to index ${path}`, error);
    }
  }

  private clearIndex(path: string): void {
    // Include descendants when a folder is deleted or renamed.
    for (const key of new Set([...this.revisions.keys(), ...this.todos.keys(), path])) {
      if (key === path || key.startsWith(`${path}/`)) {
        this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
        this.todos.delete(key);
      }
    }
    this.scheduleNotification();
  }

  private registerEventHandlers(): void {
    if (this.eventRefs.length) return;
    this.eventRefs.push(
      this.vault.on('create', (file) => this.indexAbstractFile(file)),
      this.vault.on('modify', (file) => this.indexAbstractFile(file)),
      this.vault.on('delete', (file) => this.clearIndex(file.path)),
      this.vault.on('rename', (file, oldPath) => {
        this.clearIndex(oldPath);
        if (file instanceof TFile) this.indexAbstractFile(file);
        else {
          for (const child of this.vault.getMarkdownFiles()) {
            if (child.path.startsWith(`${file.path}/`)) this.indexAbstractFile(child);
          }
        }
      }),
    );
  }

  private scheduleNotification(): void {
    if (this.disposed || this.notifyTimer !== undefined) return;
    this.notifyTimer = window.setTimeout(() => this.invokeListener(), NOTIFY_INTERVAL_MS);
  }

  private cancelNotification(): void {
    if (this.notifyTimer !== undefined) window.clearTimeout(this.notifyTimer);
    this.notifyTimer = undefined;
  }

  private invokeListener(): void {
    this.cancelNotification();
    if (!this.disposed) this.listener(this.getTodos());
  }
}
