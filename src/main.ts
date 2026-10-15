import { Plugin } from 'obsidian';
import { WidthPopover } from './popover';
import { WidthSettingTab } from './settings';
import { VAR_NAME, WheelNotches, clampWidth, cssValue, parseSettings, stepWidth, widthLabel, wheelHint, type WidthHost, type WidthSettings } from './width';

const SAVE_DELAY = 300;

export default class ReadingWidthPlugin extends Plugin implements WidthHost {
  settings: WidthSettings = { width: null, step: 50, wheelMod: 'alt' };
  private statusEl!: HTMLElement;
  private popover: WidthPopover | null = null;
  private saveTimer: number | null = null;
  /** Every document the variable was put on: the main window and the pop-out windows seen so far. */
  private seen = new Set<Document>([document]);
  private wheelOn = new Set<Document>();
  private notches = new WheelNotches();

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

  wheelHint(): string { return wheelHint(this.settings.wheelMod); }

  setWidth(px: number | null): void {
    this.settings.width = px === null ? null : clampWidth(px);
    this.applyAll();
    this.refreshStatus();
    this.popover?.sync();
    this.saveSoon();
  }

  step(dir: 1 | -1, times = 1): void {
    let w = this.settings.width;
    for (let i = 0; i < times; i++) w = stepWidth(w, dir, this.settings.step);
    this.setWidth(w);
  }

  saveSoon(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => { this.saveTimer = null; void this.saveData(this.settings); }, SAVE_DELAY);
  }

  /** Modifier + wheel over a note changes the width without opening the popover. The page does not scroll meanwhile. */
  private onWheel = (e: WheelEvent): void => {
    const mod = this.settings.wheelMod;
    if (mod === 'off' || !e[`${mod}Key` as 'altKey' | 'ctrlKey' | 'shiftKey']) return;
    const t = e.target as Element | null;
    if (!t || t.closest('.reading-width-popover') || !t.closest('.markdown-reading-view, .markdown-source-view')) return;
    e.preventDefault();
    e.stopPropagation();
    const n = this.notches.push(e.deltaY || e.deltaX, e.deltaMode);
    if (n !== 0) this.step(n > 0 ? 1 : -1, Math.abs(n));
  };

  private watchWheel(doc: Document): void {
    if (this.wheelOn.has(doc)) return;
    this.wheelOn.add(doc);
    this.registerDomEvent(doc, 'wheel', this.onWheel, { passive: false, capture: true });
  }

  private applyTo(doc: Document): void {
    this.watchWheel(doc);
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
