# Plan de refactoring architectural — FlowEase

**Objectif :** Passer de Clean Architecture / DDD 4 couches vers Angular Style Guide standard.
**Branche :** `refactor/angular-style`
**Règle :** `npm test` vert obligatoire à la fin de chaque session avant de continuer.

---

## Résumé des sessions

| Session | Sujet | Durée est. | Statut |
|---------|-------|-----------|--------|
| S-R01 | Consolidation AI — AiService + NullAiService | ~2h | ✅ Fait |
| S-R02 | Simplification Storage — StorageService + LocalSettingsService | ~2h | ✅ Fait |
| S-R03 | Use cases Journal → MealService + SymptomService + NoteService + IntakeService | ~2h | ✅ Fait |
| S-R04 | Use cases Coach → CoachService | ~1h | ✅ Fait |
| S-R05 | Use cases Analysis + Report → AnalysisService + ReportService | ~1h | ✅ Fait |
| S-R06 | Use cases Settings → SettingsService | ~1h | ✅ Fait |
| S-R07 | Réorganisation dossiers — domain/ + application/ + infrastructure/ supprimés | ~1h | ✅ Fait |
| S-R08 | Nettoyage final — app.config, CLAUDE.md, vérification globale | ~1h | ✅ Fait |

---

## S-R01 — Consolidation AI

**Objectif :** Fusionner les 6 ports AI et leur unique adapter en un `AiService` injectable standard.
**Statut :** ✅ Fait — 572/572 tests verts

### Contexte
6 interfaces de ports (`AnalysisPort`, `CoachPort`, `MealAnalysisPort`, `NoteTaggingPort`, `ReportPort`, `ApiKeyTestPort`) sont toutes implémentées par un seul fichier `AnthropicAdapter`. C'est 6 abstractions sans valeur.

### Fichiers à créer
- `src/app/core/services/ai.service.ts` (contenu de `AnthropicAdapter` renommé)
- `src/app/core/services/null-ai.service.ts` (contenu de `NullAIAdapter` renommé)

### Fichiers à modifier
- `src/app/app.config.ts` — supprimer les 6 providers de tokens AI, enregistrer `AiService`
- `src/app/application/tokens.ts` — supprimer les 6 tokens AI
- `src/app/application/analysis/run-ai-analysis.usecase.ts` — `@Inject(ANALYSIS_PORT)` → `inject(AiService)`
- `src/app/application/analysis/get-insights.usecase.ts` — idem
- `src/app/application/journal/analyze-meal-photo.usecase.ts` — `@Inject(MEAL_ANALYSIS_PORT)` → `inject(AiService)`
- `src/app/application/journal/extract-meal-from-text.usecase.ts` — idem
- `src/app/application/journal/tag-note.usecase.ts` — `@Inject(NOTE_TAGGING_PORT)` → `inject(AiService)`
- `src/app/application/journal/confirm-note-tags.usecase.ts` — idem
- `src/app/application/coach/send-coach-message.usecase.ts` — `@Inject(COACH_PORT)` → `inject(AiService)`
- `src/app/application/coach/summarize-coach-session.usecase.ts` — idem
- `src/app/application/report/generate-report-summary.usecase.ts` — `@Inject(REPORT_PORT)` → `inject(AiService)`
- `src/app/application/settings/test-api-key.usecase.ts` — `@Inject(API_KEY_TEST_PORT)` → `inject(AiService)`
- `src/app/presentation/features/coach/coach-chat/coach-chat.component.ts` — si injection directe du port
- Tous les fichiers `.spec.ts` qui injectent `NullAIAdapter` → `NullAiService`

### Fichiers à supprimer
- `src/app/domain/repositories/ai/analysis.port.ts`
- `src/app/domain/repositories/ai/api-key-test.port.ts`
- `src/app/domain/repositories/ai/coach.port.ts`
- `src/app/domain/repositories/ai/meal-analysis.port.ts`
- `src/app/domain/repositories/ai/note-tagging.port.ts`
- `src/app/domain/repositories/ai/report.port.ts`
- `src/app/infrastructure/ai/anthropic/anthropic.adapter.ts` (remplacé par AiService)
- `src/app/infrastructure/ai/null/null-ai.adapter.ts` (remplacé par NullAiService)

