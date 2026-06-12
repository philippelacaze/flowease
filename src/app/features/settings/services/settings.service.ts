import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import type { UserProfileEntity } from '../../../core/models/entities/user-profile.entity';
import type { CureEntity } from '../../../core/models/entities/cure.entity';

const PROFILE_ID = 'singleton' as const;

const EXPORT_STORES = [
  'meals', 'symptoms', 'intakes', 'notes', 'treatments', 'cures',
  'insights', 'reports', 'coach-sessions', 'symptom-config', 'user-profile',
] as const;

const VALID_STORES = new Set(EXPORT_STORES);

export interface CreateCureInput {
  readonly name: string;
  readonly treatmentIds: readonly string[];
  readonly durationDays: number;
  readonly startedAt: Date;
  readonly notes: string;
}

export interface ExportBundle {
  readonly version: 1;
  readonly exportedAt: string;
  readonly stores: Record<string, unknown[]>;
}

export class ImportValidationError extends Error {
  constructor(reason: string) {
    super(`Import invalide : ${reason}`);
    this.name = 'ImportValidationError';
  }
}

export type ImportMode = 'replace' | 'merge';

export interface TestApiKeyResult {
  readonly ok: boolean;
  readonly errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly ai = inject(AiService);

  async saveProfile(profile: Omit<UserProfileEntity, 'id' | 'updatedAt'>): Promise<void> {
    await this.storage.save('user-profile', { ...profile, id: PROFILE_ID, updatedAt: new Date() });
  }

  async getCures(): Promise<CureEntity[]> {
    const all = await this.storage.getAll('cures') as CureEntity[];
    return all.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  async createCure(input: CreateCureInput): Promise<CureEntity> {
    const cure: CureEntity = {
      id: crypto.randomUUID(),
      name: input.name,
      treatmentIds: input.treatmentIds,
      status: 'active',
      durationDays: input.durationDays,
      startedAt: input.startedAt,
      notes: input.notes,
      createdAt: new Date(),
    };
    await this.storage.save('cures', cure);
    return cure;
  }

  async exportData(): Promise<string> {
    const storeData: Record<string, unknown[]> = {};

    await Promise.all(
      EXPORT_STORES.map(async store => {
        storeData[store] = await this.storage.getAll(store);
      }),
    );

    const bundle: ExportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      stores: storeData,
    };

    return JSON.stringify(bundle, null, 2);
  }

  async importData(json: string, mode: ImportMode = 'replace'): Promise<void> {
    const bundle = this.parse(json);
    this.validate(bundle);

    if (mode === 'replace') {
      await Promise.all(
        Object.keys(bundle.stores).map(store => this.storage.clear(store)),
      );
    }

    for (const [store, entities] of Object.entries(bundle.stores)) {
      if (!VALID_STORES.has(store as typeof EXPORT_STORES[number])) continue;
      for (const entity of entities) {
        if (!this.hasId(entity)) continue;
        if (mode === 'merge') {
          const existing = await this.storage.get(store, entity.id);
          if (existing !== undefined) continue;
        }
        await this.storage.save(store, entity);
      }
    }
  }

  async testApiKey(apiKey: string): Promise<TestApiKeyResult> {
    if (!apiKey.trim()) {
      return { ok: false, errorMessage: 'Clé vide' };
    }
    const error = await this.ai.testApiKey(apiKey.trim());
    return error === null ? { ok: true } : { ok: false, errorMessage: error };
  }

  private parse(json: string): ExportBundle {
    try {
      return JSON.parse(json) as ExportBundle;
    } catch {
      throw new ImportValidationError('JSON non parsable');
    }
  }

  private validate(bundle: unknown): asserts bundle is ExportBundle {
    if (!bundle || typeof bundle !== 'object') {
      throw new ImportValidationError('structure racine invalide');
    }
    const b = bundle as Record<string, unknown>;
    if (b['version'] !== 1) {
      throw new ImportValidationError(`version ${b['version']} non supportée`);
    }
    if (!b['stores'] || typeof b['stores'] !== 'object') {
      throw new ImportValidationError('champ stores manquant');
    }
  }

  private hasId(entity: unknown): entity is { id: string } {
    return (
      typeof entity === 'object' &&
      entity !== null &&
      'id' in entity &&
      typeof (entity as Record<string, unknown>)['id'] === 'string'
    );
  }
}
