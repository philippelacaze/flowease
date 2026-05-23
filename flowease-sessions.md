# FlowEase — Plan de sessions Claude Code

> WebStorm + Claude Code  
> Principe : une session = une responsabilité unique = consommation tokens maîtrisée  
> Chaque session a un brief autonome — pas besoin de relire les specs complètes

---

## Stratégie de gestion du contexte

### Règles générales
- **CLAUDE.md** est lu automatiquement à chaque message — il doit rester sous 80 lignes
- **Chaque session commence par son brief** (section "Brief session N" ci-dessous)
- **Ne jamais demander à Claude Code de lire les specs complètes** — lui donner uniquement ce dont il a besoin pour la session
- **Terminer chaque session proprement** : demander à Claude Code un résumé des fichiers créés/modifiés avant de fermer

### Fichiers de référence par couche
Claude Code lit ces fichiers automatiquement si on les mentionne dans le brief :
- `CLAUDE.md` → règles architecturales (toujours)
- `src/app/domain/entities/*.ts` → quand on travaille en Application ou Presentation
- `src/app/application/tokens.ts` → quand on travaille en Infrastructure ou Presentation

### Signaux de fin de session
Arrêter la session quand :
- Le contexte dépasse ~60% (indicateur WebStorm)
- On vient de terminer le livrable de la session
- On se retrouve à devoir lire plus de 5 fichiers existants pour continuer

---

## Vue d'ensemble des sessions

| # | Nom | Couche | Livrable | Tokens estimés |
|---|---|---|---|---|
| S01 | Scaffolding & configuration | Tous | Structure vide, CLAUDE.md, angular.json | Faible |
| S02 | Domain — Journal | Domain | 4 entités + 4 value objects + types | Faible |
| S03 | Domain — Traitements, Coach, Rapport | Domain | 5 entités + ports IA | Faible |
| S04 | Infrastructure — Stockage | Infrastructure | IndexedDBAdapter + schéma + LocalSettingsAdapter | Moyen |
| S05 | Infrastructure — AI Adapter | Infrastructure | AnthropicAdapter + prompts + NullAIAdapter | Moyen |
| S06 | Application — Use cases Journal (sans IA) | Application | 5 use cases + tokens.ts | Moyen |
| S07 | Application — Use cases Journal (avec IA) | Application | 3 use cases IA + tests unitaires use cases | Moyen |
| S08 | Application — Use cases Analyse, Rapport, Coach | Application | 6 use cases + tests | Moyen |
| S09 | Presentation — Shell + navigation + thème | Presentation | Shell, BottomNav, SideNav, thème Material | Moyen |
| S10 | Presentation — Journal : composants partagés | Presentation | 6 shared components (slider, bristol, SVG...) | Élevé |
| S11 | Presentation — Journal : pages de saisie | Presentation | 4 pages (repas, symptômes, prises, notes) | Élevé |
| S12 | Presentation — Analyse | Presentation | 4 composants graphiques + page analyse | Élevé |
| S13 | Presentation — Rapport + Paramètres | Presentation | Pages rapport + paramètres complets | Élevé |
| S14 | Presentation — Coach IA | Presentation | Interface chat + gestion sessions | Moyen |
| S15 | Tests — Domain + Infrastructure | Tests | Specs domain + adapter specs | Moyen |
| S16 | Tests — Application + Presentation | Tests | Use case specs + composant specs | Moyen |
| S17 | Tests E2E — Journal | E2E | 5 specs Playwright + playwright.config.ts | Moyen |
| S18 | CI/CD + i18n + polish | Tous | GitHub Actions, fr.json, en.json, offline banner | Faible |

---

## Sessions détaillées

---

### S01 — Scaffolding & configuration
**Durée estimée** : 1h | **Tokens** : faible

**Objectif** : créer la structure de dossiers vide, configurer Angular 21 + Material + Vitest + Playwright, écrire CLAUDE.md.

