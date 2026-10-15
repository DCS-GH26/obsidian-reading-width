# Reading Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плагин Obsidian `reading-width`: ползунок и команды, которые на ходу меняют ширину полосы чтения.

**Architecture:** Чистая логика (`src/width.ts`, без Obsidian) отдельно от плагина (`src/main.ts`), который ставит CSS-переменную `--file-line-width` на `body` каждого окна. Ползунок во всплывающем блоке над строкой состояния (`src/popover.ts`), точные значения в настройках (`src/settings.ts`).

**Tech Stack:** TypeScript 5.6.3, esbuild 0.24.0, vitest 2.1.8, типы `obsidian` 1.14.4 (версии те же, что в плагине журнала `~/Vaults/TJCC/.dev/plugin`).

**Spec:** `docs/superpowers/specs/2026-10-15-reading-width-design.md`

## Global Constraints

- Переменная: `--file-line-width`, значение вида `900px`; снятие = `removeProperty`.
- Диапазон ширины 400–2400 px, шаг ползунка 10, шаг команд «Шире/Уже» по умолчанию 50 (допустимо 10–500).
- Стандарт Obsidian = 700 px; «по умолчанию» хранится как `null` и снимает переменную.
- Подписи по-русски: «Ширина 700», «Ширина стандарт», «Шире», «Уже», «Сбросить», «По умолчанию».
- Команды без горячих клавиш по умолчанию (назначает пользователь).
- id плагина `reading-width`, `isDesktopOnly: false`, `minAppVersion: 1.5.0`.
- Гит только локальный; ничего вне каталога проекта не менять, в хранилища не ставить (это делает исполнитель плана отдельным шагом Task 3 только в песочницу).

## Review Focus

- Повреждённый `data.json` (строка, массив, `null`, число вместо объекта): плагин стартует со значением «по умолчанию».
- Ширина вне диапазона или нечисловая в `data.json`: ограничивается или отбрасывается при загрузке.
- Шаг команд 0, отрицательный или текстом: приводится в 10–500, иначе 50.
- Шаг от границы (2400 «Шире», 400 «Уже»): не выходит за диапазон.
- Выключение плагина: переменная снята со всех окон (проверяется руками в Task 3).

Первые четыре пункта закреплены тестами в Task 1, пятый проверяется в Task 3.

---

### Task 1: Каркас проекта и чистая логика

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`, `manifest.json`, `.gitignore`
- Create: `src/width.ts`
- Test: `test/width.test.ts`

**Interfaces:**
- Produces (`src/width.ts`): константы `DEFAULT_WIDTH=700`, `MIN_WIDTH=400`, `MAX_WIDTH=2400`, `SLIDER_STEP=10`, `DEFAULT_STEP=50`, `MIN_STEP=10`, `MAX_STEP=500`, `VAR_NAME`; типы `WidthSettings { width: number | null; step: number }`, `WidthHost { getWidth(): number | null; setWidth(px: number | null): void }`; функции `clampWidth(px: number): number`, `parseStep(v: unknown): number`, `parseSettings(raw: unknown): WidthSettings`, `stepWidth(current: number | null, dir: 1 | -1, step: number): number`, `widthLabel(w: number | null): string`, `cssValue(w: number): string`.

- [ ] **Step 1: Каркас**

Создай файлы ровно такими.

`package.json`:
```json
{
  "name": "reading-width",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "dev": "node esbuild.config.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "deploy": "npm run build && node scripts/deploy.mjs"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "builtin-modules": "4.0.0",
    "esbuild": "0.24.0",
    "obsidian": "1.14.4",
    "typescript": "5.6.3",
    "vitest": "2.1.8"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "strict": true,
    "noImplicitAny": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src", "test"]
}
```

`esbuild.config.mjs`:
```js
import esbuild from 'esbuild';
import builtins from 'builtin-modules';

