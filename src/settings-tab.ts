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
        containerEl.createEl('p', { text: 'Define custom url patterns to automatically format pasted links into clean Markdown. Each pattern requires:' });

        const ul = containerEl.createEl('ul');
        ul.createEl('li', { text: 'A friendly name for identification.' });
        ul.createEl('li', { text: 'A regular expression (regex) that matches the url.' });
        const liWithCode = ul.createEl('li');
        liWithCode.appendText('An output format string using ');
        liWithCode.createEl('code', { text: '$0' });
        liWithCode.appendText(' for the full match, and ');
        liWithCode.createEl('code', { text: '$1' });
        liWithCode.appendText(', ');
        liWithCode.createEl('code', { text: '$2' });
        liWithCode.appendText(', etc., for capture groups.');
        ul.createEl('li', { text: 'Use the test field under each pattern to try it on a sample url and preview the result.' });

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
        const fallbackHeading = `Pattern ${index + 1}`;

        // Sample url the user is testing this pattern against (not persisted)
        let testUrl = '';
        let previewEl: HTMLElement;

        const updatePreview = () => {
            previewEl.removeClass('is-match', 'is-error');

            if (!testUrl) {
                previewEl.setText('Enter a test url above to see a live preview of the result.');
                return;
            }

            try {
                new RegExp(patternConfig.pattern);
            } catch (e) {
                previewEl.addClass('is-error');
                previewEl.setText(`Invalid regular expression: ${e instanceof Error ? e.message : String(e)}`);
                return;
            }

            if (!patternConfig.pattern || !patternConfig.formatString) {
                previewEl.setText('Fill in the regular expression and output format string to preview.');
                return;
            }

            const result = this.plugin.formatUrlWithPattern(testUrl, patternConfig);
            if (result) {
                previewEl.addClass('is-match');
                previewEl.setText(`✓ ${result}`);
            } else {
                previewEl.addClass('is-error');
                previewEl.setText('✗ This url does not match the regular expression.');
            }
        };

        // Pattern header with toggle; shows the pattern's name and follows edits live
        const headingSetting = new Setting(patternContainer)
            .setName(patternConfig.name || fallbackHeading)
            .setHeading()
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
                    headingSetting.setName(value || fallbackHeading);
                    this.plugin.debouncedSaveSettings();
                }));

        // Regular expression with validation
        const regexSetting = new Setting(patternContainer)
            .setName('Regular expression')
            .setDesc('The regex to match the url. Escape literal dots and slashes with a backslash: \\. and \\/');
        regexSetting.settingEl.addClass('url-formatter-stacked');
        regexSetting.addText(text => {
            text.setPlaceholder('e.g., https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)')
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

                    updatePreview();
                    this.plugin.debouncedSaveSettings();
                });
        });

        // Output format string
        const formatSetting = new Setting(patternContainer)
            .setName('Output format string')
            .setDesc('Use $0 for the full url match, $1, $2, etc., for regex capture groups. e.g., "Blog: $1 - $2!"');
        formatSetting.settingEl.addClass('url-formatter-stacked');
        formatSetting.addText(text => {
            text.setPlaceholder('e.g., $2 ($1)')
                .setValue(patternConfig.formatString)
                .onChange((value) => {
                    patternConfig.formatString = value;
                    updatePreview();
                    this.plugin.debouncedSaveSettings();
                });
        });

        // Live tester: paste a sample url and preview the formatted result
        const testSetting = new Setting(patternContainer)
            .setName('Test with a sample url')
            .setDesc('Paste an example url to preview what this pattern produces. (not saved)');
        testSetting.settingEl.addClass('url-formatter-stacked');
        testSetting.addText(text => {
            text.setPlaceholder('e.g., https://acme.example.com/ABC-123')
                .onChange((value) => {
                    testUrl = value.trim();
                    updatePreview();
                });
        });

        previewEl = patternContainer.createDiv('url-formatter-preview');
        updatePreview();

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
