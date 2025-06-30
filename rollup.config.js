import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const isProd = process.env.BUILD === 'production';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: isProd ? false : 'inline',
    format: 'cjs',
    entryFileNames: 'main.js'
  },
  plugins: [
    typescript(),
    nodeResolve({ browser: true }),
    commonjs()
  ],
  external: ['obsidian', '@codemirror/view', '@codemirror/state']
};
