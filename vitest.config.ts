import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            // The 'obsidian' package has no runtime code; point it at a local mock
            obsidian: fileURLToPath(new URL('./tests/obsidian-mock.ts', import.meta.url)),
        },
        // Prefer .ts sources: the built main.js next to main.ts must not shadow it
        extensions: ['.ts', '.mjs', '.js', '.json'],
    },
});