**Brief à coller en début de session** :
```
Projet : FlowEase — app Angular 21 de suivi SIBO/gastroparésie.
Architecture : Clean Architecture 4 couches (domain / application / infrastructure / presentation).

Tâches de cette session :
1. Créer la structure de dossiers vide selon l'arborescence ci-dessous (fichiers .gitkeep)
2. Configurer angular.json pour Vitest (builder @angular/build:vitest) et les seuils de couverture
3. Configurer playwright.config.ts (Mobile Chrome Pixel 7 + Mobile Safari iPhone 14, baseURL localhost:4200)
4. Écrire CLAUDE.md à la racine (< 80 lignes, règles Clean Architecture + sécurité clé API)
5. Configurer Angular Material dans app.config.ts (thème teal-700 / amber-600, density -1)
6. Créer app.routes.ts avec lazy loading des 5 feature modules (journal, analysis, report, coach, settings)

Arborescence cible :
src/app/
  domain/entities/ domain/value-objects/ domain/repositories/ai/
  application/journal/ application/analysis/ application/report/ application/coach/ application/settings/
  infrastructure/storage/ infrastructure/ai/anthropic/prompts/ infrastructure/ai/null/
  presentation/core/guards/ presentation/core/interceptors/
  presentation/shared/components/ presentation/shared/pipes/
  presentation/layout/shell/ presentation/layout/bottom-nav/ presentation/layout/side-nav/
  presentation/features/journal/ presentation/features/analysis/
  presentation/features/report/ presentation/features/coach/ presentation/features/settings/
```

**Fichiers produits** : ~15 fichiers de configuration + arborescence

---

### S02 — Domain : entités et value objects du Journal
**Durée estimée** : 45min | **Tokens** : faible

**Objectif** : écrire les entités et value objects du module Journal. Aucune dépendance externe.

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Domain (zéro import Angular ou externe).
Session : entités et value objects du Journal quotidien.

Règle JSDoc : @remarks obligatoire sur chaque interface publique,
@param + @returns sur chaque fonction publique.

Fichiers à créer dans domain/entities/ :
- meal.entity.ts      : MealEntity, MealType, MealInputMode, FoodItemVO, FodmapFlagVO
- symptom.entity.ts   : SymptomEntity, SymptomCategory, AbdominalZone, PainType, StoolEntry, GasEvent
- intake.entity.ts    : IntakeEntity, IntakeStatus, SkipReason
- note.entity.ts      : NoteEntity, LinkedEntry, NoteInputMode

Fichiers à créer dans domain/value-objects/ :
- fodmap-level.vo.ts  : type FodmapLevel + isFodmapDangerous() + fodmapRank()
- pain-location.vo.ts : type AbdominalZone + ABDOMINAL_ZONES constant (6 zones)
- pain-type.vo.ts     : type PainType + PAIN_TYPES constant avec labels FR/EN
- bristol-type.vo.ts  : type BristolType (1..7) + BRISTOL_DESCRIPTIONS constant

Toutes les entités sont des interfaces readonly — pas de classes.
```

**Fichiers produits** : 8 fichiers TypeScript purs

---

### S03 — Domain : Traitements, Coach, Rapport + tous les ports
**Durée estimée** : 45min | **Tokens** : faible

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Domain (zéro import Angular ou externe).
Session : entités Traitement/Cure/Coach/Rapport + tous les ports (interfaces repository).

Entités à créer dans domain/entities/ :
- treatment.entity.ts     : TreatmentEntity, TreatmentCategory, TreatmentMode, ReminderConfig
- cure.entity.ts          : CureEntity, CureStatus
- coach-session.entity.ts : CoachSessionEntity, CoachMessageEntity, SessionSummaryVO
- report.entity.ts        : ReportEntity, ReportFormat, ReportSection
- user-profile.entity.ts  : UserProfileEntity, MedicalCondition

Ports à créer dans domain/repositories/ :
- storage.repository.ts   : StorageRepository<T> (get, getAll, getRange, save, delete, clear)
- meal.repository.ts      : MealRepository extends StorageRepository<MealEntity>
- symptom.repository.ts   : SymptomRepository
- intake.repository.ts    : IntakeRepository
- note.repository.ts      : NoteRepository
- treatment.repository.ts : TreatmentRepository + CureRepository

Ports IA dans domain/repositories/ai/ :
- meal-analysis.port.ts   : MealAnalysisPort (analyzeMealPhoto, extractMealFromText)
- note-tagging.port.ts    : NoteTaggingPort (tagNote)
- analysis.port.ts        : AnalysisPort (analyzeData) — prend AnalysisContext, retourne AnalysisResult | null
- report.port.ts          : ReportPort (generateReportSummary)
- coach.port.ts           : CoachPort (sendMessage en AsyncIterable<string>, summarizeSession)

Règle : chaque port a @remarks expliquant ISP + exemple d'injection TestBed.
```

**Fichiers produits** : 14 fichiers TypeScript purs

---

### S04 — Infrastructure : Stockage
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Infrastructure/storage — implémente les interfaces de domain/repositories/.
Lire avant de commencer : src/app/domain/repositories/storage.repository.ts

Fichiers à créer :

