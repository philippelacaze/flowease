import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

const EXPORT_STORES = [
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
] as const;

/** Objet d'export contenant toutes les données de l'application. */
export interface ExportBundle {
  readonly version: 1;
  readonly exportedAt: string;
  readonly stores: Record<string, unknown[]>;
}

/**
 * Exporte toutes les données de l'application en JSON sérialisé.
 *
 * @remarks
 * Respecte SRP : lecture et sérialisation uniquement — le déclenchement
 * du téléchargement est délégué à la couche présentation.
 * Fonctionne hors-ligne — lit uniquement depuis IndexedDB.
 * La clé API n'est jamais incluse dans l'export.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ExportDataUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);

  /**
   * Lit tous les stores et retourne le JSON d'export.
   *
   * @returns JSON formaté contenant toutes les données
   */
  async execute(): Promise<string> {
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
}
