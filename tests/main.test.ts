import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UrlFormatterPlugin from '../main';
import { DEFAULT_SETTINGS, UrlPattern } from '../src/types';

function createPlugin(patterns: UrlPattern[] = []): UrlFormatterPlugin {
    const plugin = new UrlFormatterPlugin({} as never, {} as never);
    plugin.settings = { urlPatterns: patterns };
    return plugin;
}

const TICKET_PATTERN: UrlPattern = {
    name: 'tickets',
    pattern: 'https:\\/\\/([a-z]+)\\.example\\.com\\/([A-Z0-9-]+)',
    formatString: '$2 ($1)',
    patternEnabled: true,
};

const BLANK_PATTERN: UrlPattern = { name: '', pattern: '', formatString: '', patternEnabled: true };

describe('formatUrl', () => {
    it('formats a matching URL into a markdown link', () => {
        const plugin = createPlugin([TICKET_PATTERN]);
        expect(plugin.formatUrl('https://acme.example.com/ABC-123'))
            .toBe('[ABC-123 (acme)](https://acme.example.com/ABC-123)');
    });

    it('returns null when no pattern matches', () => {
        const plugin = createPlugin([TICKET_PATTERN]);
        expect(plugin.formatUrl('https://unrelated.org/x')).toBeNull();
    });

    it('skips disabled patterns', () => {
        const plugin = createPlugin([{ ...TICKET_PATTERN, patternEnabled: false }]);
        expect(plugin.formatUrl('https://acme.example.com/ABC-123')).toBeNull();
    });

    it('skips blank patterns, so a freshly added row does not match every URL', () => {
        const plugin = createPlugin([BLANK_PATTERN]);
        expect(plugin.formatUrl('https://google.com')).toBeNull();
    });

    it('skips patterns with an empty format string', () => {
        const plugin = createPlugin([{ ...TICKET_PATTERN, formatString: '' }]);
        expect(plugin.formatUrl('https://acme.example.com/ABC-123')).toBeNull();
    });

    it('still applies a valid pattern listed after a blank row', () => {
        const plugin = createPlugin([BLANK_PATTERN, TICKET_PATTERN]);
        expect(plugin.formatUrl('https://acme.example.com/ABC-123'))
            .toBe('[ABC-123 (acme)](https://acme.example.com/ABC-123)');
    });

    it('resolves two-digit group references ($10 and up)', () => {
        const plugin = createPlugin([{
            name: 'many-groups',
            pattern: 'https:\\/\\/(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)\\.example\\.com',
            formatString: '$11$10$1',
            patternEnabled: true,
        }]);
        expect(plugin.formatUrl('https://abcdefghijk.example.com'))
            .toBe('[kja](https://abcdefghijk.example.com)');
    });

    it('does not re-substitute placeholders inside captured values', () => {
        const plugin = createPlugin([{
            name: 'dollar-in-url',
            pattern: 'https:\\/\\/example\\.com\\/(x\\$2y)\\/([A-Z])',
            formatString: '$1-$2',
            patternEnabled: true,
        }]);
        expect(plugin.formatUrl('https://example.com/x$2y/B'))
            .toBe('[x$2y-B](https://example.com/x$2y/B)');
    });

    it('leaves out-of-range group references as literal text', () => {
        const plugin = createPlugin([{
            name: 'literal-dollar',
            pattern: 'https:\\/\\/shop\\.example\\.com\\/([a-z]+)',
            formatString: '$1 costs $5',
            patternEnabled: true,
        }]);
        expect(plugin.formatUrl('https://shop.example.com/widget'))
            .toBe('[widget costs $5](https://shop.example.com/widget)');
    });

    it('ignores patterns with an invalid regex instead of throwing', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const plugin = createPlugin([
            { name: 'broken', pattern: '(', formatString: '$1', patternEnabled: true },
            TICKET_PATTERN,
        ]);
        expect(plugin.formatUrl('https://acme.example.com/ABC-123'))
            .toBe('[ABC-123 (acme)](https://acme.example.com/ABC-123)');
        expect(consoleError).toHaveBeenCalledOnce();
        consoleError.mockRestore();
    });
});

