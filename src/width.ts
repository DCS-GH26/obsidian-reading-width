export const DEFAULT_WIDTH = 700;
export const MIN_WIDTH = 400;
export const MAX_WIDTH = 2400;
export const SLIDER_STEP = 10;
export const DEFAULT_STEP = 50;
export const MIN_STEP = 10;
export const MAX_STEP = 500;
export const VAR_NAME = '--file-line-width';

export type WheelModifier = 'alt' | 'ctrl' | 'shift' | 'off';
export const WHEEL_MODIFIERS: WheelModifier[] = ['alt', 'ctrl', 'shift', 'off'];
export const DEFAULT_WHEEL_MODIFIER: WheelModifier = 'alt';
/** The popover steps by this many px per wheel notch (Shift: five times that). */
export const WHEEL_STEP = 10;
export const WHEEL_FAST = 5;
const NOTCH = 100;

/** `width: null` = no override, Obsidian's own width. */
export interface WidthSettings { width: number | null; step: number; wheelMod: WheelModifier }

/** What the popover and the settings tab need from the plugin. */
export interface WidthHost { getWidth(): number | null; setWidth(px: number | null): void; wheelHint(): string }

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function clampWidth(px: number): number {
  if (!Number.isFinite(px)) return DEFAULT_WIDTH;
  return clamp(Math.round(px), MIN_WIDTH, MAX_WIDTH);
}

export function parseStep(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_STEP;
  return clamp(Math.round(v), MIN_STEP, MAX_STEP);
}

export function parseWheelModifier(v: unknown): WheelModifier {
  return WHEEL_MODIFIERS.includes(v as WheelModifier) ? (v as WheelModifier) : DEFAULT_WHEEL_MODIFIER;
}

/** `data.json` may be missing, empty or anything: whatever is not a usable value becomes the default. */
export function parseSettings(raw: unknown): WidthSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const w = o.width;
  return { width: typeof w === 'number' && Number.isFinite(w) ? clampWidth(w) : null, step: parseStep(o.step), wheelMod: parseWheelModifier(o.wheelMod) };
}

export function stepWidth(current: number | null, dir: 1 | -1, step: number): number {
  return clampWidth((current ?? DEFAULT_WIDTH) + dir * step);
}

export const widthLabel = (w: number | null): string => (w === null ? 'Ширина стандарт' : `Ширина ${w}`);

export const cssValue = (w: number): string => `${w}px`;

/** Turns wheel events into whole notches: +1 = wider (wheel away from you), -1 = narrower. A touchpad sends many
 *  small deltas, they add up to a notch; reversing the direction drops the leftover. */
export class WheelNotches {
  private rest = 0;

  push(deltaY: number, deltaMode = 0): number {
    const px = deltaY * (deltaMode === 1 ? 40 : deltaMode === 2 ? 800 : 1);
    if (!Number.isFinite(px) || px === 0) return 0;
    if (this.rest !== 0 && Math.sign(px) !== Math.sign(this.rest)) this.rest = 0;
    this.rest += px;
    const n = Math.trunc(this.rest / NOTCH);
    this.rest -= n * NOTCH;
    return n === 0 ? 0 : -n;
  }
}

const MOD_NAME: Record<Exclude<WheelModifier, 'off'>, string> = { alt: 'Alt', ctrl: 'Ctrl', shift: 'Shift' };

/** The reminder line under the slider. */
export function wheelHint(mod: WheelModifier): string {
  const base = `Колесо: ±${WHEEL_STEP} px, Shift ×${WHEEL_FAST}.`;
  return mod === 'off' ? base : `${base} ${MOD_NAME[mod]} + колесо над заметкой.`;
}
