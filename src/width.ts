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
