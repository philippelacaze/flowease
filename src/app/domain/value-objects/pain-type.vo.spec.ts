import { describe, it, expect } from 'vitest';
import { PAIN_TYPES, type PainType } from './pain-type.vo';

describe('PAIN_TYPES', () => {
  it('contient exactement 6 types de douleur', () => {
    expect(PAIN_TYPES).toHaveLength(6);
  });

  it('couvre tous les types attendus', () => {
    const ids = PAIN_TYPES.map((p) => p.id);
    const expected: PainType[] = ['cramping', 'bloating', 'burning', 'pressure', 'stabbing', 'nausea'];
    expect(ids).toEqual(expected);
  });

  it('chaque entrée a un label français non vide', () => {
    for (const painType of PAIN_TYPES) {
      expect(painType.labelFr.length).toBeGreaterThan(0);
    }
  });

  it('chaque entrée a un label anglais non vide', () => {
    for (const painType of PAIN_TYPES) {
      expect(painType.labelEn.length).toBeGreaterThan(0);
    }
  });

  it('les ids sont uniques', () => {
    const ids = PAIN_TYPES.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(PAIN_TYPES.length);
  });

  it('cramping a les labels corrects en FR et EN', () => {
    const cramping = PAIN_TYPES.find((p) => p.id === 'cramping');
    expect(cramping?.labelFr).toBe('Crampes');
    expect(cramping?.labelEn).toBe('Cramping');
  });

  it('nausea a les labels corrects en FR et EN', () => {
    const nausea = PAIN_TYPES.find((p) => p.id === 'nausea');
    expect(nausea?.labelFr).toBe('Nausée');
    expect(nausea?.labelEn).toBe('Nausea');
  });
});