describe('isUrl', () => {
    it('accepts an absolute http(s) URL', () => {
        expect(createPlugin().isUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('rejects plain text', () => {
        expect(createPlugin().isUrl('just some words')).toBe(false);
    });

    it('rejects relative paths', () => {
        expect(createPlugin().isUrl('/browse/ABC-123')).toBe(false);
    });

    it('accepts non-http schemes (current behavior)', () => {
        expect(createPlugin().isUrl('obsidian://open?vault=notes')).toBe(true);
    });
});

describe('loadSettings', () => {
    it('falls back to the default patterns when no data is stored', async () => {
        const plugin = new UrlFormatterPlugin({} as never, {} as never);
        plugin.loadData = async () => null;

        await plugin.loadSettings();

        expect(plugin.settings.urlPatterns).toEqual(DEFAULT_SETTINGS.urlPatterns);

        // The fallback must be a copy: editing settings must not mutate DEFAULT_SETTINGS
        plugin.settings.urlPatterns[0].patternEnabled = false;
        expect(DEFAULT_SETTINGS.urlPatterns[0].patternEnabled).toBe(true);
    });

    it('backfills patternEnabled on patterns saved by older plugin versions', async () => {
        const plugin = new UrlFormatterPlugin({} as never, {} as never);
        plugin.loadData = async () => ({
            urlPatterns: [{ name: 'legacy', pattern: 'p', formatString: 'f' }],
        });

        await plugin.loadSettings();

        expect(plugin.settings.urlPatterns).toEqual([
            { name: 'legacy', pattern: 'p', formatString: 'f', patternEnabled: true },
        ]);
    });
});

describe('plugin lifecycle', () => {
    it('onload completes: settings load and the paste handler builds against real CodeMirror', async () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
        const plugin = new UrlFormatterPlugin({} as never, {} as never);

        await plugin.onload();

        expect(plugin.settings.urlPatterns.length).toBeGreaterThan(0);
        expect(plugin.createPasteHandler()).toBeDefined();
        consoleLog.mockRestore();
    });
});

describe('debounced saving', () => {
    beforeEach(() => {
        // The plugin uses window.setTimeout; vitest's node environment has no window
        vi.stubGlobal('window', globalThis);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('collapses rapid calls into a single save after the delay', async () => {
        const plugin = createPlugin();
        const saveData = vi.spyOn(plugin, 'saveData').mockResolvedValue(undefined);

        plugin.debouncedSaveSettings();
        plugin.debouncedSaveSettings();
        plugin.debouncedSaveSettings();
        expect(saveData).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(500);
        expect(saveData).toHaveBeenCalledTimes(1);
    });

    it('flushes a pending save on unload instead of losing it', async () => {
        const plugin = createPlugin();
        const saveData = vi.spyOn(plugin, 'saveData').mockResolvedValue(undefined);

        plugin.debouncedSaveSettings();
        plugin.onunload();
        expect(saveData).toHaveBeenCalledTimes(1);

        // The pending timer was cleared: no second save fires later
        await vi.advanceTimersByTimeAsync(1000);
        expect(saveData).toHaveBeenCalledTimes(1);
    });

    it('does not save on unload when nothing is pending', () => {
        const plugin = createPlugin();
        const saveData = vi.spyOn(plugin, 'saveData').mockResolvedValue(undefined);

        plugin.onunload();
        expect(saveData).not.toHaveBeenCalled();
    });

    it('does not save again on unload after the debounce already fired', async () => {
        const plugin = createPlugin();
        const saveData = vi.spyOn(plugin, 'saveData').mockResolvedValue(undefined);

        plugin.debouncedSaveSettings();
        await vi.advanceTimersByTimeAsync(500);
        expect(saveData).toHaveBeenCalledTimes(1);

        plugin.onunload();
        expect(saveData).toHaveBeenCalledTimes(1);
    });
});
