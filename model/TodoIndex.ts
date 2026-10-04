import { TAbstractFile, TFile, Vault } from 'obsidian';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { TodoPluginSettings } from '../model/TodoPluginSettings';
import { DateParser } from '../util/DateParser';
import { TodoParser } from '../model/TodoParser';

export class TodoIndex {
  private vault: Vault;
  private todos: Map<string, TodoItem[]>;
  private listeners: ((todos: TodoItem[]) => void)[];
  private settings: TodoPluginSettings;

  constructor(vault: Vault, settings: TodoPluginSettings, listener: (todos: TodoItem[]) => void) {
    this.vault = vault;
    this.todos = new Map<string, TodoItem[]>();
    this.listeners = [listener];
    this.settings = settings;
  }

  async initialize(): Promise<void> {
    // TODO: persist index & last sync timestamp; only parse files that changed since then.
    const todoMap = new Map<string, TodoItem[]>();

    const markdownFiles = this.vault.getMarkdownFiles();
    for (const file of markdownFiles) {
      const todos = await this.parseTodosInFile(file);
      if (todos.length > 0) {
        todoMap.set(file.path, todos);
      }
    }

    this.todos = todoMap;
    this.registerEventHandlers();
    this.invokeListeners();
  }

  async setStatus(todo: TodoItem, newStatus: TodoItemStatus): Promise<void> {
    const file = this.vault.getAbstractFileByPath(todo.sourceFilePath);
    if (!(file instanceof TFile)) {
      return;
    }

    const contents = await this.vault.read(file);
    const newTodo = `[${newStatus === TodoItemStatus.Done ? 'x' : ' '}] ${todo.description}`;
    const newContents = contents.substring(0, todo.startIndex) + newTodo + contents.substring(todo.startIndex + todo.length);
    await this.vault.modify(file, newContents);
  }

  setSettings(settings: TodoPluginSettings): void {
    const oldSettings = this.settings;
    this.settings = settings;

    const reIndexRequired =
      oldSettings.dateFormat !== settings.dateFormat || oldSettings.dateTagFormat !== settings.dateTagFormat;
    if (reIndexRequired) {
      void this.initialize();
    }
  }

  private indexAbstractFile(file: TAbstractFile) {
    if (!(file instanceof TFile)) {
      return;
    }
    void this.indexFile(file);
  }

  private async indexFile(file: TFile): Promise<void> {
    try {
      const todos = await this.parseTodosInFile(file);
      this.todos.set(file.path, todos);
      this.invokeListeners();
    } catch {
      // Keep the last known index if reading or parsing a changed file fails.
    }
  }

  private clearIndex(path: string, silent = false) {
    this.todos.delete(path);
    if (!silent) {
      this.invokeListeners();
    }
  }

  private async parseTodosInFile(file: TFile): Promise<TodoItem[]> {
    // TODO: Does it make sense to index completed TODOs at all?
    const dateParser = new DateParser(this.settings.dateTagFormat, this.settings.dateFormat);
    const todoParser = new TodoParser(dateParser);
    const fileContents = await this.vault.cachedRead(file);
    const todos = await todoParser.parseTasks(file.path, fileContents);
    return todos.filter((todo) => todo.status === TodoItemStatus.Todo);
  }

  private registerEventHandlers() {
    this.vault.on('create', (file: TAbstractFile) => {
      this.indexAbstractFile(file);
    });
    this.vault.on('modify', (file: TAbstractFile) => {
      this.indexAbstractFile(file);
    });
    this.vault.on('delete', (file: TAbstractFile) => {
      this.clearIndex(file.path);
    });
    // We could simply change the references to the old path, but parsing again does the trick as well
    this.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
      this.clearIndex(oldPath);
      this.indexAbstractFile(file);
    });
  }

  private invokeListeners() {
    const todos = ([] as TodoItem[]).concat(...Array.from(this.todos.values()));
    this.listeners.forEach((listener) => listener(todos));
  }
}
