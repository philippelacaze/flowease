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

export interface SaveWellbeingInput {
  readonly date: Date;
  readonly score: number;
}

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
    const saved = await this.storage.getAll('symptom-config') as StoredSymptomConfig[];
    if (saved.length === 0) return DEFAULT_CONFIGS;
    return saved
      .filter(s => s.active)
      .sort((a, b) => a.order - b.order)
      .map(({ id, key, label, order, custom }) => ({ id, key, label, order, custom }));
  }

  async saveWellbeing(input: SaveWellbeingInput): Promise<string> {
    const dayStart = new Date(input.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(input.date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySymptoms = await this.storage.getRange<SymptomEntity>('symptoms', 'occurredAt', dayStart, dayEnd);
    const existing = daySymptoms.find(s => s.symptomKey === 'wellbeing_score');

    const now = new Date();
    const symptom: SymptomEntity = existing
      ? { ...existing, intensity: input.score, occurredAt: now }
      : {
          id: crypto.randomUUID(),
          category: 'wellbeing',
          symptomKey: 'wellbeing_score',
          intensity: input.score,
          occurredAt: now,
          createdAt: now,
        };

    return this.storage.save('symptoms', symptom);
  }
}
