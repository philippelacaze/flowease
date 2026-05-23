# /new-port

Génère un nouveau port IA (interface) dans domain/repositories/ai/
et met à jour NullAIAdapter en conséquence.

## Usage
/new-port <nom-du-port> <description>

Exemple :
/new-port nutrition-check "Vérifie la compatibilité SIBO d'un aliment"

## Ce que cette commande génère / modifie

1. `domain/repositories/ai/nom-du-port.port.ts` — nouveau port
2. Mise à jour de `application/tokens.ts` — nouveau InjectionToken
3. Mise à jour de `infrastructure/ai/null/null-ai.adapter.ts` — méthode null
4. Mise à jour de `infrastructure/ai/anthropic/anthropic.adapter.ts` — méthode réelle
5. Nouveau fichier `infrastructure/ai/anthropic/prompts/nom.prompt.ts`

---

## Template port

```typescript
// domain/repositories/ai/nom-du-port.port.ts

/**
 * Port <description fonctionnelle>.
 *
 * @remarks
 * Interface Segregation Principle : ce port est dédié uniquement à <responsabilité>.
 * Dependency Inversion : les use cases dépendent de cette interface,
 * jamais de l'implémentation Anthropic concrète.
 *
 * @example
 * // Production
 * providers: [{ provide: NOM_PORT, useClass: AnthropicAdapter }]
 * // Test / sans IA
 * providers: [{ provide: NOM_PORT, useClass: NullAIAdapter }]
 */
export interface NomDuPort {
  /**
   * <Description de la méthode>.
   *
   * @param input - <Description>
   * @returns <Résultat>, ou null si l'IA est indisponible
   */
  nomMethode(input: TypeInput): Promise<TypeOutput | null>;
}
```

## Vérifications après génération

- [ ] Le port est dans domain/ (zéro import externe)
- [ ] Le token est ajouté dans application/tokens.ts
- [ ] NullAIAdapter retourne null pour la nouvelle méthode
- [ ] AnthropicAdapter implémente la nouvelle méthode avec try/catch
- [ ] Le prompt est externalisé dans prompts/nom.prompt.ts
- [ ] app.config.ts : ajouter le binding du nouveau token si nécessaire
