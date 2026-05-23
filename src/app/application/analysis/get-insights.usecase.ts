import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { StoredAnalysisResult } from './run-ai-analysis.usecase';
import { STORAGE_PORT } from '../tokens';

/**
 * Récupère les résultats d'analyse IA persistés dans le store IndexedDB 'insights'.
 *
 * @remarks
 * Respecte SRP : lecture seule sans déclenchement d'appel réseau.
 * Fonctionne hors-ligne — les résultats sont lus depuis IndexedDB, jamais rechargés
 * depuis l'API Anthropic. Retourne [] si aucune analyse n'a encore été effectuée.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetInsightsUseCase {
  private readonly storage = inject<StorageRepository<StoredAnalysisResult>>(STORAGE_PORT as never);

  /**
   * Retourne les résultats d'analyse triés du plus récent au plus ancien.
   *
   * @param limit - Nombre maximum de résultats à retourner (défaut : 10)
   * @returns Tableau de StoredAnalysisResult trié par date décroissante
   */
  async execute(limit = 10): Promise<StoredAnalysisResult[]> {
    const all = await this.storage.getAll('insights') as StoredAnalysisResult[];
    return all
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
      .slice(0, limit);
  }
}
