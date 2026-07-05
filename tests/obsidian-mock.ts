/**
 * Minimal stand-in for the 'obsidian' package, which ships type definitions only
 * (the real API is injected by the Obsidian app at runtime). Aliased in
 * vitest.config.ts so plugin code can be imported and tested in Node.
 */
export class Plugin {
    constructor(..._args: unknown[]) {}

    async loadData(): Promise<unknown> {
        return null;
    }

    async saveData(_data: unknown): Promise<void> {}

    addSettingTab(_tab: unknown): void {}

    registerEditorExtension(_extension: unknown): void {}
}

export class PluginSettingTab {
    constructor(..._args: unknown[]) {}
}

export class Setting {
    constructor(..._args: unknown[]) {}
}
