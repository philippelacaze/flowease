# FlowEase — Règles Claude Code

## Environnement
- OS : Windows 11 natif PowerShell
- Shell : PowerShell 7
- Node : V24.13.1
- Package manager : npm

## Architecture — Angular Style Guide

```
src/app/
├── core/
│   ├── models/entities/     → interfaces TypeScript readonly (entités métier)
│   ├── models/value-objects/ → value objects purs (Bristol, FODMAP, etc.)
│   ├── services/            → services injectables transversaux
│   │   ├── ai.service.ts              → appels IA (Anthropic)
│   │   ├── null-ai.service.ts         → fallback IA (tests + sans clé)
│   │   ├── storage.service.ts         → IndexedDB (CRUD générique)
│   │   ├── local-settings.service.ts  → localStorage (préférences + rappels annulés)
│   │   ├── pdf-report.service.ts      → export PDF
│   │   ├── theme.service.ts           → thème CSS
│   │   └── error-notification.service.ts → bannière d'erreur globale
│   └── guards/
│       └── api-key.guard.ts           → protection route Coach
├── features/
│   ├── journal/             → MealService, SymptomService, NoteService, IntakeService
│   ├── coach/               → CoachService
│   ├── analysis/            → AnalysisService
│   ├── report/              → ReportService
│   └── settings/            → SettingsService
└── shared/
    ├── components/          → composants réutilisables
    ├── pipes/               → pipes Angular
    └── layout/              → Shell, BottomNav, SideNav
```

## Règles non négociables

### core/models/
- Zéro import Angular (@Injectable, HttpClient, etc.)
- Zéro import de librairie externe (idb, jsPDF, etc.)
- Uniquement des interfaces TypeScript readonly et des fonctions pures

### core/services/
- @Injectable({ providedIn: 'root' }) sur chaque service
- inject() pour toutes les dépendances — jamais de constructeur avec @Inject(TOKEN)
- Retourner un état vide si un service IA retourne null — jamais throw
- La clé API est lue via LocalSettingsService.getApiKey() à chaque appel HTTP
- Jamais logger la clé API (même en dev, même dans les erreurs)

### features/
- Chaque feature expose un service cohésif (MealService, CoachService, etc.)
- Les composants injectent le service de leur feature ou les services de core/
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
const result = await this.ai.method();
return result ?? VALEUR_VIDE; // jamais throw
```

## NullAiService
- Toujours disponible dans core/services/null-ai.service.ts
- Utilisé dans les tests ET quand aucune clé API n'est configurée
- Toute nouvelle méthode ajoutée à AiService doit être ajoutée à NullAiService

## Tests — règle absolue
Toute modification de code (nouvelle feature, bug fix, refacto) entraîne obligatoirement
la création ou la mise à jour des tests unitaires correspondants, **sans qu'il soit nécessaire
de le demander explicitement**. Vérifier `npm test` vert avant de déclarer la tâche terminée.

- Vitest (Angular 21 natif) pour unitaires et composants
- fake-indexeddb pour les tests StorageService
- NullAiService injecté dans les tests qui ne testent pas l'IA
- it() nommé en comportement attendu, jamais en nom de méthode

## Avant de créer un fichier
Vérifier la cible :
- core/models/ → interface ou type pur uniquement (zéro import externe)
- core/services/ → service injectable transversal (@Injectable providedIn root)
- features/X/services/ → service de feature cohésif
- features/X/Y/ → composant Angular standalone
- shared/components/ → composant réutilisable sans logique métier