infrastructure/storage/indexeddb.schema.ts :
- DB_NAME = 'flowease-db', DB_VERSION = 1
- STORES constant (10 stores : meals, symptoms, intakes, notes, treatments,
  cures, insights, reports, coach-sessions, symptom-config)
- upgradeSchema(db, oldVersion) avec tous les index (voir specs)
- JSDoc : règles de migration, lien MDN

infrastructure/storage/indexeddb.adapter.ts :
- @Injectable({ providedIn: 'root' })
- Implémente StorageRepository via idb (import { openDB, IDBPDatabase } from 'idb')
- Méthodes : init(), get<T>(), getAll<T>(), getRange<T>(store, index, lower, upper),
  getAllByIndex<T>(), save<T>(), delete(), clear()
- JSDoc : @remarks "implémente StorageRepository — substitutable en test via fake-indexeddb"

infrastructure/storage/local-settings.adapter.ts :
- Pas de @Injectable (instancié directement dans app.config.ts)
- Gère localStorage uniquement : apiKey, language, theme, coachMode,
  defaultWindow, userProfile, lastAnalysisDate
- getApiKey() retourne null si absent (jamais de valeur par défaut)
- JSDoc : @remarks "ne jamais logger la valeur retournée par getApiKey()"
```

**Fichiers produits** : 3 fichiers, ~250 lignes

---

### S05 — Infrastructure : AI Adapter
**Durée estimée** : 1h15 | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Infrastructure/ai.
Lire avant de commencer :
  src/app/domain/repositories/ai/meal-analysis.port.ts
  src/app/domain/repositories/ai/coach.port.ts

Fichiers à créer :

infrastructure/ai/null/null-ai.adapter.ts :
- @Injectable() (pas providedIn — injecté manuellement dans les tests)
- Implémente MealAnalysisPort, NoteTaggingPort, AnalysisPort, ReportPort, CoachPort
- Toutes les méthodes retournent null ou un itérable vide
- JSDoc : Pattern Null Object, double usage (mode dégradé + tests)

infrastructure/ai/anthropic/anthropic.client.ts :
- Classe simple (pas @Injectable) — wraps HttpClient
- post<T>(payload, apiKey): Observable<T>
- buildHeaders(apiKey): HttpHeaders — jamais logger apiKey
- handleError(error): Observable<never> — retourne EMPTY, jamais ne logue la clé

infrastructure/ai/anthropic/anthropic.adapter.ts :
- @Injectable({ providedIn: 'root' })
- Implémente tous les ports IA
- Lit la clé via LocalSettingsAdapter.getApiKey() à chaque appel (pas en propriété de classe)
- Retourne null en cas d'erreur réseau ou JSON invalide (jamais throw)
- sendMessage() : streaming via fetch API (SSE) — pas HttpClient (pas de support streaming)
- JSDoc : @remarks LSP, Single Responsibility (prompts externalisés)

infrastructure/ai/anthropic/prompts/ — 6 fichiers :
- meal-photo.prompt.ts    : export const MEAL_PHOTO_PROMPT = `...` (prompt A.1 des specs)
- meal-text.prompt.ts     : prompt A.2
- note-tagging.prompt.ts  : prompt A.3 avec placeholder {{NOTE_CONTENT}}
- analysis.prompt.ts      : prompt A.4 avec placeholders {{WINDOW_DAYS}} {{CONTEXT_DATA}}
- report-summary.prompt.ts: prompt A.5
- coach-system.prompt.ts  : prompt A.8 (system prompt Coach) avec placeholders
  {{CONDITIONS}} {{PROTOCOL}} {{TREATMENTS}} {{PREVIOUS_SESSION_SUMMARY}} {{CONTEXT_DATA}}

Les prompts sont des template literals TypeScript — pas de fichiers .txt.
```

**Fichiers produits** : 10 fichiers

---

### S06 — Application : use cases Journal sans IA
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Application — use cases Journal (sans dépendance IA).
Lire avant de commencer :
  src/app/domain/entities/meal.entity.ts
  src/app/domain/entities/symptom.entity.ts
  src/app/domain/entities/intake.entity.ts
  src/app/domain/entities/note.entity.ts
  src/app/domain/repositories/storage.repository.ts

Créer d'abord : application/tokens.ts
- InjectionToken pour chaque port :
  MEAL_ANALYSIS_PORT, NOTE_TAGGING_PORT, ANALYSIS_PORT,
  REPORT_PORT, COACH_PORT, STORAGE_PORT

