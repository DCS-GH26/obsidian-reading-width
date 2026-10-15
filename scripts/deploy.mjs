import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const vault = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(join(vault, '.obsidian'))) {
  console.error(`usage: npm run deploy -- <path to a vault> (no .obsidian in: ${vault})`);
  process.exit(1);
}
const dir = join(vault, '.obsidian', 'plugins', 'reading-width');
mkdirSync(dir, { recursive: true });
for (const f of ['main.js', 'manifest.json', 'styles.css']) copyFileSync(f, join(dir, f));
console.log(`deployed to ${dir}`);
