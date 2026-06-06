import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import type {
  SymptomEntity,
  SymptomCategory,
  StoolEntry,
  GasEvent,
} from '../../../core/models/entities/symptom.entity';
import type { AbdominalZone } from '../../../core/models/value-objects/pain-location.vo';
import type { PainType } from '../../../core/models/value-objects/pain-type.vo';

export interface AddSymptomInput {
  readonly occurredAt: Date;
  readonly category: SymptomCategory;
  readonly symptomKey: string;
  readonly intensity: number;
  readonly painZones?: ReadonlyArray<AbdominalZone>;
  readonly painTypes?: ReadonlyArray<PainType>;
  readonly stool?: StoolEntry;
  readonly gas?: GasEvent;
  readonly notes?: string;
}

export interface EditSymptomInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly category: SymptomCategory;
  readonly symptomKey: string;
  readonly intensity: number;
  readonly painZones?: ReadonlyArray<AbdominalZone>;
  readonly painTypes?: ReadonlyArray<PainType>;
  readonly stool?: StoolEntry;
  readonly gas?: GasEvent;
  readonly notes?: string;
}

export interface ActiveSymptomConfig {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly order: number;
  readonly custom: boolean;
}

export interface StoredSymptomConfig extends ActiveSymptomConfig {
  readonly active: boolean;
  readonly category: SymptomCategory;
  readonly inputMode?: 'intensity' | 'frequency' | 'boolean';
}

const DEFAULT_CONFIGS: StoredSymptomConfig[] = [
  // Bloc A — Digestifs
  { id: 'abdominal_pain',     key: 'abdominal_pain',     label: 'Douleur abdominale',    order: 0,  custom: false, active: true,  category: 'digestive' },
  { id: 'bloating',           key: 'bloating',           label: 'Ballonnements',         order: 1,  custom: false, active: true,  category: 'digestive' },
  { id: 'nausea',             key: 'nausea',             label: 'Nausées',               order: 2,  custom: false, active: true,  category: 'digestive' },
  { id: 'heartburn',          key: 'heartburn',          label: 'Brûlures d\'estomac',   order: 3,  custom: false, active: true,  category: 'digestive' },
  { id: 'transit',            key: 'transit',            label: 'Transit',               order: 4,  custom: false, active: true,  category: 'digestive' },
  { id: 'gas',                key: 'gas',                label: 'Flatulences',           order: 5,  custom: false, active: true,  category: 'digestive' },
  { id: 'belching',           key: 'belching',           label: 'Éructations',           order: 6,  custom: false, active: true,  category: 'digestive' },
  { id: 'early_satiety',      key: 'early_satiety',      label: 'Plénitude précoce',     order: 7,  custom: false, active: true,  category: 'digestive' },
  { id: 'postmeal_heaviness', key: 'postmeal_heaviness', label: 'Lourdeur post-repas',   order: 8,  custom: false, active: true,  category: 'digestive' },
  // Bloc B — Systémiques
  { id: 'fatigue',            key: 'fatigue',            label: 'Fatigue',               order: 9,  custom: false, active: true,  category: 'systemic'  },
  { id: 'headache',           key: 'headache',           label: 'Maux de tête',          order: 10, custom: false, active: true,  category: 'systemic'  },
  { id: 'brain_fog',          key: 'brain_fog',          label: 'Brouillard mental',     order: 11, custom: false, active: true,  category: 'systemic'  },
  { id: 'joint_pain',         key: 'joint_pain',         label: 'Douleurs articulaires', order: 12, custom: false, active: true,  category: 'systemic'  },
  { id: 'sleep_quality',      key: 'sleep_quality',      label: 'Qualité du sommeil',    order: 13, custom: false, active: true,  category: 'systemic'  },
  // Bloc C — Bien-être
  { id: 'wellbeing_score',    key: 'wellbeing_score',    label: 'Score de bien-être',    order: 14, custom: false, active: true,  category: 'wellbeing' },
  { id: 'mood',               key: 'mood',               label: 'Humeur / anxiété',      order: 15, custom: false, active: true,  category: 'wellbeing' },
  // Archivés — hors-specs §1.4.2, inactifs par défaut, historique conservé
  { id: 'energy',             key: 'energy',             label: 'Énergie globale',       order: 16, custom: false, active: false, category: 'wellbeing' },
  { id: 'stress',             key: 'stress',             label: 'Stress',                order: 17, custom: false, active: false, category: 'wellbeing' },
];

