import { Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { UrlFormatterSettingTab } from './src/settings-tab';
import { UrlFormatterSettings, DEFAULT_SETTINGS } from './src/types';

/**
 * URL Formatter Plugin for Obsidian
 * Automatically formats pasted URLs into clean Markdown links using custom patterns
 */
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
