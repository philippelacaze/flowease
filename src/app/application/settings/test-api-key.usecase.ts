import { Injectable, inject } from '@angular/core';
import type { ApiKeyTestPort } from '../../domain/repositories/ai/api-key-test.port';
import { API_KEY_TEST_PORT } from '../tokens';

/** Résultat d'un test de clé API. */
export interface TestApiKeyResult {
  readonly ok: boolean;
  readonly errorMessage?: string;
}

/**
 * Teste qu'une clé API Anthropic peut atteindre le service.
 *
 * @remarks
 * Respecte SRP : test de connectivité uniquement — ne sauvegarde pas la clé.
 * Délègue le vrai appel réseau à ApiKeyTestPort (AnthropicAdapter en prod).
 * Retourne toujours un résultat structuré — jamais throw.
 */
@Injectable({ providedIn: 'root' })
export class TestApiKeyUseCase {
  private readonly port = inject<ApiKeyTestPort>(API_KEY_TEST_PORT as never);

  /**
   * Effectue un appel minimal pour vérifier la clé.
   *
   * @param apiKey - Clé à tester — jamais loguée
   * @returns `{ ok: true }` si valide, `{ ok: false, errorMessage }` sinon
   */
  async execute(apiKey: string): Promise<TestApiKeyResult> {
    if (!apiKey.trim()) {
      return { ok: false, errorMessage: 'Clé vide' };
    }
    const error = await this.port.testApiKey(apiKey.trim());
    return error === null ? { ok: true } : { ok: false, errorMessage: error };
  }
}
