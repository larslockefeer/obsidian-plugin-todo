import { App, PluginSettingTab, Setting } from 'obsidian';
import { DateTime } from 'luxon';
import TodoPlugin from 'main';
import { DEFAULT_SETTINGS } from '../model/TodoPluginSettings';

export class SettingsTab extends PluginSettingTab {
  private plugin: TodoPlugin;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const currentSettings = this.plugin.getSettings();

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsidian TODO Settings' });

    const tagFormatSetting = new Setting(containerEl);
    tagFormatSetting
      .setName('Date tag format')
      .setDesc(this.dateTagFormatDescription())
      .addText((text) =>
        text.setPlaceholder(currentSettings.dateTagFormat).onChange(async (dateTagFormat) => {
          // TODO: refactor this
          if (dateTagFormat.length === 0) {
            dateTagFormat = DEFAULT_SETTINGS.dateTagFormat;
          }

          if (!this.validateDateTag(dateTagFormat)) {
            tagFormatSetting.descEl.empty();
            tagFormatSetting.setDesc(this.dateTagFormatDescription('Date tag must include %date% token.'));
            return;
          }

          tagFormatSetting.descEl.empty();
          tagFormatSetting.setDesc(this.dateTagFormatDescription());

          const newSettings = { ...currentSettings }
          newSettings.dateTagFormat = dateTagFormat;

          this.plugin.updateSettings(newSettings);
        }),
      );

    const dateFormatSetting = new Setting(containerEl);
    dateFormatSetting
      .setName('Date format')
      .setDesc(this.dateFormatDescription())
      .addText((text) =>
        text.setPlaceholder(currentSettings.dateFormat).onChange(async (dateFormat) => {
          // TODO: refactor this
          if (dateFormat.length === 0) {
            dateFormat = DEFAULT_SETTINGS.dateFormat;
          }

          if (!this.validateDateFormat(dateFormat)) {
            dateFormatSetting.descEl.empty();
            dateFormatSetting.setDesc(this.dateTagFormatDescription('Invalid date format.'));
            return;
          }

          dateFormatSetting.descEl.empty();
          dateFormatSetting.setDesc(this.dateTagFormatDescription());

          this.plugin.updateSettings({ ...currentSettings, dateFormat });
        }),
      );

    const somedayFormatSetting = new Setting(containerEl);
    somedayFormatSetting
      .setName('Someday Pattern/s')
      .setDesc(this.somedayParserInputDescription())
      .addText((text) => {
        let placeholder = this.stringifyTextParserPatternInput(DEFAULT_SETTINGS.somedayPatterns);
        let value = this.stringifyTextParserPatternInput(currentSettings.somedayPatterns);

        text.setPlaceholder(placeholder);
        if (placeholder !== value) {
          text.setValue(value);
        }

        text.onChange(async (patternString) => {
          somedayFormatSetting.descEl.empty();
          somedayFormatSetting.setDesc(this.somedayParserInputDescription());

          const somedayPatterns = this.parseTextParserPatternInput(patternString);
          const newSettings = { ...currentSettings, somedayPatterns };

          this.plugin.updateSettings(newSettings);
        })
      }).addButton((button) => {
        button.setButtonText('Reset to default');
        button.onClick(async () => {

          const somedayPatterns = DEFAULT_SETTINGS.somedayPatterns;
          const newSettings = { ...currentSettings, somedayPatterns };
          
          await this.plugin.updateSettings(newSettings);

          this.display();
        });
      });

    const hideFormatSetting = new Setting(containerEl);
    hideFormatSetting
      .setName('Hide TODO Pattern/s')
      .setDesc(this.hideParserInputDescription())
      .addText((text) => {
        let placeholder = this.stringifyTextParserPatternInput(DEFAULT_SETTINGS.hidePatterns);
        let value = this.stringifyTextParserPatternInput(currentSettings.hidePatterns);

        text.setPlaceholder(placeholder);
        if (placeholder !== value) {
          text.setValue(value);
        }

        text.onChange(async (patternString) => {
          hideFormatSetting.descEl.empty();
          hideFormatSetting.setDesc(this.hideParserInputDescription());

          const hidePatterns = this.parseTextParserPatternInput(patternString);
          const newSettings = { ...currentSettings, hidePatterns };

          this.plugin.updateSettings(newSettings);
        })
      }
      ).addButton((button) => {
        button.setButtonText('Reset to default');
        button.onClick(async () => {
          const hidePatterns = DEFAULT_SETTINGS.hidePatterns
          const newSettings = { ...currentSettings, hidePatterns };
          
          await this.plugin.updateSettings(newSettings);

          this.display();
        });
      });