const prod = process.argv[2] === 'production';
const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*', ...builtins],
  format: 'cjs',
  target: 'es2022',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
});
if (prod) { await ctx.rebuild(); process.exit(0); } else { await ctx.watch(); }
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
```

`manifest.json`:
```json
{
  "id": "reading-width",
  "name": "Reading Width",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Регулируемая ширина полосы чтения: ползунок в строке состояния и команды «Шире», «Уже», «Сбросить».",
  "author": "Jw Ujl",
  "isDesktopOnly": false
}
```

`.gitignore`:
```
node_modules/
main.js
```

- [ ] **Step 2: Установить зависимости**

Run: `cd ~/projects/obsidian-reading-width && npm install --prefer-offline --no-audit --no-fund; echo exit=$?`
Expected: `exit=0`. Если сеть недоступна и `exit` не 0: `cp -r ~/Vaults/TJCC/.dev/plugin/node_modules . ; echo exit=$?` (те же версии).

- [ ] **Step 3: Падающий тест**

`test/width.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { clampWidth, cssValue, parseSettings, parseStep, stepWidth, widthLabel } from '../src/width';

describe('clampWidth', () => {
  it('holds the range and rounds', () => {
    expect(clampWidth(100)).toBe(400);
    expect(clampWidth(5000)).toBe(2400);
    expect(clampWidth(700.4)).toBe(700);
    expect(clampWidth(900)).toBe(900);
  });
  it('falls back to the standard width on a non-number', () => {
    expect(clampWidth(NaN)).toBe(700);
    expect(clampWidth(Infinity)).toBe(700);
  });
});

describe('parseStep', () => {
  it('keeps a good step, clamps the rest, defaults the junk', () => {
    expect(parseStep(30)).toBe(30);
    expect(parseStep(0)).toBe(10);
    expect(parseStep(-5)).toBe(10);
    expect(parseStep(9999)).toBe(500);
    expect(parseStep('50')).toBe(50);
    expect(parseStep(undefined)).toBe(50);
    expect(parseStep(NaN)).toBe(50);
  });
});

describe('parseSettings', () => {
  it('reads a good data.json', () => {
    expect(parseSettings({ width: 900, step: 20 })).toEqual({ width: 900, step: 20 });
  });
  it('null width means default', () => {
    expect(parseSettings({ width: null, step: 50 })).toEqual({ width: null, step: 50 });
  });
  it('clamps an out-of-range width', () => {
    expect(parseSettings({ width: 99999 }).width).toBe(2400);
    expect(parseSettings({ width: 5 }).width).toBe(400);
  });
  it('survives a broken data.json', () => {
    const def = { width: null, step: 50 };
    expect(parseSettings(null)).toEqual(def);
    expect(parseSettings(undefined)).toEqual(def);
    expect(parseSettings('900')).toEqual(def);
    expect(parseSettings(900)).toEqual(def);
    expect(parseSettings([])).toEqual(def);
    expect(parseSettings({ width: 'wide' })).toEqual(def);
  });
});

describe('stepWidth', () => {
  it('starts from the standard width when none is set', () => {
    expect(stepWidth(null, 1, 50)).toBe(750);
    expect(stepWidth(null, -1, 50)).toBe(650);
  });
  it('moves by the step', () => {
    expect(stepWidth(700, 1, 50)).toBe(750);
    expect(stepWidth(700, -1, 50)).toBe(650);
  });
  it('does not leave the range', () => {
    expect(stepWidth(2400, 1, 50)).toBe(2400);
    expect(stepWidth(2380, 1, 50)).toBe(2400);
    expect(stepWidth(400, -1, 50)).toBe(400);
  });
});

describe('labels', () => {
  it('status label', () => {
    expect(widthLabel(null)).toBe('Ширина стандарт');
    expect(widthLabel(900)).toBe('Ширина 900');
  });
  it('css value', () => {
    expect(cssValue(900)).toBe('900px');
  });
});
```

- [ ] **Step 4: Убедиться, что падает**

Run: `cd ~/projects/obsidian-reading-width && npx vitest run >/tmp/rw-test.txt 2>&1; echo exit=$?; tail -15 /tmp/rw-test.txt`
Expected: `exit` не 0 (нет `src/width.ts`).

- [ ] **Step 5: Реализация**

`src/width.ts`:
```ts
export const DEFAULT_WIDTH = 700;
export const MIN_WIDTH = 400;
export const MAX_WIDTH = 2400;
export const SLIDER_STEP = 10;
export const DEFAULT_STEP = 50;
export const MIN_STEP = 10;
export const MAX_STEP = 500;
export const VAR_NAME = '--file-line-width';

