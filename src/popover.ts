import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, SLIDER_STEP, WHEEL_FAST, WHEEL_STEP, WheelNotches, widthLabel, type WidthHost } from './width';

/** A small floating block above the status bar item: a slider and a reset button. Closes on an outside click or Esc. */
export class WidthPopover {
  private el: HTMLElement;
  private range: HTMLInputElement;
  private value: HTMLElement;
  private closed = false;
  private notches = new WheelNotches();

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
    this.el.createDiv({ cls: 'reading-width-hint', text: this.host.wheelHint() });
    const reset = this.el.createEl('button', { cls: 'reading-width-reset', text: 'По умолчанию' });
    reset.addEventListener('click', () => this.host.setWidth(null));
    this.el.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const n = this.notches.push(e.deltaY, e.deltaMode);
      if (n !== 0) this.host.setWidth((this.host.getWidth() ?? DEFAULT_WIDTH) + n * WHEEL_STEP * (e.shiftKey ? WHEEL_FAST : 1));
    }, { passive: false });

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
