import { App, PluginSettingTab, Setting } from 'obsidian';
import type UrlFormatterPlugin from '../main';
import type { UrlPattern } from './types';

/**
 * Settings UI for the URL Formatter plugin
 * Provides an interface for managing URL patterns and their configurations
 */
export class UrlFormatterSettingTab extends PluginSettingTab {
    plugin: UrlFormatterPlugin;

    constructor(app: App, plugin: UrlFormatterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName("Custom url patterns").setHeading();
        containerEl.createEl('p').innerHTML = 'Define custom url patterns to automatically format pasted links into clean Markdown.<br>Each pattern requires:';

        const ul = containerEl.createEl('ul');
        ul.createEl('li', { text: 'A friendly name for identification.' })
        ul.createEl('li', { text: 'A regular expression (regex) that matches the full url.' });
        const liWithCode = ul.createEl('li');
        liWithCode.innerHTML = 'An output format string using <code>$0</code> for the full match, and <code>$1</code>, <code>$2</code>, etc., for capture groups. Remember to escape special characters (like . / ?).';
        ul.createEl('li', { text: 'You can easily toggle each pattern on or off.' });

        // Render each existing URL pattern
        this.plugin.settings.urlPatterns.forEach((patternConfig, index) => {
            this.renderPatternItem(patternConfig, index, containerEl);
        });

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add new pattern')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.urlPatterns.push({ name: '', pattern: '', formatString: '', patternEnabled: true });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // =========================================================
        // Buy Me A Coffee Button
        // =========================================================
        const bmcButtonContainer = containerEl.createDiv('url-formatter-bmc-container');

        new Setting(bmcButtonContainer)
            .addButton(button => {
                button.setButtonText('Buy me a coffee ☕')
                    .setClass('mod-cta')
                    .onClick(() => {
                        window.open('https://www.buymeacoffee.com/snoeckie', '_blank');
                    });

                const bmcBtnEl = button.buttonEl;
                bmcBtnEl.addClass('url-formatter-bmc-button');
            });
    }

    /**
     * Renders a single pattern configuration item in the settings UI
     * @param patternConfig - The pattern configuration to render
     * @param index - The index of the pattern in the array
     * @param containerEl - The parent container element
     */
    private renderPatternItem(patternConfig: UrlPattern, index: number, containerEl: HTMLElement): void {
        const patternContainer = containerEl.createDiv('url-formatter-pattern-item');

        // Pattern header with toggle
        new Setting(patternContainer)
            .setName(`Pattern ${index + 1}`).setHeading()
            .addToggle(toggle => toggle
                .setValue(patternConfig.patternEnabled)
                .onChange(async (value) => {
                    patternConfig.patternEnabled = value;
                    await this.plugin.saveSettings();
                }));

        // Pattern name
        new Setting(patternContainer)
            .setName('Pattern name')
            .setDesc('Give the pattern a name so you can identify its purpose. (e.g., "Blog X", "Jira Ticket", ... )')
            .addText(text => text
                .setPlaceholder('e.g., "example.com"')
                .setValue(patternConfig.name)
                .onChange((value) => {
                    patternConfig.name = value;
                    this.plugin.debouncedSaveSettings();
                }));

        // Regular expression with validation
        new Setting(patternContainer)
            .setName('Regular expression')
            .setDesc('The regex to match the url. **Use `\\/` to escape literal forward slashes `/` and `\\.` to escape literal dots `.`')
            .addText(text => {
                text.setPlaceholder('e.g., "https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)"')
                    .setValue(patternConfig.pattern)
                    .onChange((value) => {
                        patternConfig.pattern = value;

                        // Validate regex and provide visual feedback
                        try {
                            new RegExp(value);
                            text.inputEl.removeClass('url-formatter-invalid-regex');
                        } catch (e) {
                            text.inputEl.addClass('url-formatter-invalid-regex');
                        }

                        this.plugin.debouncedSaveSettings();
                    });
                text.inputEl.addClass('url-formatter-full-width-input');
                text.inputEl.addClass('url-formatter-margin-bottom');
            });

        // Output format string
        new Setting(patternContainer)
            .setName('Output format string')
            .setDesc('Use $0 for the full url match, $1, $2, etc., for regex capture groups. e.g., "Blog: $1 - $2!"')
            .addText(text => {
                text.setPlaceholder('e.g., "$2 ($1)"')
                    .setValue(patternConfig.formatString)
                    .onChange((value) => {
                        patternConfig.formatString = value;
                        this.plugin.debouncedSaveSettings();
                    });
                text.inputEl.addClass('url-formatter-full-width-input');
                text.inputEl.addClass('url-formatter-margin-bottom');
            });

        // Remove button - fixed closure bug by using filter instead of splice
        new Setting(patternContainer)
            .addButton(button => button
                .setButtonText('Remove pattern')
                .setIcon('trash')
                .setClass('mod-warning')
                .onClick(async () => {
                    this.plugin.settings.urlPatterns = this.plugin.settings.urlPatterns.filter(
                        p => p !== patternConfig
                    );
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }
}