    const includeFolderPatterns = new Setting(containerEl);
    includeFolderPatterns
      .setName('Pattern/s for files to include')
      .setDesc(this.includeFolderPatternsDescription())
      .addText((text) => {
        let placeholder = this.stringifyTextParserPatternInput(DEFAULT_SETTINGS.includeFolderPatterns);
        let value = this.stringifyTextParserPatternInput(currentSettings.includeFolderPatterns);

        text.setPlaceholder(placeholder);
        if (placeholder !== value) {
          text.setValue(value);
        }

        text.onChange(async (patternString) => {
          includeFolderPatterns.descEl.empty();
          includeFolderPatterns.setDesc(this.includeFolderPatternsDescription());

          const folderPatterns = this.parseTextParserPatternInput(patternString);

          this.plugin.updateSettings({ ...currentSettings, includeFolderPatterns: folderPatterns });
        })
      }
      ).addButton((button) => {
        button.setButtonText('Reset to default');
        button.onClick(async () => {
          includeFolderPatterns.descEl.empty();
          includeFolderPatterns.setDesc(this.includeFolderPatternsDescription());

          const folderPatterns = DEFAULT_SETTINGS.includeFolderPatterns;
          await this.plugin.updateSettings({ ...currentSettings, includeFolderPatterns: folderPatterns });

          this.display();
        });
      });

    new Setting(containerEl)
      .setName('Open files in a new leaf')
      .setDesc(
        'If enabled, when opening the file containing a TODO that file will open in a new leaf. If disabled, it will replace the file that you currently have open.',
      )
      .addToggle((toggle) => {
        toggle.setValue(currentSettings.openFilesInNewLeaf);
        toggle.onChange(async (openFilesInNewLeaf) => {
          this.plugin.updateSettings({ ...currentSettings, openFilesInNewLeaf });
        });
      });
  }

  private dateTagFormatDescription(error?: string): DocumentFragment {
    const el = document.createDocumentFragment();
    el.appendText('The format in which the due date is included in the task description.');
    el.appendChild(document.createElement('br'));
    el.appendText('Must include the %date% token.');
    el.appendChild(document.createElement('br'));
    el.appendText("To configure the format of the date, see 'Date format'.");
    if (error != null) {
      el.appendChild(document.createElement('br'));
      el.appendText(`Error: ${error}`);
    }
    return el;
  }

  private dateFormatDescription(error?: string): DocumentFragment {
    const el = document.createDocumentFragment();
    el.appendText('Dates in this format will be recognised as due dates.');
    el.appendChild(document.createElement('br'));

    const a = document.createElement('a');
    a.href = 'https://moment.github.io/luxon/#/formatting?id=table-of-tokens';
    a.text = 'See the documentation for supported tokens.';
    a.target = '_blank';
    el.appendChild(a);

    if (error != null) {
      el.appendChild(document.createElement('br'));
      el.appendText(`Error: ${error}`);
    }
    return el;
  }

  private somedayParserInputDescription(error?: string): DocumentFragment {
    const el = document.createDocumentFragment();
    el.appendText('TODOs with one or more matching patterns will be considered \'someday\' tasks.');
    el.appendChild(document.createElement('br'));
    el.appendText('Can be either a string, or a json object containing strings of patterns.');
    el.appendChild(document.createElement('br'));

    if (error != null) {
      el.appendChild(document.createElement('br'));
      el.appendText(`Error: ${error}`);
    }
    return el;
  }


  private hideParserInputDescription(error?: string): DocumentFragment {
    const el = document.createDocumentFragment();
    el.appendText('TODOs with one or more matching patterns will be skipped');
    el.appendChild(document.createElement('br'));
    el.appendText('Can be either a string, or a json object containing strings of patterns.');
    el.appendChild(document.createElement('br'));

    if (error != null) {
      el.appendChild(document.createElement('br'));
      el.appendText(`Error: ${error}`);
    }
    return el;
  }

  private includeFolderPatternsDescription(error?: string): DocumentFragment {
    const el = document.createDocumentFragment();
    el.appendText('The plugin will only parse TODOs in files that match one of the patterns.');
    el.appendChild(document.createElement('br'));
    el.appendText('Can be either a string, or a json object containing strings of patterns.');
    el.appendChild(document.createElement('br'));

    if (error != null) {
      el.appendChild(document.createElement('br'));
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

  private stringifyTextParserPatternInput(patterns: string | string[] | null): string {
    if (Array.isArray(patterns)) {
      return JSON.stringify(patterns);
    }

    return patterns;
  }

  private parseTextParserPatternInput(patternString: string): string | string[] | null {
    if (patternString == null || patternString == undefined || patternString.length == 0) {
      return null;
    }

    try {
      // Attempt to parse the input as JSON
      const parsed = JSON.parse(patternString);

      // Check if the parsed result is an array of strings
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }

      // If JSON.parse doesn't throw but the result is not a valid array, treat it as a single pattern string
      return patternString;
    } catch (e) {
      // If JSON parsing fails, treat the input as a single string
      return patternString;
    }
  }
}