/** `width: null` = no override, Obsidian's own width. */
export interface WidthSettings { width: number | null; step: number }

/** What the popover and the settings tab need from the plugin. */
export interface WidthHost { getWidth(): number | null; setWidth(px: number | null): void }

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function clampWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_WIDTH;
  return clamp(Math.round(px), MIN_WIDTH, MAX_WIDTH);
}

export function parseStep(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_STEP;
  return clamp(Math.round(v), MIN_STEP, MAX_STEP);
}

/** `data.json` may be missing, empty or anything: whatever is not a usable number becomes the default. */
export function parseSettings(raw: unknown): WidthSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const w = o.width;
  return { width: typeof w === 'number' && Number.isFinite(w) ? clampWidth(w) : null, step: parseStep(o.step) };
}

export function stepWidth(current: number | null, dir: 1 | -1, step: number): number {
  return clampWidth((current ?? DEFAULT_WIDTH) + dir * step);
}

export const widthLabel = (w: number | null): string => (w === null ? 'Ширина стандарт' : `Ширина ${w}`);

export const cssValue = (w: number): string => `${w}px`;
```

- [ ] **Step 6: Тесты зелёные**

Run: `cd ~/projects/obsidian-reading-width && npx vitest run >/tmp/rw-test.txt 2>&1; echo exit=$?; tail -8 /tmp/rw-test.txt`
Expected: `exit=0`, все тесты прошли.

- [ ] **Step 7: Коммит**

```bash
cd ~/projects/obsidian-reading-width
git add package.json package-lock.json tsconfig.json esbuild.config.mjs vitest.config.ts manifest.json .gitignore src/width.ts test/width.test.ts
git commit -m "Каркас проекта и чистая логика ширины

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Плагин, ползунок, настройки, установка

**Files:**
- Create: `src/main.ts`, `src/popover.ts`, `src/settings.ts`, `styles.css`, `scripts/deploy.mjs`

**Interfaces:**
- Consumes: всё из `src/width.ts` (Task 1).
- Produces: класс `ReadingWidthPlugin` (default export `src/main.ts`) c методами `getWidth(): number | null`, `setWidth(px: number | null): void`, `step(dir: 1 | -1): void`, полем `settings: WidthSettings`, методом `saveSoon(): void`; класс `WidthPopover` (`src/popover.ts`) с `sync(): void` и `close(): void`; класс `WidthSettingTab` (`src/settings.ts`).

- [ ] **Step 1: `src/main.ts`**

