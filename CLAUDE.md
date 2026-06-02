# FlowEase — Règles Claude Code

## Environnement
- OS : Windows 11 natif PowerShell
- Shell : PowerShell 7
- Node : V24.13.1
- Package manager : npm
 
## Architecture — 4 couches strictes
```
domain/         → interfaces et types purs — ZÉRO import externe
application/    → use cases — importe uniquement depuis domain/
infrastructure/ → adapters — implémente les interfaces de domain/
presentation/   → Angular — importe uniquement depuis application/
```

La règle de dépendance ne va jamais dans l'autre sens.

## Règles non négociables

### Couche domain/
- Zéro import Angular (@Injectable, HttpClient, etc.)
- Zéro import de librairie externe (idb, jsPDF, etc.)
- Uniquement des interfaces TypeScript readonly et des fonctions pures

### Couche application/
- @Injectable({ providedIn: 'root' }) sur chaque use case
- @Inject(TOKEN) pour chaque port injecté — jamais la classe concrète
- Retourner un état vide si un port IA retourne null — jamais throw
- Un use case = une seule responsabilité

### Couche infrastructure/
- Chaque adapter implémente une interface de domain/repositories/
- La clé API est lue via LocalSettingsAdapter.getApiKey() à chaque appel
- Jamais logger la clé API (même en dev, même dans les erreurs)
- Retourner null en cas d'erreur réseau — jamais propager vers le composant

### Couche presentation/
- Importer uniquement les use cases de application/
- Jamais importer un adapter de infrastructure/ directement
- data-testid obligatoire sur les éléments testés en E2E
- aria-label obligatoire sur tous les éléments interactifs
- Zones tappables ≥ 44×44px

## JSDoc — obligatoire sur tout public
```typescript
/**
 * Description courte.
 *
 * @remarks
 * Principe SOLID respecté et pourquoi. Usage dans l'architecture.
 *
 * @param nom - Description
 * @returns Description ou null si IA indisponible
 */
```

## Sécurité clé API
- Jamais dans environment.ts ou le code source
- Jamais dans console.log, même en développement
- Jamais dans les messages d'erreur propagés au template
- Toujours lue depuis localStorage au moment de l'appel HTTP

## Mode dégradé IA — pattern obligatoire
```typescript
const result = await this.aiPort.method();
return result ?? VALEUR_VIDE; // jamais throw
```

## NullAIAdapter
- Toujours disponible dans infrastructure/ai/null/
- Utilisé dans les tests ET quand aucune clé API n'est configurée
- Toute nouvelle méthode ajoutée à un port doit être ajoutée à NullAIAdapter

## Tests — règle absolue
Toute modification de code (nouvelle feature, bug fix, refacto) entraîne obligatoirement
la création ou la mise à jour des tests unitaires correspondants, **sans qu'il soit nécessaire
de le demander explicitement**. Vérifier `npm test` vert avant de déclarer la tâche terminée.

- Vitest (Angular 21 natif) pour unitaires et composants
- fake-indexeddb pour les tests IndexedDBAdapter
- NullAIAdapter injecté dans les tests qui ne testent pas l'IA
- it() nommé en comportement attendu, jamais en nom de méthode

## Avant de créer un fichier
Vérifier la couche cible :
- domain/ → interface ou type pur uniquement
- application/ → use case @Injectable + exécute() ou execute()
- infrastructure/ → adapter qui implements une interface de domain/
- presentation/ → composant Angular standalone
