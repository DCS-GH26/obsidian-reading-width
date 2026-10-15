import { describe, expect, it } from 'vitest';
import { WheelNotches, clampWidth, cssValue, parseSettings, parseStep, parseWheelModifier, stepWidth, wheelHint, widthLabel } from '../src/width';

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
    expect(parseSettings({ width: 900, step: 20 })).toEqual({ width: 900, step: 20, wheelMod: 'alt' });
  });
  it('null width means default', () => {
    expect(parseSettings({ width: null, step: 50 })).toEqual({ width: null, step: 50, wheelMod: 'alt' });
  });
  it('clamps an out-of-range width', () => {
    expect(parseSettings({ width: 99999 }).width).toBe(2400);
    expect(parseSettings({ width: 5 }).width).toBe(400);
  });
  it('survives a broken data.json', () => {
    const def = { width: null, step: 50, wheelMod: 'alt' };
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

describe('wheel modifier', () => {
  it('keeps a known value, defaults the rest', () => {
    expect(parseWheelModifier('ctrl')).toBe('ctrl');
    expect(parseWheelModifier('off')).toBe('off');
    expect(parseWheelModifier('meta')).toBe('alt');
    expect(parseWheelModifier(undefined)).toBe('alt');
    expect(parseSettings({ wheelMod: 'shift' }).wheelMod).toBe('shift');
  });
  it('hint names the key, or none when off', () => {
    expect(wheelHint('alt')).toBe('Колесо: ±10 px, Shift ×5. Alt + колесо над заметкой.');
    expect(wheelHint('off')).toBe('Колесо: ±10 px, Shift ×5.');
  });
});

describe('WheelNotches', () => {
  it('wheel away is wider, toward you is narrower', () => {
    expect(new WheelNotches().push(-100)).toBe(1);
    expect(new WheelNotches().push(100)).toBe(-1);
  });
  it('small touchpad deltas add up to one notch', () => {
    const w = new WheelNotches();
    expect([w.push(-40), w.push(-40), w.push(-40)]).toEqual([0, 0, 1]);
  });
  it('a fast flick gives several notches', () => {
    expect(new WheelNotches().push(-300)).toBe(3);
  });
  it('reversing drops the leftover', () => {
    const w = new WheelNotches();
    expect(w.push(-60)).toBe(0);
    expect(w.push(60)).toBe(0); // the -60 is dropped, 60 starts over
    expect(w.push(60)).toBe(-1); // 120 in the new direction; without the drop this would stay 0
  });
  it('line and page modes are scaled, zero and junk ignored', () => {
    expect(new WheelNotches().push(-3, 1)).toBe(1);
    expect(new WheelNotches().push(0)).toBe(0);
    expect(new WheelNotches().push(NaN)).toBe(0);
  });
});