Use cases à créer (tous @Injectable({ providedIn: 'root' })) :
- application/journal/add-meal.usecase.ts       : save MealEntity, assigne id + timestamp
- application/journal/get-journal-day.usecase.ts: retourne toutes les entrées d'un jour donné
  (meals + symptoms + intakes + notes), triées par occurredAt
- application/journal/add-symptom.usecase.ts    : save SymptomEntity
- application/journal/confirm-intake.usecase.ts : save IntakeEntity, status 'taken' | 'skipped'
- application/journal/add-note.usecase.ts       : save NoteEntity sans tags (tags ajoutés par tag-note)

Règles :
- @Inject(STORAGE_PORT) sur chaque repository injecté
- Mode dégradé documenté dans @remarks même pour les use cases sans IA
- id = crypto.randomUUID(), timestamp = new Date() — toujours assignés dans le use case
```

**Fichiers produits** : 6 fichiers (~30 lignes chacun)

---

### S07 — Application : use cases Journal avec IA + tests use cases
**Durée estimée** : 1h15 | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Application — use cases Journal avec ports IA + leurs tests Vitest.
Lire avant de commencer :
  src/app/application/tokens.ts
  src/app/domain/repositories/ai/meal-analysis.port.ts
  src/app/domain/repositories/ai/note-tagging.port.ts
  src/app/infrastructure/ai/null/null-ai.adapter.ts

Use cases à créer :
- application/journal/analyze-meal-photo.usecase.ts
  @Inject(MEAL_ANALYSIS_PORT) — retourne [] si port retourne null
- application/journal/extract-meal-from-text.usecase.ts
  @Inject(MEAL_ANALYSIS_PORT) — retourne [] si null
- application/journal/tag-note.usecase.ts
  @Inject(NOTE_TAGGING_PORT) — retourne { tags: [], summary: '' } si null

Tests à créer (même dossier, suffixe .spec.ts) pour chaque use case :
- describe nominal : mock port retourne données valides
- describe mode dégradé : NullAIAdapter injecté — résultat vide, pas d'exception
- describe erreur storage : repository mock rejette — exception propagée

Convention de nommage it() : comportement attendu en français, pas le nom de méthode.
Utiliser jasmine.createSpyObj pour mocker les ports dans le describe nominal.
```

**Fichiers produits** : 6 fichiers (3 use cases + 3 specs)

---

### S08 — Application : use cases Analyse, Rapport, Coach, Paramètres
**Durée estimée** : 1h15 | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21.
Couche : Application — use cases des modules Analyse, Rapport, Coach, Paramètres.
Lire avant de commencer :
  src/app/application/tokens.ts
  src/app/domain/repositories/ai/analysis.port.ts
  src/app/domain/repositories/ai/report.port.ts
  src/app/domain/repositories/ai/coach.port.ts

Use cases Analyse :
- get-symptom-trends.usecase.ts  : agrège symptoms par jour sur N jours, retourne TrendData[]
- get-adherence-stats.usecase.ts : calcule observance par traitement sur N jours
- run-ai-analysis.usecase.ts     : construit AnalysisContext depuis storage, appelle AnalysisPort
  Mode dégradé : retourne { available: false } si port retourne null

Use cases Rapport :
- build-report.usecase.ts            : construit ReportData depuis storage (blocs 1-5, sans IA)
- generate-report-summary.usecase.ts : appelle ReportPort avec ReportData
  Mode dégradé : retourne null si port retourne null

Use cases Coach :
- start-coach-session.usecase.ts      : crée CoachSessionEntity, charge résumé session précédente
- send-coach-message.usecase.ts       : appelle CoachPort.sendMessage(), sauvegarde le message
- summarize-coach-session.usecase.ts  : appelle CoachPort.summarizeSession(), sauvegarde résumé

Use cases Paramètres :
- save-user-profile.usecase.ts : écrit dans LocalSettingsAdapter
- export-data.usecase.ts       : lit tous les stores, sérialise en JSON, déclenche téléchargement
- import-data.usecase.ts       : parse JSON, valide structure, écrit dans tous les stores

