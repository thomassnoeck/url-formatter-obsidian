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
        // Load the stylesheet
        this.app.workspace.onLayoutReady(() => {
            this.app.workspace.containerEl.addClass('url-formatter-plugin-ready');
        });
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

        containerEl.createEl('h2', { text: 'URL Formatter Settings' });

        // Global Enable/Disable Toggle
        new Setting(containerEl)
            .setName('Enable URL Formatting')
            .setDesc('Toggle to enable or disable automatic URL formatting on paste.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Custom URL Patterns' });
        containerEl.createEl('p', { text: 'Define custom URL patterns to automatically format pasted links into clean Markdown.\nEach pattern requires:' });
        containerEl.createEl('ul')
            .createEl('li', { text: 'A friendly Name for identification.' })
            .createEl('li', { text: 'A Regular Expression (Regex) that matches the full URL.' })
            .createEl('li', { text: 'An Output Format String using `$0` for the full match, and `$1`, `$2`, etc., for capture groups. Remember to escape special characters (like . / ?).' });

        // Render each existing URL pattern
        this.plugin.settings.urlPatterns.forEach((patternConfig, index) => {
            const patternContainer = containerEl.createDiv('url-formatter-pattern-item'); 
            patternContainer.createEl('h4', { text: `Pattern ${index + 1}` }); 

            new Setting(patternContainer)
                .setName('Pattern Name')
                .setDesc('Give the pattern a name so you can identify its purpose. (e.g., "Blog X", "Jira Ticket", ... )')
                .addText(text => text
                    .setPlaceholder('e.g., "example.com"')
                    .setValue(patternConfig.name)
                    .onChange(async (value) => {
                        patternConfig.name = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(patternContainer)
                .setName('Regular Expression')
                .setDesc('The regex to match the URL. **Use `\\/` to escape literal forward slashes `/` and `\\.` to escape literal dots `.`')
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
                .setName('Output Format String')
                .setDesc('Use $0 for the full URL match, $1, $2, etc., for regex capture groups. e.g., "Blog: $1 - $2!"')
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
                    .setButtonText('Remove Pattern')
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
                .setButtonText('Add New Pattern')
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
