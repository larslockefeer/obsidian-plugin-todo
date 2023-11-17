import { TAbstractFile, TFile, Vault } from 'obsidian';
import { TodoItem, TodoItemStatus } from '../model/TodoItem';
import { TodoPluginSettings } from '../model/TodoPluginSettings';
import { DateParser } from '../util/DateParser';
import { TodoParser } from '../model/TodoParser';
import { TextPatternParser } from 'util/TextPatternParser';

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
    let numberOfTodos = 0;
    const timeStart = new Date().getTime();

    const markdownFiles = this.vault.getMarkdownFiles();

    //pass in parser to avoid re-creating it for each file
    const todoParser = this.NewTodoParser();

    for (const file of markdownFiles) {
      const todos = await this.parseTodosInFile(file, todoParser);
      numberOfTodos += todos.length;
      if (todos.length > 0) {
        todoMap.set(file.path, todos);
      }
    }

    const totalTimeMs = new Date().getTime() - timeStart;
    console.log(
      `[obsidian-plugin-todo] Parsed ${numberOfTodos} TODOs from ${markdownFiles.length} markdown files in (${
        totalTimeMs / 1000.0
      }s)`,
    );
    this.todos = todoMap;
    this.registerEventHandlers();
    this.invokeListeners();
  }

  setStatus(todo: TodoItem, newStatus: TodoItemStatus): void {
    const file = this.vault.getAbstractFileByPath(todo.sourceFilePath) as TFile;
    const fileContents = this.vault.read(file);
    fileContents.then((c: string) => {
      const newTodo = `[${newStatus === TodoItemStatus.Done ? 'x' : ' '}] ${todo.description}`;
      const newContents = c.substring(0, todo.startIndex) + newTodo + c.substring(todo.startIndex + todo.length);
      this.vault.modify(file, newContents);
    });
  }

  setSettings(settings: TodoPluginSettings): void {
    const oldSettings = {...this.settings};
    this.settings = settings;

    if (this.reIndexRequired(oldSettings, this.settings)) {
      this.initialize();
    }
  }

  private reIndexRequired(oldSettings: TodoPluginSettings, newSettings: TodoPluginSettings) {
    return(
      this.patternChanged(oldSettings.includeFolderPatterns, newSettings.includeFolderPatterns)
      || this.patternChanged(oldSettings.dateTagFormat, newSettings.dateTagFormat)
      || this.patternChanged(oldSettings.hidePatterns, newSettings.hidePatterns)
      || this.patternChanged(oldSettings.somedayPatterns, newSettings.somedayPatterns)
    );
  }

  private patternChanged(value1: string | string[] | null, value2: string | string[] | null): boolean {
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length || value1.some((val, index) => val !== value2[index])) {
        return true;
      }
    } else if (value1 !== value2) {
      return true;
    }
    
    return false;
  }

  private indexAbstractFile(file: TAbstractFile) {
    if (!(file instanceof TFile)) {
      return;
    }
    this.indexFile(file as TFile);
  }

  private indexFile(file: TFile) {
    // one off file?, spin up a new parser
    const todoParser = this.NewTodoParser();

    this.parseTodosInFile(file, todoParser).then((todos) => {
      this.todos.set(file.path, todos);
      this.invokeListeners();
    });
  }

  private clearIndex(path: string, silent = false) {
    this.todos.delete(path);
    if (!silent) {
      this.invokeListeners();
    }
  }

  private async parseTodosInFile(file: TFile, todoParser: TodoParser): Promise<TodoItem[]> {
    // TODO: Does it make sense to index completed TODOs at all?
    const fileContents = await this.vault.cachedRead(file);
    return todoParser
      .parseTasks(file.path, fileContents);
  }

  private registerEventHandlers() {
    // build parser to insert into parseTodosInFile

    this.vault.on('create', (file: TAbstractFile) => {
      this
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

  private NewTodoParser(): TodoParser {
    // tag parsers
    const dateParser = new DateParser(this.settings.dateTagFormat, this.settings.dateFormat);
    const somedayParser = new TextPatternParser(this.settings.somedayPatterns);
    const hideParser = new TextPatternParser(this.settings.hidePatterns);
    const folderParser = new TextPatternParser(this.settings.includeFolderPatterns);

    const todoParser = new TodoParser(dateParser, somedayParser, hideParser, folderParser, false);

    return todoParser;
  }
}