### Étapes
1. Créer `core/services/ai.service.ts` — copier le contenu de `AnthropicAdapter`, changer le nom de classe, retirer les `implements` des ports supprimés, garder `@Injectable({ providedIn: 'root' })`
2. Créer `core/services/null-ai.service.ts` — copier `NullAIAdapter`, changer le nom, retirer les `implements`
3. Mettre à jour `app.config.ts` — retirer les 6 `{ provide: TOKEN, useExisting: AnthropicAdapter }`, ajouter `AiService` si besoin (il est `providedIn: root` donc probablement rien à faire)
4. Supprimer les 6 tokens dans `tokens.ts`
5. Mettre à jour les use cases un par un (chercher `ANALYSIS_PORT`, `COACH_PORT`, etc.)
6. Mettre à jour les tests qui utilisent `NullAIAdapter` → `NullAiService`
7. Supprimer les 6 fichiers de ports et les 2 anciens adapters
8. `npm test` → vert

### Validation
- [ ] `npm test` vert
- [ ] Aucun import vers `domain/repositories/ai/` ne subsiste
- [ ] Aucun import vers `infrastructure/ai/anthropic/anthropic.adapter` ne subsiste
- [ ] Aucun import vers `infrastructure/ai/null/null-ai.adapter` ne subsiste

---

## S-R02 — Simplification Storage

**Objectif :** Supprimer `STORAGE_PORT`, `LOCAL_SETTINGS_PORT` et les interfaces de repositories vides.
**Statut :** ⬜ À faire

### Contexte
`STORAGE_PORT` et `LOCAL_SETTINGS_PORT` ont chacun une seule implémentation. Les 5 interfaces de repositories (`IntakeRepository`, `MealRepository`, etc.) n'ajoutent rien à `StorageRepository<T>` — elles ne définissent pas de méthodes supplémentaires. `LocalSettingsAdapter` n'est pas `@Injectable`, c'est un singleton manuel dans `app.config.ts` — à normaliser.

### Fichiers à créer
- `src/app/core/services/storage.service.ts` (contenu de `IndexedDBAdapter` renommé)
- `src/app/core/services/local-settings.service.ts` (contenu de `LocalSettingsAdapter` renommé, avec `@Injectable`)

### Fichiers à modifier
- `src/app/app.config.ts` — supprimer les providers de tokens storage, garder `APP_INITIALIZER`, retirer la création manuelle de `LocalSettingsAdapter`
- `src/app/application/tokens.ts` — supprimer `STORAGE_PORT` et `LOCAL_SETTINGS_PORT` (fichier devrait être vide → supprimer)
- Tous les use cases avec `@Inject(STORAGE_PORT)` → `inject(StorageService)`
- Tous les use cases avec `@Inject(LOCAL_SETTINGS_PORT)` → `inject(LocalSettingsService)`
- `src/app/presentation/core/theme.service.ts` — si injection de `LOCAL_SETTINGS_PORT`
- `src/app/presentation/features/settings/api-key/` — injection directe de `LocalSettingsAdapter` → `LocalSettingsService`
- Tous les `.spec.ts` qui mockent `IndexedDBAdapter` ou `LocalSettingsAdapter`

### Fichiers à supprimer
- `src/app/domain/repositories/storage.repository.ts`
- `src/app/domain/repositories/intake.repository.ts`
- `src/app/domain/repositories/meal.repository.ts`
- `src/app/domain/repositories/note.repository.ts`
- `src/app/domain/repositories/symptom.repository.ts`
- `src/app/domain/repositories/treatment.repository.ts`
- `src/app/domain/repositories/local-settings.repository.ts`
- `src/app/domain/repositories/notification.port.ts` (si `NotificationService` devient service direct)
- `src/app/infrastructure/storage/indexeddb.adapter.ts` (remplacé par StorageService)
- `src/app/infrastructure/storage/local-settings.adapter.ts` (remplacé par LocalSettingsService)
- `src/app/application/tokens.ts` (vide après suppression des tokens)

