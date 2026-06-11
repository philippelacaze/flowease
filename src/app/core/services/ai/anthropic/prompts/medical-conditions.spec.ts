import { describe, it, expect } from 'vitest';
import { describeConditions, describeProtocol, FALLBACK_CONDITIONS, CONDITION_LABELS } from './medical-conditions';

describe('describeConditions', () => {
  it('mappe les codes connus vers leurs libellés français', () => {
    expect(describeConditions(['gastroparesis'])).toBe('gastroparésie');
    expect(describeConditions(['sibo_methane'])).toBe('SIBO au méthane');
  });

  it('joint plusieurs conditions par des virgules', () => {
    expect(describeConditions(['sibo_hydrogen', 'gerd'])).toBe(
      `${CONDITION_LABELS.sibo_hydrogen}, ${CONDITION_LABELS.gerd}`,
    );
  });

  it('ajoute le texte libre « Autres conditions » à la liste', () => {
    expect(describeConditions(['gastroparesis'], 'Endométriose')).toBe('gastroparésie, Endométriose');
  });

  it('utilise le texte libre seul quand aucune condition codée n\'est sélectionnée', () => {
    expect(describeConditions([], 'Maladie cœliaque')).toBe('Maladie cœliaque');
  });

  it('retombe sur une formulation neutre quand tout est vide', () => {
    expect(describeConditions([])).toBe(FALLBACK_CONDITIONS);
    expect(describeConditions([], '   ')).toBe(FALLBACK_CONDITIONS);
  });

  it('conserve les codes inconnus tels quels plutôt que de les perdre', () => {
    expect(describeConditions(['condition_exotique'])).toBe('condition_exotique');
  });
});

describe('describeProtocol', () => {
  it('mappe les protocoles connus vers leur libellé', () => {
    expect(describeProtocol('strict')).toBe('régime FODMAP strict');
    expect(describeProtocol('reintroduction')).toBe('phase de réintroduction FODMAP');
  });

  it('retourne « Non renseigné » pour « none » ou un code inconnu', () => {
    expect(describeProtocol('none')).toBe('Non renseigné');
    expect(describeProtocol('inconnu')).toBe('Non renseigné');
  });
});