Créer les tests .spec.ts pour run-ai-analysis, generate-report-summary, send-coach-message
(les 3 use cases les plus critiques avec mode dégradé IA).
```

**Fichiers produits** : ~20 fichiers

---

### S09 — Presentation : Shell, navigation, thème, routing
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material.
Couche : Presentation/layout + app.config.ts final.
Session : shell, navigation responsive, thème, binding DI final.

Fichiers à créer :

styles/_theme.scss : thème Material teal-700/amber-600, density -1, dark mode auto

presentation/layout/shell/shell.component.ts :
- BreakpointObserver '(min-width: 768px)'
- SideNav si desktop, BottomNav si mobile
- router-outlet

presentation/layout/bottom-nav/bottom-nav.component.ts :
- MatBottomNavBar ou custom avec MatIcon
- 5 items : Journal, Analyse, Rapport, Coach, Paramètres
- Active state via Router

presentation/layout/side-nav/side-nav.component.ts :
- MatSidenav permanent
- Mêmes 5 items + logo FlowEase + badge "Claude Pro actif" si apiKey présente

presentation/core/guards/api-key.guard.ts :
- Fonctionnel guard (inject LocalSettingsAdapter)
- Redirige vers /settings/api-key si clé absente
- S'applique uniquement au module Coach

app.config.ts :
- Binding final de tous les ports vers leurs adapters
- Factory pattern pour les ports IA (AnthropicAdapter si apiKey, NullAIAdapter sinon)
- APP_INITIALIZER pour IndexedDBAdapter.init()
```

**Fichiers produits** : 7 fichiers

---

### S10 — Presentation : composants partagés du Journal
**Durée estimée** : 1h30 | **Tokens** : élevé

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material.
Couche : Presentation/shared — composants réutilisables du Journal.
Attention : session longue — s'arrêter après 4 composants si le contexte monte.

Composants à créer dans presentation/shared/components/ (standalone, importent Material) :

intensity-slider/ :
- Input: value: number (1-10), label: string
- Output: valueChange: EventEmitter<number>
- MatSlider avec aria-valuemin/max/now
- Retour haptique via navigator.vibrate(10) si disponible

abdominal-map/ :
- SVG inline 6 zones (epigastric, hypochondre_left/right, periumbilical, iliac_left/right)
- Input: selectedZones: AbdominalZone[]
- Output: zonesChange: EventEmitter<AbdominalZone[]>
- Zones tappables ≥ 44px, aria-label sur chaque zone

bristol-scale/ :
- 7 types avec icône SVG simple (formes géométriques, pas de photos médicales)
- Input: value: BristolType | null
- Output: valueChange: EventEmitter<BristolType>
- Affichage description courte sous chaque icône

food-chip/ :
- Input: item: FoodItemVO, editable: boolean
- Output: remove: EventEmitter<void>, edit: EventEmitter<FoodItemVO>
- Couleur selon fodmapLevel via FodmapColorPipe
- Badge "IA" si item.confirmed === false (suggestion non validée)

voice-input/ :
- Bouton micro → démarre Web Speech API
- Émet transcription en temps réel via Output: transcript: EventEmitter<string>
- État visuel : idle / recording / error
- Message si Web Speech API non supporté

photo-input/ :
- input[type=file] accept="image/*" capture="environment"
- Converti en base64 via FileReader
- Output: imageSelected: EventEmitter<{base64: string, mediaType: string}>
- Désactivé si offline (inject NetworkService ou OnlineDetection)

Pipes dans presentation/shared/pipes/ :
- fodmap-color.pipe.ts   : FodmapLevel → classe CSS ('chip-low'|'chip-medium'|'chip-high'|'chip-unknown')
- relative-date.pipe.ts  : Date → "il y a 2h" | "hier" | "lun. 12 mai" selon distance
```

**Fichiers produits** : ~14 fichiers

---

### S11 — Presentation : pages Journal (saisie)
**Durée estimée** : 1h30 | **Tokens** : élevé

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material.
Couche : Presentation/features/journal.
Lire avant de commencer :
  src/app/presentation/shared/components/ (liste des composants disponibles)
  src/app/application/journal/ (liste des use cases disponibles)

Ne pas réimplémenter la logique — utiliser uniquement les use cases injectés.

Fichiers à créer :

journal/journal.routes.ts : routes du module journal

journal/journal-home/ :
- Liste du jour : toutes les entrées groupées par type
- FAB "+" → bottom sheet avec choix du type d'entrée
- Appelle GetJournalDayUseCase
- Affiche OfflineBannerComponent si navigator.onLine === false

journal/meal-entry/ :
- 4 boutons mode (Texte/Vocal/Photo/Récurrents)
- Texte : textarea + bouton valider
- Vocal : VoiceInputComponent → ExtractMealFromTextUseCase → chips éditables
- Photo : PhotoInputComponent → AnalyzeMealPhotoUseCase → chips éditables
         Bouton photo désactivé si offline
         data-testid="ai-unavailable" si proposedItems vide après analyse
- Récurrents : liste des 20 aliments fréquents (calculé depuis l'historique)
- Sélecteur heure du repas (modifiable) + type de repas
- Bouton Valider → AddMealUseCase

journal/symptom-entry/ :
- 3 blocs (Digestifs / Systémiques / Bien-être)
- IntensitySliderComponent pour chaque symptôme avec intensité
- AbdominalMapComponent pour les douleurs abdominales
- BristolScaleComponent pour le transit
- Sélection multiple pour types de douleur
- Bouton Valider → AddSymptomUseCase

journal/intake-entry/ :
- Liste des traitements actifs du jour
- Tap = confirmation rapide (taken + timestamp auto)
- Tap long = panneau détail (heure, dose réelle, note, raison skip)
- Bouton Valider → ConfirmIntakeUseCase

journal/note-entry/ :
- 3 boutons mode (Texte/Vocal/Photo)
- Tags générés par IA après validation → TagNoteUseCase
- Bouton "Lier à..." → bottom sheet avec entrées du jour
- Bouton Valider → AddNoteUseCase
```