### Étapes
1. Créer `core/services/storage.service.ts` — copier `IndexedDBAdapter`, renommer la classe, garder `APP_INITIALIZER` compatible
2. Créer `core/services/local-settings.service.ts` — copier `LocalSettingsAdapter`, ajouter `@Injectable({ providedIn: 'root' })`
3. Mettre à jour `app.config.ts`
4. Chercher/remplacer `@Inject(STORAGE_PORT)` dans tous les use cases → `inject(StorageService)`
5. Chercher/remplacer `@Inject(LOCAL_SETTINGS_PORT)` → `inject(LocalSettingsService)`
6. Gérer `NotificationService` : retirer l'interface `NotificationPort` si elle n'apporte rien, injecter directement `NotificationService`
7. Supprimer les fichiers listés
8. `npm test` → vert

### Validation
- [ ] `npm test` vert
- [ ] `application/tokens.ts` supprimé
- [ ] Aucun `@Inject(` ne subsiste dans le code (tous remplacés par `inject()`)
- [ ] Aucun import vers `domain/repositories/` ne subsiste
- [ ] `app.config.ts` ne contient plus de création manuelle de singleton

---

## S-R03 — Use cases Journal → Services de feature

**Objectif :** Remplacer 16 use cases journal par 4 services cohésifs.
**Statut :** ⬜ À faire

### Contexte
Les composants journal injectent jusqu'à 5 use cases séparés. Ces use cases partagent tous les mêmes dépendances (`StorageService`, `AiService`). Les regrouper simplifie les composants et réduit le boilerplate.

### Regroupements

| Use cases fusionnés | Nouveau service | Emplacement |
|---------------------|----------------|-------------|
| AddMealUseCase, EditMealUseCase, AnalyzeMealPhotoUseCase, ExtractMealFromTextUseCase, GetFrequentFoodsUseCase | `MealService` | `features/journal/services/meal.service.ts` |
| AddSymptomUseCase, EditSymptomUseCase, GetActiveSymptomsUseCase, GetSymptomTrendsUseCase, SaveWellbeingScoreUseCase | `SymptomService` | `features/journal/services/symptom.service.ts` |
| AddNoteUseCase, EditNoteUseCase, TagNoteUseCase, ConfirmNoteTagsUseCase | `NoteService` | `features/journal/services/note.service.ts` |
| ConfirmIntakeUseCase, EditIntakeUseCase, GetJournalDayUseCase, GetJournalSuggestionsUseCase, GetActiveCuresUseCase, GetActiveSymptomUseCase | `IntakeService` | `features/journal/services/intake.service.ts` |

### Fichiers à créer
- `src/app/features/journal/services/meal.service.ts`
- `src/app/features/journal/services/symptom.service.ts`
- `src/app/features/journal/services/note.service.ts`
- `src/app/features/journal/services/intake.service.ts`
- `src/app/features/journal/services/meal.service.spec.ts`
- `src/app/features/journal/services/symptom.service.spec.ts`
- `src/app/features/journal/services/note.service.spec.ts`
- `src/app/features/journal/services/intake.service.spec.ts`

> **Note sur les chemins :** les composants sont actuellement dans `presentation/features/journal/`. La session S-R07 déplacera `presentation/features/` → `features/`. Pour l'instant, créer les services dans `presentation/features/journal/services/` pour ne pas casser les imports des composants.

### Fichiers à modifier
- `src/app/presentation/features/journal/meal-entry/meal-entry.component.ts` — `AddMealUseCase, EditMealUseCase, AnalyzeMealPhotoUseCase, ...` → `MealService`
- `src/app/presentation/features/journal/symptom-entry/symptom-entry.component.ts` — → `SymptomService`
- `src/app/presentation/features/journal/note-entry/note-entry.component.ts` — → `NoteService`
- `src/app/presentation/features/journal/intake-entry/intake-entry.component.ts` — → `IntakeService`
- `src/app/presentation/features/journal/journal-home/journal-home.component.ts` — → `IntakeService`
- `src/app/presentation/features/journal/cure-progress/cure-progress.component.ts` — → `IntakeService`
- `src/app/presentation/features/journal/intake-entry/intake-detail-sheet.component.ts` — → `IntakeService`
- Tous les `.spec.ts` des composants ci-dessus

