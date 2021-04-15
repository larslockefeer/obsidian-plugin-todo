import { App, Plugin, PluginManifest, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_TODO } from './constants';
import { TodoItemView, TodoItemViewProps } from './ui/TodoItemView';
import { TodoItem, TodoItemStatus } from './model/TodoItem';
import { TodoIndex } from './model/TodoIndex';

const DEFAULT_SETTINGS: TodoPluginSettings = {
	openInNewLeaf: true,
};

interface TodoPluginSettings {
	openInNewLeaf: boolean;
}

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

		this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => {
			const todos: TodoItem[] = [];
			const props = {
				todos: todos,
				openFile: (filePath: string) => {
					const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
					if (this.settings.openInNewLeaf && !(this.app.workspace.getActiveFile() == null)) {
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

	async prepareIndex(): Promise<void> {
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TodoPluginSettingTab extends PluginSettingTab {
	plugin: TodoPlugin;
	app: App;

	constructor(app: App, plugin: TodoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.app = app;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Obsidian TODO | Text-based GTD' });
		containerEl.createEl('p', {
			text: 'Collects all outstanding TODOs from your vault and presents them in lists Today, Scheduled, Inbox and Someday/Maybe.',
		});
		containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Open files in a new leaf')
			.setDesc('If enabled, when you click to open a file containing a todo, that file will open in a new leaf. If disabled, it will replace the file that you currently have open.')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openInNewLeaf);
				toggle.onChange(async (value) => {
					this.plugin.settings.openInNewLeaf = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