**Fichiers produits** : ~12 fichiers

---

### S12 — Presentation : module Analyse
**Durée estimée** : 1h15 | **Tokens** : élevé

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material + Chart.js (ng2-charts).
Couche : Presentation/features/analysis.
Lire avant de commencer :
  src/app/application/analysis/ (3 use cases disponibles)

analysis/analysis.routes.ts

analysis/analysis-home/ :
- Sélecteur fenêtre temporelle (7j/30j/90j) — MatButtonToggle
- Affiche les 3 visualisations offline + bouton "Lancer une analyse"
- Bouton "Lancer une analyse" → panneau de confirmation (fenêtre 14j par défaut, modifiable)
- Si lastAnalysisDate récente → message "Dernière analyse : il y a X jours"

analysis/symptom-chart/ :
- ng2-charts LineChart
- Input: symptomKey, windowDays
- Appelle GetSymptomTrendsUseCase
- Superposition 2 symptômes possible via selector
- Points manquants en pointillé (borderDash)

analysis/adherence-calendar/ :
- Calendrier mensuel vue heatmap (CSS Grid, pas de librairie externe)
- Couleur par jour : vert ≥80% / orange 50-80% / rouge <50% / gris = aucune saisie
- Appelle GetAdherenceStatsUseCase

analysis/wellbeing-heatmap/ :
- Même structure calendrier que adherence-calendar
- Basé sur le score de bien-être global saisi chaque jour

