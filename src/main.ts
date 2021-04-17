import { App, Plugin, PluginManifest, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_TODO } from './constants';
import { TodoItemView, TodoItemViewProps } from './ui/TodoItemView';
import { TodoItem, TodoItemStatus } from './model/TodoItem';
import { TodoIndex } from './model/TodoIndex';
import { DEFAULT_SETTINGS, TodoPluginSettings, TodoPluginSettingTab } from './settings';

export default class TodoPlugin extends Plugin {
  settings: TodoPluginSettings;
  private todoIndex: TodoIndex;
  private view: TodoItemView;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.todoIndex = new TodoIndex(this.app.vault, this.tick.bind(this));
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new TodoPluginSettingTab(this.app, this));

    this.addCommand({
      id: 'refresh-all',
      name: 'Refresh All',
      callback: () => {
        this.prepareIndex(true);
      },
    });

    this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => {
      const todos: TodoItem[] = [];
      const props = {
        todos: todos,
        openFile: (filePath: string) => {
          const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
          this.app.workspace.splitActiveLeaf().openFile(file);
        },
        toggleTodo: (todo: TodoItem, newStatus: TodoItemStatus) => {
          this.todoIndex.setStatus(todo, newStatus);
        },
      };
      this.view = new TodoItemView(leaf, props);
      return this.view;
    });

    if (this.app.workspace.layoutReady) {
      this.initLeaf();
      await this.prepareIndex();
    } else {
      this.registerEvent(this.app.workspace.on('layout-ready', this.initLeaf.bind(this)));
      this.registerEvent(this.app.workspace.on('layout-ready', async () => await this.prepareIndex()));
    }
  }

  onunload(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO).forEach((leaf) => leaf.detach());
  }

  initLeaf(): void {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO).length) {
      return;
    }
    this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_TODO,
    });
  }

  async prepareIndex(notify = false): Promise<void> {
    await this.todoIndex.initialize(notify);
  }

  tick(todos: TodoItem[]): void {
    this.view.setProps((currentProps: TodoItemViewProps) => {
      return {
        ...currentProps,
        todos: todos,
      };
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    await this.prepareIndex();
  }
}