### Fichiers à supprimer (use cases journal)
Dossier `src/app/application/journal/` entier :
- add-meal.usecase.ts + spec
- add-note.usecase.ts + spec
- add-symptom.usecase.ts + spec
- analyze-meal-photo.usecase.ts + spec
- confirm-intake.usecase.ts + spec
- confirm-note-tags.usecase.ts + spec
- edit-intake.usecase.ts + spec
- edit-meal.usecase.ts + spec
- edit-note.usecase.ts + spec
- edit-symptom.usecase.ts + spec
- extract-meal-from-text.usecase.ts + spec
- get-active-cures.usecase.ts + spec
- get-active-symptoms.usecase.ts + spec
- get-frequent-foods.usecase.ts
- get-journal-day.usecase.ts + spec
- get-journal-suggestions.usecase.ts + spec
- get-active-treatments.usecase.ts
- get-all-treatments.usecase.ts
- save-wellbeing-score.usecase.ts + spec
- tag-note.usecase.ts

### Étapes
1. Créer `MealService` — agréger la logique des 5 use cases, exposer `add()`, `edit()`, `analyzePhoto()`, `extractFromText()`, `getFrequent()`
2. Créer `SymptomService` — agréger la logique des 5 use cases
3. Créer `NoteService` — agréger la logique des 4 use cases
4. Créer `IntakeService` — agréger la logique des 6 use cases
5. Mettre à jour les composants un par un
6. Écrire les tests des 4 services (consolider les tests des use cases)
7. Supprimer les use cases et leurs specs
8. `npm test` → vert

### Validation
- [ ] `npm test` vert
- [ ] Dossier `application/journal/` supprimé
- [ ] Les composants journal n'injectent plus de use cases

---

## S-R04 — Use cases Coach → CoachService

**Objectif :** Remplacer 5 use cases coach par un seul `CoachService`.
**Statut :** ⬜ À faire

### Use cases fusionnés
| Use case | Méthode dans CoachService |
|----------|--------------------------|
| StartCoachSessionUseCase | `startSession()` |
| SendCoachMessageUseCase | `sendMessage()` — AsyncGenerator conservé |
| SummarizeCoachSessionUseCase | `summarizeSession()` |
| BuildCoachContextUseCase | `buildContext()` |
| GetCoachHistoryUseCase | `getHistory()` |

### Fichiers à créer
- `src/app/presentation/features/coach/services/coach.service.ts`
- `src/app/presentation/features/coach/services/coach.service.spec.ts`

### Fichiers à modifier
- `src/app/presentation/features/coach/coach-chat/coach-chat.component.ts`
- `src/app/presentation/features/coach/coach-history/coach-history.component.ts`
- Specs des composants coach
- `src/app/presentation/core/guards/api-key.guard.ts` — si injection d'un use case

### Fichiers à supprimer
Dossier `src/app/application/coach/` entier :
- build-coach-context.usecase.ts + spec
- coach-session.types.ts (déplacer dans `CoachService` ou `core/models/`)
- get-coach-history.usecase.ts
- send-coach-message.usecase.ts + spec
- start-coach-session.usecase.ts
- summarize-coach-session.usecase.ts

### Étapes
1. Créer `CoachService` avec les 5 méthodes
2. Veiller à conserver le pattern `AsyncGenerator` de `sendMessage()` tel quel
3. Déplacer `coach-session.types.ts` dans les models ou dans le service
4. Mettre à jour les composants coach
5. Écrire les tests
6. Supprimer les use cases
7. `npm test` → vert

### Validation
- [x] `npm test` vert — 475/475
- [x] Dossier `application/coach/` supprimé (seul `.gitkeep` reste)
- [x] Le streaming `AsyncGenerator` fonctionne toujours

---

## S-R05 — Use cases Analysis + Report → Services

**Objectif :** Remplacer 6 use cases par `AnalysisService` et `ReportService`.
**Statut :** ⬜ À faire

### Use cases fusionnés

**AnalysisService** (`features/analysis/services/analysis.service.ts`) :
| Use case | Méthode |
|----------|---------|
| RunAiAnalysisUseCase | `run()` |
| GetInsightsUseCase | `getInsights()` |
| GetSymptomTrendsUseCase | `getSymptomTrends()` |
| GetAdherenceStatsUseCase | `getAdherenceStats()` |

