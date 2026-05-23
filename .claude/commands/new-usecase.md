# /new-usecase

Génère un use case complet dans la couche Application à partir d'une description.

## Usage
/new-usecase <nom-du-use-case> <description-courte>

Exemple :
/new-usecase get-recurring-meals "Retourne les 20 aliments les plus fréquents de l'historique"

## Ce que cette commande génère

1. `application/<module>/nom-du-use-case.usecase.ts`
2. `application/<module>/nom-du-use-case.usecase.spec.ts`

---

## Template use case

```typescript
import { Injectable, Inject } from '@angular/core';
// Importer le port et le token nécessaires

/**
 * Use case : <description courte>.
 *
 * @remarks
 * Single Responsibility : <expliquer l'unique responsabilité>.
 * Dependency Inversion : dépend de <NomPort> (interface Domain),
 * jamais de l'implémentation concrète.
 *
 * Mode dégradé : retourne <état vide> si le port retourne null.
 */
@Injectable({ providedIn: 'root' })
export class NomDuUseCaseUseCase {

  constructor(
    @Inject(NOM_PORT_TOKEN) private readonly port: NomPort
  ) {}

  /**
   * <Description de ce que fait execute()>.
   *
   * @param input - <Description de l'entrée>
   * @returns <Description du résultat>, ou <état vide> si IA indisponible
   * @throws {StorageError} Si la persistance échoue
   */
  async execute(input: TypeInput): Promise<TypeOutput> {
    // Logique métier
    const result = await this.port.method(input);
    return result ?? VALEUR_VIDE; // mode dégradé
  }
}
```

## Template spec associé

Générer les 3 blocs describe :
1. `comportement nominal — port disponible` avec mock jasmine.createSpyObj
2. `mode dégradé — NullAIAdapter` avec NullAIAdapter injecté
3. `erreur de stockage` avec mock qui rejette

Règles de nommage it() : comportement attendu en français.

## Vérifications avant de générer

- [ ] Le use case est dans le bon sous-dossier (journal/, analysis/, etc.)
- [ ] Le token d'injection existe dans application/tokens.ts
- [ ] Si nouveau token nécessaire → l'ajouter dans tokens.ts en premier
- [ ] NullAIAdapter implémente le port utilisé