analysis/ai-insights/ :
- Affiche les cartes d'insight (AnalysisResult depuis IndexedDB)
- Carte par type : corrélations, patterns, alertes, recommandations
- Niveau de confiance (badge), date d'analyse, bouton "Copier pour mon médecin"
- Résultats offline (lus depuis IndexedDB, pas rechargés depuis l'API)
```

**Fichiers produits** : 7 fichiers

---

### S13 — Presentation : Rapport + Paramètres
**Durée estimée** : 1h30 | **Tokens** : élevé

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material.
Couche : Presentation/features/report + settings.
Lire avant de commencer :
  src/app/application/report/ (2 use cases)
  src/app/application/settings/ (3 use cases)

Module Rapport :
report/report.routes.ts
report/report-builder/ :
- Sélecteur fenêtre (7/14/30/90j ou plage custom via MatDatepicker)
- Choix format : PDF ou Texte (MatButtonToggle)
- Checkbox "Synthèse IA" (décochée par défaut) + rappel tokens si cochée
- Bouton "Générer" → BuildReportUseCase puis GenerateReportSummaryUseCase si coché
- Téléchargement PDF via jsPDF ou affichage texte markdown

report/report-history/ :
- Liste des 20 derniers rapports (date, fenêtre, format)
- Bouton "Regénérer" sur chaque rapport

Module Paramètres :
settings/settings.routes.ts + settings-home/ (menu de navigation)
settings/profile/         : formulaire UserProfile (MatForm)
settings/api-key/         : champ password + bouton tester + statut + lien doc Anthropic
settings/treatments/      : liste CRUD des traitements + gestion cures + rappels
settings/symptoms-config/ : liste réordonnée par drag-drop (CDK DragDrop) + ajout personnalisé
settings/coach-settings/  : préférences Coach (mode, contexte défaut, tokens, langue)
settings/data-privacy/    : boutons Export JSON / Import JSON / Supprimer tout (avec confirms)
settings/about/           : version, lien GitHub, mention légale
```

**Fichiers produits** : ~16 fichiers

---

### S14 — Presentation : Coach IA
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Angular Material.
Couche : Presentation/features/coach.
Lire avant de commencer :
  src/app/application/coach/ (3 use cases)
  src/app/domain/entities/coach-session.entity.ts

coach/coach.routes.ts

coach/coach-context-picker/ (bottom sheet) :
- 5 options de contexte (Aujourd'hui / 7j / 14j / 30j / Profil uniquement)
- Affichage estimation tokens par option (statique)
- S'affiche automatiquement au démarrage d'une nouvelle session
- Appelle StartCoachSessionUseCase avec le contexte choisi

coach/coach-chat/ :
- Interface chat classique : bulles user (droite) + Claude (gauche)
- Questions suggérées statiques (4) disparaissent au premier message
- Input text + bouton envoi
- Streaming : les tokens arrivent un par un via AsyncIterable
  Affichage progressif dans la bulle Claude en cours de frappe
- TokenCounter (composant shared) affiché discrètement en bas
- Bouton "Copier" sur chaque réponse Claude
- Bouton "Nouvelle conversation" → SummarizeCoachSessionUseCase + StartCoachSessionUseCase
- Appelle SendCoachMessageUseCase à chaque envoi

coach/coach-history/ :
- Liste des sessions passées (date, contexte, nb messages)
- Affiche le résumé de chaque session (summary)
- Bouton "Supprimer tout l'historique"
```

**Fichiers produits** : 5 fichiers

---

### S15 — Tests : Domain + Infrastructure
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Vitest.
Session : tests unitaires Domain + tests d'intégration Infrastructure.

Tests Domain à créer (domain/value-objects/*.spec.ts) :
- fodmap-level.vo.spec.ts  : isFodmapDangerous, fodmapRank — 100% coverage cible
- pain-type.vo.spec.ts     : PAIN_TYPES constant — valeurs attendues
- bristol-type.vo.spec.ts  : BRISTOL_DESCRIPTIONS — 7 types couverts

Tests Infrastructure à créer :

infrastructure/storage/indexeddb.adapter.spec.ts :
- import 'fake-indexeddb/auto' en début de fichier
- beforeEach : new IDBFactory() + adapter.init()
- Cas : save+getById, getRange par date, migration schéma (stores créés)

infrastructure/storage/local-settings.adapter.spec.ts :
- beforeEach : localStorage.clear()
- Cas : getApiKey retourne null si absent, set+get apiKey,
  getApiKey ne throw jamais

infrastructure/ai/anthropic/anthropic.adapter.spec.ts :
- provideHttpClient() + provideHttpClientTesting()
- Cas : header x-api-key présent, null si apiKey absent,
  null si erreur réseau, [] si JSON invalide
- afterEach : httpTesting.verify()

infrastructure/ai/null/null-ai.adapter.spec.ts :
- Vérifie que chaque méthode retourne null ou itérable vide
- Vérifie qu'aucune méthode ne throw
```

**Fichiers produits** : 7 fichiers spec

---

### S16 — Tests : Application + Presentation
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Clean Architecture Angular 21 + Vitest + TestBed.
Session : tests use cases Application restants + tests composants Presentation.
(Les tests des use cases IA du journal ont été créés en S07.)

Tests Application à compléter :
application/journal/add-meal.usecase.spec.ts         : assigne UUID + timestamp, propage StorageError
application/journal/get-journal-day.usecase.spec.ts  : retourne entrées du jour triées
application/journal/confirm-intake.usecase.spec.ts   : status taken vs skipped
application/analysis/run-ai-analysis.usecase.spec.ts : contexte construit, mode dégradé

Tests Presentation (composants critiques) :
presentation/shared/components/intensity-slider/intensity-slider.component.spec.ts :
- Rendu initial avec value
- Émission valueChange au changement

presentation/shared/components/abdominal-map/abdominal-map.component.spec.ts :
- Sélection d'une zone → zonesChange émis
- Multi-sélection possible
- aria-label présent sur chaque zone

presentation/features/journal/meal-entry/meal-entry.component.spec.ts :
- Mode photo IA disponible → chips affichés
- Mode photo IA indisponible → data-testid="ai-unavailable" visible, saisie non bloquée
- Bouton photo disabled si offline

presentation/features/journal/intake-entry/intake-entry.component.spec.ts :
- Tap simple → ConfirmIntakeUseCase appelé avec status 'taken'
- Tap long → panneau détail visible
```

**Fichiers produits** : 9 fichiers spec

---

### S17 — Tests E2E Playwright : Journal
**Durée estimée** : 1h | **Tokens** : moyen

**Brief à coller en début de session** :
```
Projet : FlowEase — Playwright E2E — journal uniquement.
Lire avant de commencer : playwright.config.ts

Convention : l'app est démarrée avec FLOWEASE_AI_MODE=null (NullAIAdapter forcé).
Tous les tests s'exécutent sur Mobile Chrome (Pixel 7) et Mobile Safari (iPhone 14).

e2e/journal/meal-entry.spec.ts :
- saisie texte → repas visible dans le journal (chemin principal)
- saisie vocale → transcription mockée via page.exposeFunction('__mockSpeechResult')
- bouton photo disabled si page.context().setOffline(true)
- aliments récurrents → tap unique suffit (seed IndexedDB en beforeEach)
- heure du repas modifiable → heure affichée dans le journal

e2e/journal/symptom-entry.spec.ts :
- saisie douleur abdominale → intensité + zone + type → visible dans le journal
- saisie Bristol → type 4 sélectionné → affiché

e2e/journal/intake-entry.spec.ts :
- tap simple → statut "pris" visible
- tap long → panneau détail → note ajoutée visible

e2e/journal/note-entry.spec.ts :
- note texte → sauvegardée (sans tags si IA indisponible)
- lier à un repas → repas affiché dans les entrées liées

Helpers à créer dans e2e/helpers/ :
- seed-indexeddb.ts : fonction pour pré-remplir IndexedDB avant un test
  (aliments récurrents, traitements actifs)
- mock-speech.ts    : inject script pour mocker Web Speech API dans Playwright
```

**Fichiers produits** : 6 fichiers

---

### S18 — CI/CD, i18n, polish final
**Durée estimée** : 45min | **Tokens** : faible

**Brief à coller en début de session** :
```
Projet : FlowEase — session finale de configuration et polish.

1. .github/workflows/deploy.yml :
   - npm ci → ng test (Vitest, bloquant) → npx playwright test (bloquant)
   - ng build --base-href /flowease/ → deploy GitHub Pages
   - Matrice : ubuntu-latest, node 20

2. assets/i18n/fr.json + en.json :
   - Toutes les clés de traduction utilisées dans les templates
   - Structure : { "journal": { "addMeal": "...", ... }, "settings": { ... } }

3. presentation/shared/components/offline-banner/ :
   - Bandeau discret en haut (MatSnackBar ou div fixe)
   - Écoute window 'online'/'offline'
   - Message FR/EN selon langue

4. presentation/shared/components/token-counter/ :
   - Input: sessionTokens: number
   - Affichage discret "~X tokens cette session"
   - Visible uniquement si showTokenCounter === true (LocalSettingsAdapter)

5. Vérification finale CLAUDE.md :
   - Toujours < 80 lignes
   - Règles à jour avec les conventions établies pendant le dev

6. README.md à la racine :
   - Installation, configuration clé API, déploiement GitHub Pages
   - Architecture en 5 lignes
   - Lien vers flowease-specs.md et flowease-architecture.md
```

**Fichiers produits** : 7 fichiers

---

## Récapitulatif

| Sessions | Contenu | Total fichiers estimés |
|---|---|---|
| S01 | Scaffolding | ~15 |
| S02–S03 | Domain complet | ~22 |
| S04–S05 | Infrastructure complète | ~13 |
| S06–S08 | Application complète + tests | ~32 |
| S09 | Shell + navigation + DI final | ~7 |
| S10–S14 | Presentation complète | ~54 |
| S15–S17 | Tests + E2E | ~22 |
| S18 | CI/CD + polish | ~7 |
| **Total** | | **~172 fichiers** |

---

## Conseils pratiques pour les sessions Claude Code sous WebStorm

**Avant chaque session**
- Ouvrir un nouveau chat Claude Code (contexte vide)
- Coller uniquement le brief de la session (pas les specs complètes)
- Vérifier que CLAUDE.md est bien à la racine du projet

**Pendant la session**
- Si Claude Code demande à lire un fichier non listé dans le brief → laisser faire
- Si le contexte monte rapidement → demander "génère le fichier X, puis arrête-toi"
- Ne pas demander plusieurs sessions de travail dans le même chat

**En fin de session**
- Demander : "liste tous les fichiers créés ou modifiés dans cette session"
- Vérifier que les fichiers sont bien dans la bonne couche
- Committer avant de fermer (état propre pour la prochaine session)

**Si une session déborde**
- Découper : finir les fichiers déjà commencés, committer, ouvrir un nouveau chat
- Le brief de la session suivante peut inclure "continuer depuis : [liste des fichiers déjà faits]"
