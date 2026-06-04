import { describe, it, expect } from 'vitest';
import { isFodmapDangerous, fodmapRank, type FodmapLevel } from './fodmap-level.vo';

describe('isFodmapDangerous', () => {
  it('retourne true uniquement pour le niveau high', () => {
    expect(isFodmapDangerous('high')).toBe(true);
  });

  it('retourne false pour le niveau low', () => {
    expect(isFodmapDangerous('low')).toBe(false);
  });

  it('retourne false pour le niveau medium', () => {
    expect(isFodmapDangerous('medium')).toBe(false);
  });

  it('retourne false pour le niveau unknown', () => {
    expect(isFodmapDangerous('unknown')).toBe(false);
  });
});

describe('fodmapRank', () => {
  it('retourne 0 pour low', () => {
    expect(fodmapRank('low')).toBe(0);
  });

  it('retourne 1 pour medium', () => {
    expect(fodmapRank('medium')).toBe(1);
  });

  it('retourne 2 pour high', () => {
    expect(fodmapRank('high')).toBe(2);
  });

  it('retourne -1 pour unknown', () => {
    expect(fodmapRank('unknown')).toBe(-1);
  });

  it('permet de trier les niveaux du moins au plus dangereux', () => {
    const levels: FodmapLevel[] = ['high', 'unknown', 'low', 'medium'];
    const sorted = [...levels].sort((a, b) => fodmapRank(a) - fodmapRank(b));
    expect(sorted).toEqual(['unknown', 'low', 'medium', 'high']);
  });
});
