import { App, Plugin, PluginManifest, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_TODO } from './constants';
import { TodoItemView, TodoItemViewProps } from './ui/TodoItemView';
import { TodoItem, TodoItemStatus } from './model/TodoItem';
import { TodoIndex } from './model/TodoIndex';
import { TodoPluginSettings, DEFAULT_SETTINGS } from './model/TodoPluginSettings';
import { SettingsTab } from './ui/SettingsTab';
import { DateFormatter } from 'util/DateFormatter';
import { DateTime } from 'luxon';

export default class TodoPlugin extends Plugin {
  private dateFormatter: DateFormatter;
  private todoIndex: TodoIndex;
  private view: TodoItemView;
  private settings: TodoPluginSettings;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.todoIndex = new TodoIndex(this.app.vault, DEFAULT_SETTINGS, this.tick.bind(this));
  }

  async onload(): Promise<void> {
    this.settings = Object.assign(DEFAULT_SETTINGS, (await this.loadData()) ?? {});
    this.dateFormatter = new DateFormatter(this.settings.dateFormat);
    this.addSettingTab(new SettingsTab(this.app, this));
    
    this.addCommand({
      id: 'create-todo-list',
      name: 'Todo List',
      callback: () => {
        console.log('test);
      },
    });

    this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => {
      const todos: TodoItem[] = [];
      const props = {
        todos: todos,
        formatDate: (date: DateTime) => {
          return this.dateFormatter.formatDate(date);
        },
        openFile: (filePath: string) => {
          const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
          if (this.settings.openFilesInNewLeaf && this.app.workspace.getActiveFile()) {
            this.app.workspace.splitActiveLeaf().openFile(file);
          } else {
            this.app.workspace.getUnpinnedLeaf().openFile(file);
          }
        },
        toggleTodo: (todo: TodoItem, newStatus: TodoItemStatus) => {
          this.todoIndex.setStatus(todo, newStatus);
        },
      };
      this.view = new TodoItemView(leaf, props);
      return this.view;
    });

    this.app.workspace.onLayoutReady(() => {
      this.initLeaf();
      this.triggerIndex();
    });
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

  getSettings(): TodoPluginSettings {
    return this.settings;
  }

  async updateSettings(settings: TodoPluginSettings): Promise<void> {
    this.settings = settings;
    this.dateFormatter = new DateFormatter(this.settings.dateFormat);
    await this.saveData(this.settings);
    this.todoIndex.setSettings(settings);
  }

  private async triggerIndex(): Promise<void> {
    await this.todoIndex.initialize();
  }

  tick(todos: TodoItem[]): void {
    this.view.setProps((currentProps: TodoItemViewProps) => {
      return {
        ...currentProps,
        todos: todos,
      };
    });
  }
}