@Injectable({ providedIn: 'root' })
export class SymptomService {
  private readonly storage = inject(StorageService);

  async add(input: AddSymptomInput): Promise<string> {
    const symptom: SymptomEntity = {
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt,
      createdAt: new Date(),
      category: input.category,
      symptomKey: input.symptomKey,
      intensity: input.intensity,
      ...(input.painZones && { painZones: input.painZones }),
      ...(input.painTypes && { painTypes: input.painTypes }),
      ...(input.stool && { stool: input.stool }),
      ...(input.gas && { gas: input.gas }),
      ...(input.notes && { notes: input.notes }),
    };
    return this.storage.save('symptoms', symptom);
  }

  async edit(input: EditSymptomInput): Promise<void> {
    const existing = await this.storage.get<SymptomEntity>('symptoms', input.id);
    if (!existing) return;
    const updated: SymptomEntity = {
      ...existing,
      occurredAt: input.occurredAt,
      category: input.category,
      symptomKey: input.symptomKey,
      intensity: input.intensity,
      painZones: input.painZones,
      painTypes: input.painTypes,
      stool: input.stool,
      gas: input.gas,
      notes: input.notes,
      editedAt: new Date(),
    };
    await this.storage.save('symptoms', updated);
  }

  async getActiveConfigs(): Promise<ActiveSymptomConfig[]> {
    const configs = await this.getAllConfigs();
    return configs
      .filter(s => s.active)
      .sort((a, b) => a.order - b.order)
      .map(({ id, key, label, order, custom }) => ({ id, key, label, order, custom }));
  }

  /**
   * Retourne toutes les configs (actives et inactives), avec migration de catégorie pour données legacy.
   *
   * @returns Liste complète triée par order
   */
  async getAllConfigs(): Promise<StoredSymptomConfig[]> {
    const raw = await this.storage.getAll('symptom-config') as (Omit<StoredSymptomConfig, 'category'> & { category?: SymptomCategory })[];
    if (raw.length === 0) return [...DEFAULT_CONFIGS];
    return raw
      .sort((a, b) => a.order - b.order)
      .map(s => ({
        ...s,
        category: s.category ?? DEFAULT_CONFIGS.find(d => d.key === s.key)?.category ?? 'digestive',
      }));
  }

  /**
   * Remplace l'intégralité des configs persistées.
   *
   * @param configs - Nouvelle liste complète à sauvegarder
   */
  async saveConfigs(configs: StoredSymptomConfig[]): Promise<void> {
    await this.storage.clear('symptom-config');
    for (const config of configs) {
      await this.storage.save('symptom-config', config);
    }
  }

  /**
   * Réinitialise la configuration à la liste par défaut en effaçant le store.
   *
   * @remarks
   * Après l'appel, getActiveConfigs() et getAllConfigs() retournent DEFAULT_CONFIGS.
   */
  async resetToDefault(): Promise<void> {
    await this.storage.clear('symptom-config');
  }

  /**
   * Remplace l'entrée du même symptomKey pour le même jour calendaire, ou crée une nouvelle entrée.
   *
   * @remarks
   * Utilisé pour les symptômes à unicité journalière (ex: wellbeing_score, §1.4.2 Bloc C).
   * Tous les autres symptômes utilisent add() directement.
   *
   * @param input - Données du symptôme à insérer ou remplacer
   * @returns ID de l'entrée sauvegardée
   */
  async upsertDaySymptom(input: AddSymptomInput): Promise<string> {
    const dayStart = new Date(input.occurredAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(input.occurredAt);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = (
      await this.storage.getRange<SymptomEntity>('symptoms', 'occurredAt', dayStart, dayEnd)
    ).find(s => s.symptomKey === input.symptomKey);

    if (existing) {
      const updated: SymptomEntity = {
        ...existing,
        intensity: input.intensity,
        notes: input.notes,
        occurredAt: input.occurredAt,
        editedAt: new Date(),
      };
      return this.storage.save('symptoms', updated);
    }
    return this.add(input);
  }

}
