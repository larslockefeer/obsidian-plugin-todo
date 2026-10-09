import { App, PluginSettingTab, Setting } from 'obsidian';
import { DateTime } from 'luxon';
import TodoPlugin from 'main';
import { DEFAULT_SETTINGS } from '../model/TodoPluginSettings';

interface SettingDefinition {
  name: string;
  desc?: string;
  render: (setting: Setting) => void;
}

export class SettingsTab extends PluginSettingTab {
  private plugin: TodoPlugin;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.renderDateTagFormat(new Setting(containerEl));
    this.renderDateFormat(new Setting(containerEl));
    this.renderOpenFilesInNewLeaf(new Setting(containerEl));
  }

  getSettingDefinitions(): SettingDefinition[] {
    return [
      {
        name: 'Date tag format',
        desc: 'Format used to mark task due dates. Must include the %date% token.',
        render: (setting) => this.renderDateTagFormat(setting),
      },
      {
        name: 'Date format',
        desc: 'Date format used to recognise due dates. Uses Luxon format tokens.',
        render: (setting) => this.renderDateFormat(setting),
      },
      {
        name: 'Open files in a new leaf',
        desc: 'Open the file containing a todo in a new leaf instead of replacing the current file.',
        render: (setting) => this.renderOpenFilesInNewLeaf(setting),
      },
    ];
  }

  private renderDateTagFormat(setting: Setting): void {
    const currentSettings = this.plugin.getSettings();
    setting
      .setName('Date tag format')
      .setDesc(this.dateTagFormatDescription())
      .addText((text) =>
        text.setPlaceholder(currentSettings.dateTagFormat).onChange(async (dateTagFormat) => {
          if (dateTagFormat.length === 0) {
            dateTagFormat = DEFAULT_SETTINGS.dateTagFormat;
          }

          if (!this.validateDateTag(dateTagFormat)) {
            setting.descEl.empty();
            setting.setDesc(this.dateTagFormatDescription('Date tag must include %date% token.'));
            return;
          }

          setting.descEl.empty();
          setting.setDesc(this.dateTagFormatDescription());

          await this.plugin.updateSettings({ ...this.plugin.getSettings(), dateTagFormat });
        }),
      );
  }

  private renderDateFormat(setting: Setting): void {
    const currentSettings = this.plugin.getSettings();
    setting
      .setName('Date format')
      .setDesc(this.dateFormatDescription())
      .addText((text) =>
        text.setPlaceholder(currentSettings.dateFormat).onChange(async (dateFormat) => {
          if (dateFormat.length === 0) {
            dateFormat = DEFAULT_SETTINGS.dateFormat;
          }

          if (!this.validateDateFormat(dateFormat)) {
            setting.descEl.empty();
            setting.setDesc(this.dateTagFormatDescription('Invalid date format.'));
            return;
          }

          setting.descEl.empty();
          setting.setDesc(this.dateFormatDescription());

          await this.plugin.updateSettings({ ...this.plugin.getSettings(), dateFormat });
        }),
      );
  }

  private renderOpenFilesInNewLeaf(setting: Setting): void {
    setting
      .setName('Open files in a new leaf')
      .setDesc(
        'If enabled, when opening the file containing a todo that file will open in a new leaf. If disabled, it will replace the file that you currently have open.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.getSettings().openFilesInNewLeaf);
        toggle.onChange(async (openFilesInNewLeaf) => {
          await this.plugin.updateSettings({ ...this.plugin.getSettings(), openFilesInNewLeaf });
        });
      });
  }

  private dateTagFormatDescription(error?: string): DocumentFragment {
    const el = createFragment();
    el.appendText('The format in which the due date is included in the task description.');
    el.createEl('br');
    el.appendText('Must include the %date% token.');
    el.createEl('br');
    el.appendText("To configure the format of the date, see 'Date format'.");
    if (error != null) {
      el.createEl('br');
      el.appendText(`Error: ${error}`);
    }
    return el;
  }

  private dateFormatDescription(error?: string): DocumentFragment {
    const el = createFragment();
    el.appendText('Dates in this format will be recognised as due dates.');
    el.createEl('br');
    el.createEl('a', {
      href: 'https://moment.github.io/luxon/#/formatting?id=table-of-tokens',
      text: 'See the documentation for supported tokens.',
      attr: { target: '_blank' },
    });

    if (error != null) {
      el.createEl('br');
      el.appendText(`Error: ${error}`);
    }
    return el;
  }

  private validateDateTag(dateTag: string): boolean {
    if (dateTag.length === 0) {
      return true;
    }
    return dateTag.includes('%date%');
  }

  private validateDateFormat(dateFormat: string): boolean {
    if (dateFormat.length === 0) {
      return true;
    }
    const expected = DateTime.fromISO('2020-05-25');
    const formatted = expected.toFormat(dateFormat);
    const parsed = DateTime.fromFormat(formatted, dateFormat);
    return parsed.hasSame(expected, 'day') && parsed.hasSame(expected, 'month') && parsed.hasSame(expected, 'year');
  }
}