**ReportService** (`features/report/services/report.service.ts`) :
| Use case | Méthode |
|----------|---------|
| BuildReportUseCase | `build()` |
| GenerateReportSummaryUseCase | `generateSummary()` |

### Fichiers à créer
- `src/app/presentation/features/analysis/services/analysis.service.ts`
- `src/app/presentation/features/analysis/services/analysis.service.spec.ts`
- `src/app/presentation/features/report/services/report.service.ts`
- `src/app/presentation/features/report/services/report.service.spec.ts`

### Fichiers à modifier
- `src/app/presentation/features/analysis/analysis-home/analysis-home.component.ts`
- `src/app/presentation/features/analysis/ai-insights/ai-insights.component.ts`
- `src/app/presentation/features/analysis/adherence-calendar/adherence-calendar.component.ts`
- `src/app/presentation/features/report/report-builder/report-builder.component.ts`
- Specs des composants ci-dessus

### Fichiers à supprimer
- `src/app/application/analysis/` — dossier entier (4 use cases + specs)
- `src/app/application/report/` — dossier entier (2 use cases + specs)

### Étapes
1. Créer `AnalysisService`
2. Créer `ReportService`
3. Mettre à jour les composants analysis et report
4. Écrire les tests
5. Supprimer les use cases
6. `npm test` → vert

### Validation
- [x] `npm test` vert — 486/486
- [x] Dossiers `application/analysis/` et `application/report/` supprimés (`.gitkeep` restants)

---

## S-R06 — Use cases Settings → SettingsService

**Objectif :** Remplacer 7 use cases settings par un `SettingsService`.
**Statut :** ⬜ À faire

### Use cases fusionnés
| Use case | Méthode dans SettingsService |
|----------|------------------------------|
| SaveUserProfileUseCase | `saveProfile()` |
| GetCuresUseCase | `getCures()` |
| CreateCureUseCase | `createCure()` |
| ScheduleAllRemindersUseCase | `scheduleReminders()` |
| ExportDataUseCase | `exportData()` |
| ImportDataUseCase | `importData()` |
| TestApiKeyUseCase | `testApiKey()` |

### Fichiers à créer
- `src/app/presentation/features/settings/services/settings.service.ts`
- `src/app/presentation/features/settings/services/settings.service.spec.ts`

### Fichiers à modifier
- `src/app/presentation/features/settings/settings-home/settings-home.component.ts`
- `src/app/presentation/features/settings/profile/profile.component.ts`
- `src/app/presentation/features/settings/treatments/treatments.component.ts`
- `src/app/presentation/features/settings/api-key/api-key.component.ts`
- `src/app/presentation/features/settings/data-privacy/data-privacy.component.ts`
- Specs des composants settings

### Fichiers à supprimer
- `src/app/application/settings/` — dossier entier (7 use cases + specs)

