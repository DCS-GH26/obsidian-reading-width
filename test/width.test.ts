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
