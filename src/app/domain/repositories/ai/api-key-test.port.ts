/**
 * Port de test de connectivité pour une clé API IA.
 *
 * @remarks
 * Respecte ISP : responsabilité unique — tester qu'une clé peut atteindre le service.
 * Implémenté par AnthropicAdapter (appel réseau réel) et NullAIAdapter (Null Object).
 * Utilisé par TestApiKeyUseCase depuis la page de configuration de la clé.
 */
export interface ApiKeyTestPort {
  /**
   * Vérifie qu'une clé API peut atteindre le service IA.
   *
   * @param apiKey - Clé à tester — jamais loguée, jamais dans le message d'erreur
   * @returns null si la clé est valide, message d'erreur lisible sinon
   */
  testApiKey(apiKey: string): Promise<string | null>;
}
