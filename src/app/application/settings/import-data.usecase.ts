import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';
import type { ExportBundle } from './export-data.usecase';

const VALID_STORES = new Set([
  'meals',
  'symptoms',
  'intakes',
  'notes',
  'treatments',
  'cures',
  'insights',
  'reports',
  'coach-sessions',
  'symptom-config',
  'user-profile',
]);

/** Erreur levée si le JSON d'import est invalide ou incompatible. */
export class ImportValidationError extends Error {
  constructor(reason: string) {
    super(`Import invalide : ${reason}`);
    this.name = 'ImportValidationError';
  }
}

/**
 * Importe un bundle JSON dans tous les stores IndexedDB.
 *
 * @remarks
 * Respecte SRP : validation + écriture uniquement.
 * Efface les données existantes avant l'import pour garantir la cohérence.
 * Lève ImportValidationError si la structure JSON est invalide — jamais
 * de corruption silencieuse.
 * La clé API (localStorage) n'est pas touchée par l'import.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ImportDataUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);

  /**
   * Valide, efface et réimporte toutes les données depuis le JSON.
   *
   * @param json - Contenu JSON exporté par ExportDataUseCase
   * @throws ImportValidationError si le JSON est invalide ou de version incompatible
   */
  async execute(json: string): Promise<void> {
    const bundle = this.parse(json);
    this.validate(bundle);

    await Promise.all(
      Object.keys(bundle.stores).map(store => this.storage.clear(store)),
    );

    for (const [store, entities] of Object.entries(bundle.stores)) {
      if (!VALID_STORES.has(store)) continue;
      for (const entity of entities) {
        if (this.hasId(entity)) {
          await this.storage.save(store, entity);
        }
      }
    }
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
