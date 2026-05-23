import { describe, it, expect } from 'vitest';
import { BRISTOL_DESCRIPTIONS, type BristolType } from './bristol-type.vo';

describe('BRISTOL_DESCRIPTIONS', () => {
  it('couvre exactement les 7 types de l\'échelle de Bristol', () => {
    expect(BRISTOL_DESCRIPTIONS).toHaveLength(7);
  });

  it('contient un descripteur pour chaque type de 1 à 7', () => {
    const types = BRISTOL_DESCRIPTIONS.map((d) => d.type);
    const expected: BristolType[] = [1, 2, 3, 4, 5, 6, 7];
    expect(types).toEqual(expected);
  });

  it('chaque entrée a un label français non vide', () => {
    for (const desc of BRISTOL_DESCRIPTIONS) {
      expect(desc.labelFr.length).toBeGreaterThan(0);
    }
  });

  it('chaque entrée a un label anglais non vide', () => {
    for (const desc of BRISTOL_DESCRIPTIONS) {
      expect(desc.labelEn.length).toBeGreaterThan(0);
    }
  });

  it('le type 4 est décrit comme saucisse lisse et molle (type normal)', () => {
    const type4 = BRISTOL_DESCRIPTIONS.find((d) => d.type === 4);
    expect(type4?.labelFr).toBe('Saucisse lisse et molle');
    expect(type4?.labelEn).toBe('Smooth soft sausage');
  });

  it('le type 7 correspond à entièrement liquide (diarrhée sévère)', () => {
    const type7 = BRISTOL_DESCRIPTIONS.find((d) => d.type === 7);
    expect(type7?.labelFr).toBe('Entièrement liquide');
    expect(type7?.labelEn).toBe('Entirely liquid');
  });

  it('le type 1 correspond aux morceaux durs (constipation)', () => {
    const type1 = BRISTOL_DESCRIPTIONS.find((d) => d.type === 1);
    expect(type1?.labelFr).toBe('Morceaux durs séparés');
    expect(type1?.labelEn).toBe('Separate hard lumps');
  });
});
