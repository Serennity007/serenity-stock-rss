import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';
const projectLicense = readFileSync(new URL('./LICENSE', import.meta.url), 'utf8');
const fontLicense = readFileSync(new URL('./fonts/OFL.txt', import.meta.url), 'utf8');
const turndownLicense = readFileSync(new URL('./node_modules/turndown/LICENSE', import.meta.url), 'utf8');
const turndownGfmLicense = readFileSync(new URL('./node_modules/turndown-plugin-gfm/LICENSE', import.meta.url), 'utf8');
// UTF-8 output avoids expanding bundled Chinese catalogs into Unicode escapes.
// Identifier minification keeps the eight-language tables within the 5 MB release budget; esbuild scopes renames safely inside the bundle.
const options = { entryPoints: ['src/main.ts'], bundle: true, minify: true, charset: 'utf8', loader: { '.woff2': 'dataurl' }, external: ['obsidian', '@codemirror/view', '@codemirror/state', 'electron', 'node:fs', 'node:path'], format: 'cjs', target: 'es2022', outfile: 'main.js', logLevel: 'info', sourcemap: false, banner: { js: `/*! Stocks AI RSS — a finance fork of Qiaomu AI RSS.\nOriginal code: Copyright (c) 2026 向阳乔木 (https://github.com/joeseesun/qiaomu-ai-rss); GPL-3.0-only.\nFork changes: Copyright (c) 2026 Pasteliangzhengtao (https://github.com/Serennity007/stocks-ai-rss); GPL-3.0-only.\n${projectLicense}\nBundled fonts: SIL OFL 1.1\n${fontLicense}\nTurndown: MIT\n${turndownLicense}\nTurndown GFM: MIT\n${turndownGfmLicense}*/` } };
if (process.argv.includes('--watch')) await (await context(options)).watch();
else {
  await build(options);
  for (const asset of ['main.js', 'styles.css']) {
    if (readFileSync(asset).byteLength > 5_000_000) throw new Error(`${asset} exceeds the 5 MB release budget`);
  }
}
