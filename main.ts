import { Plugin, App, PluginSettingTab, Setting } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';


interface UrlPattern {
    name: string;
    pattern: string;
    formatString: string;
    patternEnabled: boolean;
}

interface UrlFormatterSettings {
    urlPatterns: UrlPattern[];
}

const DEFAULT_SETTINGS: UrlFormatterSettings = {
    urlPatterns: [
        {
            name: 'Tickets per company',
            pattern: 'https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)',
            formatString: '$2 ($1)', // Example output: ABC-123 (company) (if URL is company.example.com/ABC-123),
            patternEnabled: true,
        },
    ]
};

export default class UrlFormatterPlugin extends Plugin {
    settings!: UrlFormatterSettings;
    private saveDebounceTimer: NodeJS.Timeout | null = null;

    async onload() {
        console.log('URL Formatter Plugin loaded. Registering paste handler...');

        await this.loadSettings();
        this.addSettingTab(new UrlFormatterSettingTab(this.app, this));
        this.registerEditorExtension(this.createPasteHandler());
    }

    onunload() {
        console.log('URL Formatter Plugin unloaded.');
    }

    createPasteHandler(): Extension {
        const plugin = this;

        return EditorView.domEventHandlers({
            paste: (event: ClipboardEvent, view: EditorView) => {
                try {
                    const pastedText = event.clipboardData?.getData('text');

                    // Check if text was pasted and if it's a valid URL
                    if (pastedText && plugin.isUrl(pastedText)) {
                        const formattedText = plugin.formatUrl(pastedText);

                        if (formattedText) {
                            event.preventDefault();

                            const { from, to } = view.state.selection.main;
                            const newCursorPos = from + formattedText.length;

                            // Dispatch a transaction to replace the selected text with the formatted text
                            // and update the cursor position to the end of the new text
                            view.dispatch({
                                changes: { from, to, insert: formattedText },
                                selection: { anchor: newCursorPos, head: newCursorPos }
                            });
                            return true;
                        }
                    }
                } catch (error) {
                    console.error('URL Formatter Plugin: Error in paste handler:', error);
                }
                return false;
            }
        });
    }

    /**
     * Loads plugin settings from disk with proper deep merge and backward compatibility
     */
    async loadSettings() {
        const loadedData = await this.loadData();

        this.settings = {
            urlPatterns: loadedData?.urlPatterns ?? DEFAULT_SETTINGS.urlPatterns.map(p => ({ ...p }))
        };

        // Ensure backward compatibility for patternEnabled property
        this.settings.urlPatterns = this.settings.urlPatterns.map(pattern => ({
            ...pattern,
            patternEnabled: pattern.patternEnabled ?? true
        }));
    }

    /**
     * Saves current settings to Obsidian's data storage
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * Debounced save to prevent excessive disk writes during rapid user input
     * @param delayMs - Milliseconds to wait before saving (default: 500ms)
     */
    debouncedSaveSettings(delayMs: number = 500) {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
            this.saveSettings();
        }, delayMs);
    }

    /**
     * Checks if the provided text is a valid URL
     * @param text - The text to validate
     * @returns true if text is a valid URL, false otherwise
     */
    isUrl(text: string): boolean {
        try {
            new URL(text);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Formats a URL using configured patterns
     * @param url - The URL to format
     * @returns Markdown link with formatted text, or null if no pattern matches
     */
    formatUrl(url: string): string | null {
        // Iterate through each user-defined pattern
        for (const patternConfig of this.settings.urlPatterns) {

            if (patternConfig.patternEnabled === false) continue;

            try {
                const regex = new RegExp(patternConfig.pattern);
                const match = url.match(regex);

                if (match) {
                    let formattedDisplayText = patternConfig.formatString;

                    // Replace $0, $1, $2, etc., with actual capture group values
                    for (let i = 0; i < match.length; i++) {
                        const placeholder = `$${i}`;
                        formattedDisplayText = formattedDisplayText.replaceAll(placeholder, match[i] || '');
                    }

                    return `[${formattedDisplayText}](${url})`;
                }
            } catch (e) {
                console.error(`URL Formatter Plugin: Invalid regex pattern "${patternConfig.pattern}":`, e);
            }
        }

        // No pattern matches
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
                text.setPlaceholder('e.g., "https:\/\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)"')
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
