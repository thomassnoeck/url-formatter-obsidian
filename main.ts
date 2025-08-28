import { Plugin, App, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';


interface UrlPattern {
    name: string;
    pattern: string;
    formatString: string;
}

interface UrlFormatterSettings {
    enabled: boolean;
    urlPatterns: UrlPattern[];
}

const DEFAULT_SETTINGS: UrlFormatterSettings = {
    enabled: true,
    urlPatterns: [
        {
            name: 'Tickets per company',
            pattern: 'https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)',
            formatString: '$2 ($1)', // Example output: ABC-123 (company) (if URL is company.example.com/ABC-123)
        },
    ]
};

export default class UrlFormatterPlugin extends Plugin {
    settings: UrlFormatterSettings = DEFAULT_SETTINGS;

    async onload() {
        console.log('URL Formatter Plugin loaded. Registering paste handler...');

        await this.loadSettings();
        this.addSettingTab(new UrlFormatterSettingTab(this.app, this));
        this.registerEditorExtension(this.createPasteHandler());
    }

    onunload() {
        console.log('URL Formatter Plugin unloaded.');
        this.app.workspace.containerEl.removeClass('url-formatter-plugin-ready');
    }

    createPasteHandler(): Extension {
        const plugin = this;

        return EditorView.domEventHandlers({
            paste: (event: ClipboardEvent, view: EditorView) => {

                if (!plugin.settings.enabled) {
                    return false;
                }

                const pastedText = event.clipboardData?.getData('text');

                // Check if text was pasted and if it's a valid URL
                if (pastedText && plugin.isUrl(pastedText)) {
                    const formattedText = plugin.formatUrl(pastedText);

                    if (formattedText) {
                        event.preventDefault();

                        const { from, to } = view.state.selection.main;
                        const newCursorPos = from + formattedText.length; // Calculate new cursor position at the end of inserted text

                        // Dispatch a transaction to replace the selected text with the formatted text
                        // and update the cursor position to the end of the new text.
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: formattedText
                            },
                            selection: { anchor: newCursorPos, head: newCursorPos } // Set cursor position
                        });
                        return true; // Event handled
                    }
                }
                return false; // If not handled, let other handlers or default paste proceed
            }
        });
    }

    // Loads settings from Obsidian's data storage.
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.settings.urlPatterns = this.settings.urlPatterns.map(pattern => {

            if (!pattern.hasOwnProperty('formatString') && pattern.hasOwnProperty('captureGroupIndex')) {
                const oldPattern = pattern as any;
                let newFormatString = `$${oldPattern.captureGroupIndex || 0}`;
                if (oldPattern.preposition) 
                    newFormatString = oldPattern.preposition + newFormatString;
                if (oldPattern.postposition) 
                    newFormatString = newFormatString + oldPattern.postposition;

                return {
                    name: oldPattern.name,
                    pattern: oldPattern.pattern,
                    formatString: newFormatString
                };
            }
            return pattern;
        });
    }

    // Saves current settings to Obsidian's data storage.
    async saveSettings() {
        await this.saveData(this.settings);
    }

    isUrl(text: string): boolean {
        try {
            new URL(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    formatUrl(url: string): string | null {
        // Iterate through each user-defined pattern
        for (const patternConfig of this.settings.urlPatterns) {
            try {
                const regex = new RegExp(patternConfig.pattern);
                const match = url.match(regex);

                if (match) {
                    let formattedDisplayText = patternConfig.formatString;

                    // Replace $1, $2, etc., with actual capture group values
                    for (let i = 0; i < match.length; i++) {
                        formattedDisplayText = formattedDisplayText.replace(new RegExp(`\\$${i}`, 'g'), match[i] || '');
                    }

                    return `[${formattedDisplayText}](${url})`;
                }
            } catch (e) {
                console.error(`URL Formatter Plugin: Invalid regex pattern "${patternConfig.pattern}":`, e);
            }
        }

        // no pattern matches..
        return null;
    }
}

// =========================================================
// Plugin Settings Tab
// =========================================================
class UrlFormatterSettingTab extends PluginSettingTab {
    plugin: UrlFormatterPlugin;

    constructor(app: App, plugin: UrlFormatterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Global Enable/Disable Toggle
        new Setting(containerEl)
            .setName('Enable url formatting')
            .setDesc('Toggle to enable or disable automatic url formatting on paste.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName("Custom url patterns").setHeading();
        containerEl.createEl('p', { text: 'Define custom url patterns to automatically format pasted links into clean Markdown.\nEach pattern requires:' });
        containerEl.createEl('ul')
            .createEl('li', { text: 'A friendly name for identification.' })
            .createEl('li', { text: 'A regular expression (regex) that matches the full url.' })
            .createEl('li', { text: 'An output format string using `$0` for the full match, and `$1`, `$2`, etc., for capture groups. Remember to escape special characters (like . / ?).' });

        // Render each existing URL pattern
        this.plugin.settings.urlPatterns.forEach((patternConfig, index) => {
            const patternContainer = containerEl.createDiv('url-formatter-pattern-item'); 
            new Setting(patternContainer).setName(`Pattern ${index + 1}`).setHeading();

            new Setting(patternContainer)
                .setName('Pattern name')
                .setDesc('Give the pattern a name so you can identify its purpose. (e.g., "Blog X", "Jira Ticket", ... )')
                .addText(text => text
                    .setPlaceholder('e.g., "example.com"')
                    .setValue(patternConfig.name)
                    .onChange(async (value) => {
                        patternConfig.name = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(patternContainer)
                .setName('Regular expression')
                .setDesc('The regex to match the url. **Use `\\/` to escape literal forward slashes `/` and `\\.` to escape literal dots `.`')
            const regexTextInput = new TextComponent(patternContainer) 
                .setPlaceholder('e.g., "https:\/\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)"')
                .setValue(patternConfig.pattern)
                .onChange(async (value) => {
                    patternConfig.pattern = value;
                    await this.plugin.saveSettings();
                });
            regexTextInput.inputEl.addClass('url-formatter-full-width-input');
            regexTextInput.inputEl.addClass('url-formatter-margin-bottom');

            new Setting(patternContainer)
                .setName('Output format string')
                .setDesc('Use $0 for the full url match, $1, $2, etc., for regex capture groups. e.g., "Blog: $1 - $2!"')
            const formatStringInput = new TextComponent(patternContainer)
                .setPlaceholder('e.g., "$2 ($1)"')
                .setValue(patternConfig.formatString)
                .onChange(async (value) => {
                    patternConfig.formatString = value;
                    await this.plugin.saveSettings();
                });
            formatStringInput.inputEl.addClass('url-formatter-full-width-input');
            formatStringInput.inputEl.addClass('url-formatter-margin-bottom');

            new Setting(patternContainer)
                .addButton(button => button
                    .setButtonText('Remove pattern')
                    .setIcon('trash')
                    .setClass('mod-warning')
                    .onClick(async () => {
                        this.plugin.settings.urlPatterns.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display(); 
                    }));

        });

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add new pattern')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.urlPatterns.push({ name: '', pattern: '', formatString: '' });
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
}