### Étapes
1. Créer `SettingsService`
2. Mettre à jour les composants settings
3. Écrire les tests (consolider les tests existants d'import-data et schedule-all-reminders)
4. Supprimer les use cases
5. `npm test` → vert

### Validation
- [x] `npm test` vert — 493/493
- [x] Dossier `application/settings/` supprimé (`.gitkeep` restant)
- [x] `application/` ne contient plus que des `.gitkeep` → prêt pour S-R07

---

## S-R07 — Réorganisation des dossiers

**Objectif :** Supprimer `domain/`, `application/`, `infrastructure/`, `presentation/`. Adopter la structure `core/` + `features/` + `shared/`.
**Statut :** ⬜ À faire

### Structure finale

```
src/app/
├── core/
│   ├── models/
│   │   ├── entities/        ← ancien domain/entities/
│   │   └── value-objects/   ← ancien domain/value-objects/
│   ├── services/
│   │   ├── ai.service.ts            (créé en S-R01)
│   │   ├── null-ai.service.ts       (créé en S-R01)
│   │   ├── storage.service.ts       (créé en S-R02)
│   │   ├── local-settings.service.ts (créé en S-R02)
│   │   ├── notification.service.ts  (déplacé depuis infrastructure/)
│   │   ├── pdf-report.service.ts    (déplacé depuis infrastructure/)
│   │   └── error-notification.service.ts (déplacé depuis core/ actuel)
│   └── guards/
│       └── api-key.guard.ts         (déplacé depuis presentation/core/guards/)
│
├── features/                ← ancien presentation/features/ (déplacement à plat)
│   ├── journal/
│   ├── coach/
│   ├── analysis/
│   ├── report/
│   └── settings/
│
└── shared/                  ← ancien presentation/shared/ (déplacement à plat)
    ├── components/
    └── pipes/
```

### Actions
1. Déplacer `domain/entities/` → `core/models/entities/`
2. Déplacer `domain/value-objects/` → `core/models/value-objects/`
3. Déplacer `infrastructure/notification/notification.service.ts` → `core/services/`
4. Déplacer `infrastructure/pdf/pdf-report.service.ts` → `core/services/`
5. Déplacer `infrastructure/storage/indexeddb.schema.ts` → `core/services/` (ou intégrer dans `StorageService`)
6. Déplacer `presentation/features/` → `features/`
7. Déplacer `presentation/shared/` → `shared/`
8. Déplacer `presentation/layout/` → `shared/layout/` ou `core/layout/`
9. Déplacer `presentation/core/guards/` → `core/guards/`
10. Déplacer `core/error-notification.service.ts` → `core/services/`
11. Mettre à jour **tous** les imports impactés (chercher/remplacer par lot)
12. Supprimer les dossiers vides `domain/`, `application/`, `infrastructure/`, `presentation/`
13. `npm test` → vert

> **Stratégie imports :** Faire le déplacement dossier par dossier et mettre à jour les imports immédiatement après chaque déplacement. Ne pas tout déplacer d'un coup.

### Validation
- [x] `npm test` vert — 493/493
- [x] Dossiers `domain/`, `application/`, `infrastructure/`, `presentation/` n'existent plus
- [x] `src/app/` contient `core/`, `features/`, `shared/`, `app.ts`, `app.config.ts`, `app.routes.ts`

---

## S-R08 — Nettoyage final

**Objectif :** Nettoyer `app.config.ts`, mettre à jour `CLAUDE.md`, vérification globale.
**Statut :** ⬜ À faire

### Checklist complète

**app.config.ts :**
- [ ] Ne contient plus aucun `InjectionToken`
- [ ] Ne contient plus aucun `provide: TOKEN, useExisting: Adapter`
- [ ] Contient uniquement le `APP_INITIALIZER` pour IndexedDB et les providers Angular standard (HttpClient, Router)

**Imports résiduels :**
- [ ] Aucun fichier n'importe depuis `domain/`
- [ ] Aucun fichier n'importe depuis `application/`
- [ ] Aucun fichier n'importe depuis `infrastructure/`
- [ ] Aucun fichier n'importe depuis `presentation/`
- [ ] Grep global sur `from '.*domain/'` → 0 résultat
- [ ] Grep global sur `from '.*application/'` → 0 résultat

**Tests :**
- [ ] `npm test` vert, aucun test skippé
- [ ] Aucun test n'utilise `AnthropicAdapter` ou `NullAIAdapter` (noms d'avant refacto)
- [ ] Aucun test n'utilise `IndexedDBAdapter` ou `LocalSettingsAdapter` (noms d'avant refacto)

**CLAUDE.md :**
- [ ] Mettre à jour la section « Architecture — 4 couches strictes » → nouvelle structure `core/` + `features/` + `shared/`
- [ ] Mettre à jour les règles par couche
- [ ] Mettre à jour « Avant de créer un fichier »
- [ ] Supprimer la référence à `NullAIAdapter` → `NullAiService`

**Métriques finales à vérifier :**
- [ ] 0 `InjectionToken` dans le code
- [ ] 0 use case (dossier `application/` inexistant)
- [ ] 0 fichier de port/repository dans `domain/`
- [ ] `npm test` vert sur tous les tests

---

## Récapitulatif des gains attendus

| Métrique | Avant | Après |
|----------|-------|-------|
| InjectionTokens | 9 | 0 |
| Use cases (fichiers) | 38 | 0 |
| Interfaces port/repository | 15 | 0 |
| Services injectables | ~12 | ~10 |
| Dossiers racine dans `src/app/` | 6 | 3 |
| Fichiers TypeScript (estimation) | ~200 | ~145 |
