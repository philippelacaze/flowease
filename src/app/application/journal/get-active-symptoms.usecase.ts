import { inject, Injectable } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

export interface ActiveSymptomConfig {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly order: number;
  readonly custom: boolean;
}

interface StoredSymptomConfig extends ActiveSymptomConfig {
  readonly active: boolean;
}

const DEFAULT_CONFIGS: ActiveSymptomConfig[] = [
  { id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur abdominale',      order: 0,  custom: false },
  { id: 'bloating',       key: 'bloating',       label: 'Ballonnements',           order: 1,  custom: false },
  { id: 'nausea',         key: 'nausea',         label: 'Nausées',                 order: 2,  custom: false },
  { id: 'heartburn',      key: 'heartburn',      label: 'Brûlures d\'estomac',     order: 3,  custom: false },
  { id: 'transit',        key: 'transit',        label: 'Transit',                 order: 4,  custom: false },
  { id: 'gas',            key: 'gas',            label: 'Gaz / Flatulences',       order: 5,  custom: false },
  { id: 'fatigue',        key: 'fatigue',        label: 'Fatigue',                 order: 6,  custom: false },
  { id: 'headache',       key: 'headache',       label: 'Maux de tête',            order: 7,  custom: false },
  { id: 'brain_fog',      key: 'brain_fog',      label: 'Brouillard mental',       order: 8,  custom: false },
  { id: 'joint_pain',     key: 'joint_pain',     label: 'Douleurs articulaires',   order: 9,  custom: false },
  { id: 'energy',         key: 'energy',         label: 'Énergie globale',         order: 10, custom: false },
  { id: 'sleep_quality',  key: 'sleep_quality',  label: 'Qualité du sommeil',      order: 11, custom: false },
  { id: 'mood',           key: 'mood',           label: 'Humeur',                  order: 12, custom: false },
  { id: 'stress',         key: 'stress',         label: 'Stress',                  order: 13, custom: false },
];

/**
 * Retourne les symptômes actifs selon la configuration enregistrée par l'utilisateur.
 *
 * @remarks
 * Respecte SRP : lecture + filtrage de la configuration symptômes uniquement.
 * Repli sur DEFAULT_CONFIGS si aucune configuration n'a encore été sauvegardée.
 * Utilisé par SymptomEntryComponent pour construire la liste affichée à la saisie.
 */
@Injectable({ providedIn: 'root' })
export class GetActiveSymptomsUseCase {
  private readonly storage = inject<StorageRepository<StoredSymptomConfig>>(STORAGE_PORT as never);

  /**
   * Charge la configuration symptômes et retourne les entrées actives triées par ordre.
   *
   * @returns Symptômes actifs triés par order, ou liste par défaut si aucune config enregistrée
   */
  async execute(): Promise<ActiveSymptomConfig[]> {
    const saved = await this.storage.getAll('symptom-config') as StoredSymptomConfig[];
    if (saved.length === 0) return DEFAULT_CONFIGS;
    return saved
      .filter(s => s.active)
      .sort((a, b) => a.order - b.order)
      .map(({ id, key, label, order, custom }) => ({ id, key, label, order, custom }));
  }
}
