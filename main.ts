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

  private pluginSettings: TodoPluginSettings;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.todoIndex = new TodoIndex(this.app.vault, DEFAULT_SETTINGS, (todos: TodoItem[]) => this.tick(todos));
  }

  onload(): void {
    void this.loadPlugin().catch((error: unknown) => {
      console.error('[obsidian-plugin-todo] Failed to load plugin', error);
    });
  }

  private async loadPlugin(): Promise<void> {
    const loadedData: unknown = await this.loadData();
    const savedSettings =
      typeof loadedData === 'object' && loadedData !== null ? (loadedData as Partial<TodoPluginSettings>) : {};
    this.pluginSettings = { ...DEFAULT_SETTINGS, ...savedSettings };
    this.dateFormatter = new DateFormatter(this.pluginSettings.dateFormat);
    this.addSettingTab(new SettingsTab(this.app, this));

    this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => {
      const todos: TodoItem[] = [];
      const props = {
        todos: todos,
        formatDate: (date: DateTime) => {
          return this.dateFormatter.formatDate(date);
        },
        openFile: (filePath: string) => {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (!(file instanceof TFile)) {
            return;
          }

          if (this.pluginSettings.openFilesInNewLeaf && this.app.workspace.getActiveFile()) {
            void this.app.workspace.getLeaf(true).openFile(file).catch((error: unknown) => {
              console.error(`[obsidian-plugin-todo] Failed to open ${filePath}`, error);
            });
          } else {
            void this.app.workspace.getLeaf(false).openFile(file).catch((error: unknown) => {
              console.error(`[obsidian-plugin-todo] Failed to open ${filePath}`, error);
            });
          }
        },
        toggleTodo: (todo: TodoItem, newStatus: TodoItemStatus) => {
          void this.todoIndex.setStatus(todo, newStatus).catch((error: unknown) => {
            console.error('[obsidian-plugin-todo] Failed to update TODO status', error);
          });
        },
      };
      return new TodoItemView(leaf, props);
    });

    this.app.workspace.onLayoutReady(() => {
      void this.initializeView().catch((error: unknown) => {
        console.error('[obsidian-plugin-todo] Failed to initialize TODO view', error);
      });
    });
  }

  private async initializeView(): Promise<void> {
    await this.initLeaf();
    await this.triggerIndex();
  }

  onunload(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO).forEach((leaf) => leaf.detach());
  }

  async initLeaf(): Promise<void> {
    if (this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO).length) {
      return;
    }
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_TODO,
    });
  }

  getSettings(): TodoPluginSettings {
    return this.pluginSettings;
  }

  async updateSettings(settings: TodoPluginSettings): Promise<void> {
    this.pluginSettings = settings;
    this.dateFormatter = new DateFormatter(this.pluginSettings.dateFormat);
    await this.saveData(this.pluginSettings);
    this.todoIndex.setSettings(settings);
  }

  private async triggerIndex(): Promise<void> {
    await this.todoIndex.initialize();
  }

  tick(todos: TodoItem[]): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO)) {
      if (leaf.view instanceof TodoItemView) {
        leaf.view.setProps((currentProps: TodoItemViewProps) => ({
          ...currentProps,
          todos,
        }));
      }
    }
  }
}