```ts
import { Plugin } from 'obsidian';
import { WidthPopover } from './popover';
import { WidthSettingTab } from './settings';
import { VAR_NAME, clampWidth, cssValue, parseSettings, stepWidth, widthLabel, type WidthHost, type WidthSettings } from './width';

const SAVE_DELAY = 300;

export default class ReadingWidthPlugin extends Plugin implements WidthHost {
  settings: WidthSettings = { width: null, step: 50 };
  private statusEl!: HTMLElement;
  private popover: WidthPopover | null = null;
  private saveTimer: number | null = null;
  /** Every document the variable was put on: the main window and the pop-out windows seen so far. */
  private seen = new Set<Document>([document]);

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass('reading-width-status');
    this.statusEl.setAttribute('aria-label', 'Ширина полосы чтения');
    this.registerDomEvent(this.statusEl, 'click', () => this.togglePopover());

    this.addCommand({ id: 'wider', name: 'Шире', callback: () => this.step(1) });
    this.addCommand({ id: 'narrower', name: 'Уже', callback: () => this.step(-1) });
    this.addCommand({ id: 'reset', name: 'Сбросить', callback: () => this.setWidth(null) });
    this.addSettingTab(new WidthSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on('window-open', (_win, w) => { this.seen.add(w.document); this.applyTo(w.document); }));
    this.app.workspace.onLayoutReady(() => this.applyAll());
    this.applyAll();
    this.refreshStatus();
  }

  onunload(): void {
    this.popover?.close();
    for (const doc of this.seen) doc.body.style.removeProperty(VAR_NAME);
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      void this.saveData(this.settings);
    }
  }

  getWidth(): number | null { return this.settings.width; }

  setWidth(px: number | null): void {
    this.settings.width = px === null ? null : clampWidth(px);
    this.applyAll();
    this.refreshStatus();
    this.popover?.sync();
    this.saveSoon();
  }

  step(dir: 1 | -1): void { this.setWidth(stepWidth(this.settings.width, dir, this.settings.step)); }

  saveSoon(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => { this.saveTimer = null; void this.saveData(this.settings); }, SAVE_DELAY);
  }

  private applyTo(doc: Document): void {
    const w = this.settings.width;
    if (w === null) doc.body.style.removeProperty(VAR_NAME);
    else doc.body.style.setProperty(VAR_NAME, cssValue(w));
  }

  private applyAll(): void {
    this.app.workspace.iterateAllLeaves((leaf) => this.seen.add(leaf.view.containerEl.ownerDocument));
    for (const doc of this.seen) this.applyTo(doc);
  }

  private refreshStatus(): void { this.statusEl.setText(widthLabel(this.settings.width)); }

  private togglePopover(): void {
    if (this.popover) { this.popover.close(); return; }
    this.popover = new WidthPopover(this, this.statusEl, () => { this.popover = null; });
  }
}
```

- [ ] **Step 2: `src/popover.ts`**

```ts
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, SLIDER_STEP, widthLabel, type WidthHost } from './width';

/** A small floating block above the status bar item: a slider and a reset button. Closes on an outside click or Esc. */
export class WidthPopover {
  private el: HTMLElement;
  private range: HTMLInputElement;
  private value: HTMLElement;
  private closed = false;

  private onDown = (e: MouseEvent): void => {
    const t = e.target as Node;
    if (!this.el.contains(t) && !this.anchor.contains(t)) this.close();
  };
  private onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') this.close(); };

  constructor(private host: WidthHost, private anchor: HTMLElement, private onClose: () => void) {
    const doc = anchor.ownerDocument;
    this.el = doc.body.createDiv({ cls: 'reading-width-popover' });
    this.value = this.el.createDiv({ cls: 'reading-width-value' });
    this.range = this.el.createEl('input', { cls: 'reading-width-range', type: 'range' });
    this.range.min = String(MIN_WIDTH);
    this.range.max = String(MAX_WIDTH);
    this.range.step = String(SLIDER_STEP);
    this.range.addEventListener('input', () => this.host.setWidth(Number(this.range.value)));
    const reset = this.el.createEl('button', { cls: 'reading-width-reset', text: 'По умолчанию' });
    reset.addEventListener('click', () => this.host.setWidth(null));

    const r = anchor.getBoundingClientRect();
    this.el.style.left = `${Math.max(8, Math.min(r.left, doc.defaultView!.innerWidth - 240))}px`;
    this.el.style.bottom = `${doc.defaultView!.innerHeight - r.top + 6}px`;

    doc.addEventListener('mousedown', this.onDown, true);
    doc.addEventListener('keydown', this.onKey, true);
    this.sync();
  }

  /** Put the plugin's current width into the slider and the caption. */
  sync(): void {
    const w = this.host.getWidth();
    this.value.setText(widthLabel(w));
    this.range.value = String(w ?? DEFAULT_WIDTH);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    const doc = this.anchor.ownerDocument;
    doc.removeEventListener('mousedown', this.onDown, true);
    doc.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    this.onClose();
  }
}
```

- [ ] **Step 3: `src/settings.ts`**

```ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type ReadingWidthPlugin from './main';
import { DEFAULT_WIDTH, MAX_STEP, MAX_WIDTH, MIN_STEP, MIN_WIDTH, SLIDER_STEP, parseStep } from './width';

export class WidthSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ReadingWidthPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Ширина полосы чтения')
      .setDesc(`От ${MIN_WIDTH} до ${MAX_WIDTH} px. Работает при включённом «Ширина строки читаемая» в разделе «Редактор». «По умолчанию» возвращает стандартные ${DEFAULT_WIDTH} px.`)
      .addSlider((s) => s
        .setLimits(MIN_WIDTH, MAX_WIDTH, SLIDER_STEP)
        .setValue(this.plugin.getWidth() ?? DEFAULT_WIDTH)
        .setDynamicTooltip()
        .onChange((v) => this.plugin.setWidth(v)))
      .addExtraButton((b) => b
        .setIcon('rotate-ccw')
        .setTooltip('По умолчанию')
        .onClick(() => { this.plugin.setWidth(null); this.display(); }));

    new Setting(containerEl)
      .setName('Шаг команд «Шире» и «Уже»')
      .setDesc(`От ${MIN_STEP} до ${MAX_STEP} px.`)
      .addText((t) => t
        .setValue(String(this.plugin.settings.step))
        .onChange((v) => {
          this.plugin.settings.step = parseStep(Number(v));
          this.plugin.saveSoon();
        }));
  }
}
```

- [ ] **Step 4: `styles.css`**

```css
.reading-width-status { cursor: pointer; }
.reading-width-status:hover { color: var(--text-normal); }

.reading-width-popover {
  position: fixed;
  z-index: var(--layer-popover, 50);
  width: 220px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m, 8px);
  box-shadow: var(--shadow-s);
}
.reading-width-value { font-size: var(--font-ui-small); color: var(--text-muted); }
.reading-width-range { width: 100%; }
.reading-width-reset { align-self: flex-start; }
```

- [ ] **Step 5: `scripts/deploy.mjs`**

```js
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
```

- [ ] **Step 6: Сборка и тесты**

Run: `cd ~/projects/obsidian-reading-width && npx tsc --noEmit >/tmp/rw-tsc.txt 2>&1; echo tsc=$?; cat /tmp/rw-tsc.txt | head -20; node esbuild.config.mjs production >/tmp/rw-build.txt 2>&1; echo build=$?; ls -la main.js; npx vitest run >/tmp/rw-test.txt 2>&1; echo vitest=$?`
Expected: `tsc=0`, `build=0`, `main.js` существует, `vitest=0`.

Если `tsc` ругается на типы `obsidian` (например на `window-open` или `iterateAllLeaves`), не обходить через `any`: прочитать `node_modules/obsidian/obsidian.d.ts`, поправить сигнатуру под факт и сообщить об этом в отчёте.

- [ ] **Step 7: Коммит**

```bash
cd ~/projects/obsidian-reading-width
git add src/main.ts src/popover.ts src/settings.ts styles.css scripts/deploy.mjs
git commit -m "Плагин: ползунок, команды, настройки, установка

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Проверка в песочнице (делает основной агент, не исполнитель)

**Files:** нет изменений в коде, только проверка. Установка только в `~/Vaults/TJCC/.dev/sandbox`.

- [ ] **Step 1:** `npm run deploy -- ~/Vaults/TJCC/.dev/sandbox`, включить плагин через `app.plugins.enablePlugin('reading-width')`.
- [ ] **Step 2:** в песочнице через `eval`: `getComputedStyle(document.body).getPropertyValue('--file-line-width')` до и после `setWidth(1000)`; проверить, что ширина `.markdown-preview-sizer`/`.cm-sizer` реально меняется (не только переменная).
- [ ] **Step 3:** команды «Шире», «Уже», «Сбросить»: значение сдвигается на шаг, сброс снимает переменную.
- [ ] **Step 4:** перезапуск плагина: значение на месте. Выключение плагина: переменная снята.
- [ ] **Step 5:** снимок до и после, ползунок открывается кликом по строке состояния.
- [ ] **Step 6:** `git status` чистый, итог в отчёте.
