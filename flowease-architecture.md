# FlowEase — Architecture Angular

> Document vivant — version 1.1  
> Complément de : `flowease-specs.md`  
> Stack : Angular 21 · Angular Material · Chart.js · GitHub Pages  
> Principes : Clean Architecture (pragmatique) · SOLID · JSDoc

---

## Table des matières

1. [Principes directeurs](#1-principes-directeurs)
2. [Stack technique](#2-stack-technique)
3. [Structure en couches](#3-structure-en-couches)
4. [Structure du projet](#4-structure-du-projet)
5. [Couche Domain](#5-couche-domain)
6. [Couche Application](#6-couche-application)
7. [Couche Infrastructure](#7-couche-infrastructure)
8. [Couche Presentation](#8-couche-presentation)
9. [Navigation responsive](#9-navigation-responsive)
10. [Thème et styles](#10-thème-et-styles)
11. [Internationalisation](#11-internationalisation)
12. [Stratégie de tests](#12-stratégie-de-tests)
13. [Déploiement GitHub Pages](#13-déploiement-github-pages)
14. [Ordre de développement](#14-ordre-de-développement)
15. [Composants Claude pour la maintenabilité](#15-composants-claude-pour-la-maintenabilité)

---

## 1. Principes directeurs

### 1.1 Clean Architecture pragmatique

L'objectif central : **l'IA et le stockage sont des détails d'implémentation**, pas des dépendances du domaine métier. Le domaine ne connaît ni Claude, ni IndexedDB, ni Angular.

```
Domain          ← ne dépend de rien
Application     ← dépend de Domain uniquement
Infrastructure  ← implémente les interfaces du Domain
Presentation    ← dépend de Application uniquement
```

**Conséquence pratique** : remplacer Claude par un autre LLM, ou IndexedDB par une autre solution, est un changement d'adapter uniquement — zéro impact sur le domaine ou les composants Angular.

### 1.2 Principes SOLID appliqués

| Principe | Application concrète dans FlowEase |
|---|---|
| **S** — Single Responsibility | Chaque use case fait une seule chose. Chaque composant Angular affiche ou capture, jamais les deux. |
| **O** — Open/Closed | Les adapters implémentent des interfaces fermées. Ajouter un nouveau provider IA = nouvel adapter, pas de modification de l'existant. |
| **L** — Liskov Substitution | `AnthropicAdapter` et `NullAIAdapter` sont substituables sans changer le code appelant. |
| **I** — Interface Segregation | `AIRepository` est séparé en ports dédiés (`MealAnalysisPort`, `CoachPort`…) — un adapter n'implémente que ce qu'il utilise. |
| **D** — Dependency Inversion | Les use cases dépendent d'interfaces (`StorageRepository`, ports IA), jamais des implémentations concrètes. |

### 1.3 Règle de la dépendance

```
Presentation → Application → Domain ← Infrastructure
                                  ↑
                         (implémente les interfaces)
```

Aucune flèche ne remonte vers Presentation ou Infrastructure depuis Domain.

### 1.4 Règle du "sans IA"

Chaque use case qui sollicite l'IA **doit fonctionner en mode dégradé** sans elle. Les ports IA retournent `null` si indisponibles — le use case gère ce cas explicitement et ne bloque jamais l'utilisateur.

---

## 2. Stack technique

| Composant | Choix | Justification |
|---|---|---|
| Framework | Angular (dernière stable, standalone) | Typage fort, DI natif, écosystème mature |
| UI Components | Angular Material | Mobile-first, accessible, thème SCSS |
| Graphiques | Chart.js + ng2-charts | Léger, suffisant, bien intégré Angular |
| Stockage local | idb (wrapper IndexedDB) | Async, typé, offline-first |
| PDF | jsPDF | Génération client-side, sans serveur |
| i18n | @angular/localize | FR + EN, natif Angular |
| Déploiement | angular-cli-ghpages + GitHub Actions | CI/CD gratuit, statique |
| Tests | Jasmine + Angular Testing Library | Standard Angular |

---

## 3. Structure en couches

```
┌─────────────────────────────────────────────────┐
│  PRESENTATION (Angular Components, Routes)       │
│  Composants, Pages, Pipes, Guards               │
├─────────────────────────────────────────────────┤
│  APPLICATION (Use Cases, DTOs)                  │
│  Orchestration, validation, transformation      │
├─────────────────────────────────────────────────┤
│  DOMAIN (Entities, Interfaces, Value Objects)   │
│  Règles métier pures — aucune dépendance        │
├──────────────┬──────────────────────────────────┤
│  INFRA       │  INFRA                           │
│  Storage     │  AI                              │
│  (IndexedDB) │  (Anthropic / Null)              │
└──────────────┴──────────────────────────────────┘
```

---

## 4. Structure du projet

```
src/
├── app/
│   │
│   ├── domain/                          # Couche Domain — aucune dépendance externe
│   │   ├── entities/                    # Modèles métier purs (interfaces TS)
│   │   │   ├── meal.entity.ts
│   │   │   ├── symptom.entity.ts
│   │   │   ├── intake.entity.ts
│   │   │   ├── note.entity.ts
│   │   │   ├── treatment.entity.ts
│   │   │   ├── cure.entity.ts
│   │   │   ├── coach-session.entity.ts
│   │   │   ├── report.entity.ts
│   │   │   └── user-profile.entity.ts
│   │   │
│   │   ├── value-objects/               # Objets valeur immuables + fonctions pures
│   │   │   ├── fodmap-level.vo.ts
│   │   │   ├── pain-location.vo.ts
│   │   │   ├── pain-type.vo.ts
│   │   │   └── bristol-type.vo.ts
│   │   │
│   │   └── repositories/               # Ports (interfaces) — jamais implémentés ici
│   │       ├── storage.repository.ts
│   │       ├── meal.repository.ts
│   │       ├── symptom.repository.ts
│   │       ├── intake.repository.ts
│   │       ├── note.repository.ts
│   │       ├── treatment.repository.ts
│   │       └── ai/                     # ISP : un port par responsabilité IA
│   │           ├── meal-analysis.port.ts
│   │           ├── note-tagging.port.ts
│   │           ├── analysis.port.ts
│   │           ├── report.port.ts
│   │           └── coach.port.ts
│   │
│   ├── application/                     # Couche Application — use cases
│   │   ├── tokens.ts                    # InjectionTokens pour tous les ports
│   │   ├── journal/
│   │   │   ├── add-meal.usecase.ts
│   │   │   ├── analyze-meal-photo.usecase.ts
│   │   │   ├── extract-meal-from-text.usecase.ts
│   │   │   ├── add-symptom.usecase.ts
│   │   │   ├── confirm-intake.usecase.ts
│   │   │   ├── add-note.usecase.ts
│   │   │   └── tag-note.usecase.ts
│   │   ├── analysis/
│   │   │   ├── get-symptom-trends.usecase.ts
│   │   │   ├── get-adherence-stats.usecase.ts
│   │   │   └── run-ai-analysis.usecase.ts
│   │   ├── report/
│   │   │   ├── build-report.usecase.ts
│   │   │   └── generate-report-summary.usecase.ts
│   │   ├── coach/
│   │   │   ├── send-coach-message.usecase.ts
│   │   │   ├── start-coach-session.usecase.ts
│   │   │   └── summarize-coach-session.usecase.ts
│   │   └── settings/
│   │       ├── save-user-profile.usecase.ts
│   │       ├── export-data.usecase.ts
│   │       └── import-data.usecase.ts
│   │
│   ├── infrastructure/                  # Couche Infrastructure — implémentations
│   │   ├── storage/
│   │   │   ├── indexeddb.adapter.ts     # Implémente StorageRepository
│   │   │   ├── indexeddb.schema.ts      # Schéma idb versionnée
│   │   │   └── local-settings.adapter.ts # localStorage (clé API, préférences)
│   │   └── ai/
│   │       ├── anthropic/
│   │       │   ├── anthropic.adapter.ts # Implémente tous les ports IA
│   │       │   ├── anthropic.client.ts  # HttpClient bas niveau
│   │       │   └── prompts/             # Prompts externalisés (1 fichier = 1 prompt)
│   │       │       ├── meal-photo.prompt.ts
│   │       │       ├── meal-text.prompt.ts
│   │       │       ├── note-tagging.prompt.ts
│   │       │       ├── analysis.prompt.ts
│   │       │       ├── report-summary.prompt.ts
│   │       │       └── coach-system.prompt.ts
│   │       └── null/
│   │           └── null-ai.adapter.ts   # Mode sans IA — retourne null partout
│   │
│   ├── presentation/                    # Couche Presentation — Angular pur
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── api-key.guard.ts
│   │   │   └── interceptors/
│   │   │       └── anthropic.interceptor.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── intensity-slider/
│   │   │   │   ├── food-chip/
│   │   │   │   ├── abdominal-map/       # SVG interactif 6 zones
│   │   │   │   ├── bristol-scale/       # Sélecteur visuel 7 types
│   │   │   │   ├── voice-input/
│   │   │   │   ├── photo-input/
│   │   │   │   ├── offline-banner/
│   │   │   │   └── token-counter/
│   │   │   └── pipes/
│   │   │       ├── fodmap-color.pipe.ts
│   │   │       └── relative-date.pipe.ts
│   │   ├── layout/
│   │   │   ├── shell/
│   │   │   ├── bottom-nav/              # Mobile
│   │   │   └── side-nav/               # Desktop
│   │   └── features/                   # Pages lazy loaded
│   │       ├── journal/
│   │       ├── analysis/
│   │       ├── report/
│   │       ├── coach/
│   │       └── settings/
│   │
│   ├── app.routes.ts
│   ├── app.config.ts                    # Binding ports → adapters
│   └── app.component.ts
│
├── assets/
│   ├── i18n/
│   │   ├── fr.json
│   │   └── en.json
│   └── icons/
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles/
    ├── _theme.scss
    ├── _typography.scss
    └── styles.scss
```

---

## 5. Couche Domain

### 5.1 Entités — exemple

```typescript
// domain/entities/meal.entity.ts

/**
 * Représente un repas saisi dans le journal quotidien.
 *
 * @remarks
 * Entité du domaine — aucune dépendance sur Angular ou les librairies externes.
 * Les champs optionnels reflètent la saisie progressive (offline-first) :
 * un repas peut être persisté sans analyse IA, puis enrichi ultérieurement.
 */
export interface MealEntity {
  /** Identifiant unique UUID v4 */
  readonly id: string;
  /** Horodatage de la saisie — peut différer de mealTime (saisie rétrospective) */
  readonly timestamp: Date;
  /** Moment réel du repas, modifiable par l'utilisateur */
  readonly mealTime: Date;
  readonly mealType: MealType;
  readonly inputMode: MealInputMode;
  /** Texte brut original avant structuration IA */
  readonly rawInput?: string;
  readonly items: FoodItemVO[];
  /** true si les items ont été proposés par l'IA et validés par l'utilisateur */
  readonly aiAnalyzed: boolean;
  readonly aiFodmapFlags?: FodmapFlagVO[];
  readonly notes?: string;
  readonly editedAt?: Date;
}

export type MealType      = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type MealInputMode = 'voice' | 'photo' | 'text' | 'recurring';
```

### 5.2 Value Objects — exemple

```typescript
// domain/value-objects/fodmap-level.vo.ts

/**
 * Niveau FODMAP d'un aliment — Value Object immuable.
 *
 * @remarks
 * Toute logique de comparaison ou de décision liée au niveau FODMAP
 * est exprimée ici sous forme de fonctions pures, pas dans les composants.
 * Respecte le principe S (Single Responsibility) : la logique métier FODMAP
 * a un seul endroit dans le code.
 */
export type FodmapLevel = 'low' | 'medium' | 'high' | 'unknown';

/**
 * Détermine si un niveau FODMAP nécessite une alerte visuelle rouge.
 *
 * @param level - Niveau à évaluer
 * @returns true uniquement pour 'high'
 */
export function isFodmapDangerous(level: FodmapLevel): boolean {
  return level === 'high';
}

/**
 * Retourne un rang numérique pour le tri ou la comparaison.
 *
 * @param level - Niveau à convertir
 * @returns 0 (low) → 1 (medium) → 2 (high) → -1 (unknown)
 */
export function fodmapRank(level: FodmapLevel): number {
  const ranks: Record<FodmapLevel, number> = {
    low: 0, medium: 1, high: 2, unknown: -1
  };
  return ranks[level];
}
```

### 5.3 Ports IA — Interface Segregation

```typescript
// domain/repositories/ai/meal-analysis.port.ts

/**
 * Port d'analyse alimentaire par IA.
 *
 * @remarks
 * Interface Segregation Principle : ce port est dédié uniquement à l'analyse
 * des repas. Un adapter implémentant ce port n'est pas contraint d'implémenter
 * les autres ports IA (Coach, Analyse, Rapport).
 *
 * Dependency Inversion : les use cases dépendent de cette interface,
 * jamais de l'implémentation Anthropic concrète.
 *
 * @example
 * // Mode production
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: AnthropicAdapter }]
 *
 * // Mode test ou sans clé API
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 */
export interface MealAnalysisPort {
  /**
   * Analyse une photo de repas et retourne les aliments identifiés.
   *
   * @param imageBase64 - Image encodée en base64
   * @param mediaType - Type MIME ('image/jpeg' | 'image/png' | 'image/webp')
   * @returns Liste des aliments, ou null si l'IA est indisponible
   */
  analyzeMealPhoto(
    imageBase64: string,
    mediaType: string
  ): Promise<FoodItemVO[] | null>;

  /**
   * Extrait les aliments d'un texte en langage naturel.
   *
   * @param rawInput - Texte brut (transcription vocale ou saisie libre)
   * @returns Liste des aliments extraits, ou null si l'IA est indisponible
   */
  extractMealFromText(rawInput: string): Promise<FoodItemVO[] | null>;
}
```

---

## 6. Couche Application

### 6.1 Tokens d'injection

```typescript
// application/tokens.ts

/**
 * Tokens d'injection Angular pour tous les ports du domaine.
 *
 * @remarks
 * L'utilisation de InjectionToken (plutôt que les classes concrètes)
 * respecte le Dependency Inversion Principle et permet la substitution
 * des adapters en test sans modifier le code de production.
 *
 * Le binding port → adapter se fait dans app.config.ts uniquement.
 */
export const MEAL_ANALYSIS_PORT = new InjectionToken<MealAnalysisPort>('MealAnalysisPort');
export const NOTE_TAGGING_PORT  = new InjectionToken<NoteTaggingPort>('NoteTaggingPort');
export const ANALYSIS_PORT      = new InjectionToken<AnalysisPort>('AnalysisPort');
export const REPORT_PORT        = new InjectionToken<ReportPort>('ReportPort');
export const COACH_PORT         = new InjectionToken<CoachPort>('CoachPort');
export const STORAGE_PORT       = new InjectionToken<StorageRepository>('StorageRepository');
```

### 6.2 Use case — exemple nominal

```typescript
// application/journal/add-meal.usecase.ts

/**
 * Use case : ajouter un repas au journal quotidien.
 *
 * @remarks
 * Single Responsibility : persiste un repas. La validation FODMAP et l'analyse
 * IA sont des use cases distincts.
 *
 * Dependency Inversion : dépend de MealRepository (interface Domain),
 * jamais de IndexedDBAdapter (Infrastructure).
 */
@Injectable({ providedIn: 'root' })
export class AddMealUseCase {
  constructor(
    @Inject(STORAGE_PORT) private readonly mealRepository: MealRepository
  ) {}

  /**
   * Persiste un repas dans le journal.
   *
   * @param meal - Données du repas (id et timestamp assignés automatiquement)
   * @returns L'entité persistée avec id et timestamp
   * @throws {StorageError} Si la persistance échoue
   */
  async execute(meal: Omit<MealEntity, 'id' | 'timestamp'>): Promise<MealEntity> {
    const entity: MealEntity = {
      ...meal,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      aiAnalyzed: meal.aiAnalyzed ?? false,
    };
    await this.mealRepository.save(entity);
    return entity;
  }
}
```

### 6.3 Use case — exemple avec mode dégradé IA

```typescript
// application/journal/analyze-meal-photo.usecase.ts

/**
 * Use case : analyser une photo de repas via l'IA.
 *
 * @remarks
 * Open/Closed : pour changer de provider IA, on change l'adapter injecté,
 * pas ce use case.
 *
 * Mode dégradé : si l'IA retourne null (indisponible ou sans clé API),
 * le use case retourne un tableau vide — jamais une erreur bloquante.
 * L'utilisateur est informé par le composant, pas par une exception.
 */
@Injectable({ providedIn: 'root' })
export class AnalyzeMealPhotoUseCase {
  constructor(
    @Inject(MEAL_ANALYSIS_PORT)
    private readonly mealAnalysisPort: MealAnalysisPort
  ) {}

  /**
   * Analyse une photo et retourne les aliments proposés par l'IA.
   *
   * @param imageBase64 - Image encodée en base64
   * @param mediaType - Type MIME de l'image
   * @returns Aliments identifiés (vide si IA indisponible)
   */
  async execute(imageBase64: string, mediaType: string): Promise<FoodItemVO[]> {
    const result = await this.mealAnalysisPort.analyzeMealPhoto(imageBase64, mediaType);
    return result ?? []; // mode dégradé : tableau vide, pas d'exception
  }
}
```

---

## 7. Couche Infrastructure

### 7.1 Adapter Anthropic

```typescript
// infrastructure/ai/anthropic/anthropic.adapter.ts

/**
 * Adapter Anthropic — implémente tous les ports IA via l'API Claude.
 *
 * @remarks
 * Liskov Substitution : interchangeable avec NullAIAdapter sans impact
 * sur les use cases.
 *
 * Single Responsibility : la construction des prompts est déléguée
 * aux fichiers du dossier prompts/ — cet adapter gère uniquement
 * l'appel HTTP et le parsing des réponses JSON.
 *
 * La clé API est lue depuis localStorage via LocalSettingsAdapter —
 * elle n'est jamais dans le code source ni dans les bundles.
 */
@Injectable({ providedIn: 'root' })
export class AnthropicAdapter implements
  MealAnalysisPort,
  NoteTaggingPort,
  AnalysisPort,
  ReportPort,
  CoachPort {

  private readonly API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly MODEL   = 'claude-sonnet-4-20250514';

  constructor(
    private readonly http: HttpClient,
    private readonly settings: LocalSettingsAdapter
  ) {}

  /** @inheritdoc */
  async analyzeMealPhoto(
    imageBase64: string,
    mediaType: string
  ): Promise<FoodItemVO[] | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    try {
      const response = await firstValueFrom(
        this.http.post<AnthropicResponse>(this.API_URL, {
          model: this.MODEL,
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: MEAL_PHOTO_PROMPT }
            ]
          }]
        }, { headers: this.buildHeaders(apiKey) })
      );
      return this.parseFoodItems(response);
    } catch {
      return null; // réseau indisponible ou erreur API → mode dégradé
    }
  }

  /**
   * Construit les headers HTTP requis par l'API Anthropic.
   *
   * @remarks
   * La clé API est toujours lue depuis localStorage au moment de l'appel,
   * jamais stockée dans une propriété de classe (évite les fuites mémoire
   * et garantit que la clé mise à jour est immédiatement prise en compte).
   *
   * @param apiKey - Clé API lue depuis localStorage
   */
  private buildHeaders(apiKey: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    });
  }

  /**
   * Parse la réponse JSON de l'API.
   * Retourne un tableau vide en cas de JSON invalide (résilience).
   *
   * @param response - Réponse brute de l'API Anthropic
   */
  private parseFoodItems(response: AnthropicResponse): FoodItemVO[] {
    try {
      const text   = response.content[0]?.text ?? '{}';
      const parsed = JSON.parse(text);
      return parsed.items ?? [];
    } catch {
      return [];
    }
  }
}
```

### 7.2 Adapter Null (Pattern Null Object)

```typescript
// infrastructure/ai/null/null-ai.adapter.ts

/**
 * Adapter IA null — implémente tous les ports en retournant null.
 *
 * @remarks
 * Pattern Null Object : élimine les vérifications null dispersées dans le code.
 * Les use cases gèrent le retour null une seule fois, proprement.
 *
 * Usages :
 * - Aucune clé API configurée (app.config.ts factory)
 * - Tests unitaires des use cases sans appel réseau
 * - Mode offline (si réseau requis)
 *
 * @example
 * // En test unitaire
 * TestBed.configureTestingModule({
 *   providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 * });
 */
@Injectable()
export class NullAIAdapter implements
  MealAnalysisPort,
  NoteTaggingPort,
  AnalysisPort,
  ReportPort,
  CoachPort {

  async analyzeMealPhoto(): Promise<null>     { return null; }
  async extractMealFromText(): Promise<null>  { return null; }
  async tagNote(): Promise<null>              { return null; }
  async analyzeData(): Promise<null>          { return null; }
  async generateReportSummary(): Promise<null>{ return null; }
  async summarizeSession(): Promise<null>     { return null; }
  async* sendMessage(): AsyncIterable<never>  { /* stream vide */ }
}
```

### 7.3 Schéma IndexedDB

```typescript
// infrastructure/storage/indexeddb.schema.ts

/**
 * Schéma versionné de la base IndexedDB FlowEase.
 *
 * @remarks
 * Règles de migration :
 * - Toute modification du schéma DOIT incrémenter DB_VERSION
 * - Ajouter un bloc `if (oldVersion < N)` dans upgradeSchema()
 * - Ne jamais modifier un store existant sans migration — risque de corruption
 * - Les index sont en lecture seule après création (recréer le store si besoin)
 *
 * @see https://web.dev/indexeddb-best-practices/
 */
export const DB_NAME    = 'flowease-db';
export const DB_VERSION = 1;

export const STORES = {
  MEALS:          'meals',
  SYMPTOMS:       'symptoms',
  INTAKES:        'intakes',
  NOTES:          'notes',
  TREATMENTS:     'treatments',
  CURES:          'cures',
  INSIGHTS:       'insights',
  REPORTS:        'reports',
  COACH_SESSIONS: 'coach-sessions',
  SYMPTOM_CONFIG: 'symptom-config',
} as const;

/**
 * Initialise ou migre la base IndexedDB.
 *
 * @param db - Instance IDBPDatabase fournie par idb
 * @param oldVersion - Version précédente (0 si première création)
 */
export function upgradeSchema(db: IDBPDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const meals = db.createObjectStore(STORES.MEALS, { keyPath: 'id' });
    meals.createIndex('by-mealTime', 'mealTime');
    meals.createIndex('by-date',     'timestamp');

    const symptoms = db.createObjectStore(STORES.SYMPTOMS, { keyPath: 'id' });
    symptoms.createIndex('by-occurredAt', 'occurredAt');
    symptoms.createIndex('by-category',   'category');

    const intakes = db.createObjectStore(STORES.INTAKES, { keyPath: 'id' });
    intakes.createIndex('by-takenAt',     'takenAt');
    intakes.createIndex('by-treatmentId', 'treatmentId');

    const notes = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
    notes.createIndex('by-occurredAt', 'occurredAt');
    notes.createIndex('by-tags',       'tags', { multiEntry: true });

    db.createObjectStore(STORES.TREATMENTS,     { keyPath: 'id' });
    db.createObjectStore(STORES.SYMPTOM_CONFIG, { keyPath: 'id' });

    const cures = db.createObjectStore(STORES.CURES, { keyPath: 'id' });
    cures.createIndex('by-treatmentId', 'treatmentId');
    cures.createIndex('by-status',      'status');

    const insights = db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
    insights.createIndex('by-date', 'analyzedAt');

    const reports = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
    reports.createIndex('by-date', 'generatedAt');

    const sessions = db.createObjectStore(STORES.COACH_SESSIONS, { keyPath: 'id' });
    sessions.createIndex('by-date', 'startedAt');
  }
  // if (oldVersion < 2) { /* migration v2 */ }
}
```

### 7.4 Binding ports → adapters (app.config.ts)

```typescript
// app.config.ts

/**
 * Configuration principale de l'application Angular.
 *
 * @remarks
 * C'est l'unique endroit où les ports (interfaces Domain) sont liés
 * aux adapters (Infrastructure). Changer de provider IA ou de stockage
 * se fait ici uniquement — aucun autre fichier n'est modifié.
 *
 * Factory pattern : AnthropicAdapter si clé API présente, NullAIAdapter sinon.
 * La décision est prise à l'exécution, pas à la compilation.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),

    { provide: STORAGE_PORT, useClass: IndexedDBAdapter },

    // Factory IA : Anthropic si clé configurée, Null sinon
    {
      provide: MEAL_ANALYSIS_PORT,
      useFactory: (settings: LocalSettingsAdapter, http: HttpClient) =>
        settings.getApiKey()
          ? new AnthropicAdapter(http, settings)
          : new NullAIAdapter(),
      deps: [LocalSettingsAdapter, HttpClient]
    },
    // Même pattern pour NOTE_TAGGING_PORT, ANALYSIS_PORT, REPORT_PORT, COACH_PORT

    // Initialisation IndexedDB avant le premier rendu
    {
      provide: APP_INITIALIZER,
      useFactory: (storage: IndexedDBAdapter) => () => storage.init(),
      deps: [IndexedDBAdapter],
      multi: true
    }
  ]
};
```

---

## 8. Couche Presentation

Les composants Angular ne connaissent que les use cases. Jamais les adapters, jamais les repositories.

```typescript
// presentation/features/journal/meal-entry/meal-entry.component.ts

/**
 * Composant de saisie d'un repas — orchestre les 4 modes de saisie.
 *
 * @remarks
 * Single Responsibility : gère la saisie et la validation côté utilisateur.
 * La persistance et l'analyse IA sont déléguées aux use cases.
 *
 * Ne dépend d'aucun adapter Infrastructure — uniquement des use cases
 * de la couche Application. Testable sans mock réseau ou IndexedDB.
 */
@Component({
  selector: 'app-meal-entry',
  standalone: true,
  imports: [/* Material + shared components */],
  templateUrl: './meal-entry.component.html',
})
export class MealEntryComponent {

  protected inputMode: MealInputMode = 'text';
  protected proposedItems: FoodItemVO[] = [];
  protected isAnalyzing = false;
  protected aiUnavailable = false; // affiché à l'utilisateur si IA indisponible

  constructor(
    private readonly addMeal: AddMealUseCase,
    private readonly analyzeMealPhoto: AnalyzeMealPhotoUseCase,
    private readonly extractMealFromText: ExtractMealFromTextUseCase,
  ) {}

  /**
   * Déclenche l'analyse IA d'une photo de repas.
   * En mode dégradé (IA indisponible), proposedItems est vide
   * et aiUnavailable passe à true pour informer l'utilisateur.
   *
   * @param imageData - Image sélectionnée via input[type=file]
   */
  async onPhotoSelected(imageData: { base64: string; mediaType: string }): Promise<void> {
    this.isAnalyzing = true;
    this.proposedItems = await this.analyzeMealPhoto.execute(
      imageData.base64,
      imageData.mediaType
    );
    this.aiUnavailable = this.proposedItems.length === 0;
    this.isAnalyzing = false;
  }

  /**
   * Persiste le repas après validation explicite de l'utilisateur.
   *
   * @param confirmedItems - Aliments validés ou corrigés par l'utilisateur
   */
  async onConfirm(confirmedItems: FoodItemVO[]): Promise<void> {
    await this.addMeal.execute({
      mealType: 'lunch',
      mealTime: new Date(),
      inputMode: this.inputMode,
      items: confirmedItems,
      aiAnalyzed: !this.aiUnavailable && confirmedItems.length > 0,
    });
  }
}
```

### 8.1 Routing (lazy loading)

```typescript
// app.routes.ts

/**
 * Routes racine de l'application — tous les modules sont lazy loaded.
 *
 * @remarks
 * Le lazy loading réduit le bundle initial, critique pour le chargement
 * mobile sur réseau faible.
 *
 * Le guard api-key protège uniquement le module Coach — les autres modules
 * fonctionnent sans clé API (mode dégradé IA).
 */
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'journal', pathMatch: 'full' },
      {
        path: 'journal',
        loadChildren: () => import('./presentation/features/journal/journal.routes')
          .then(m => m.JOURNAL_ROUTES)
      },
      {
        path: 'analysis',
        loadChildren: () => import('./presentation/features/analysis/analysis.routes')
          .then(m => m.ANALYSIS_ROUTES)
      },
      {
        path: 'report',
        loadChildren: () => import('./presentation/features/report/report.routes')
          .then(m => m.REPORT_ROUTES)
      },
      {
        path: 'coach',
        loadChildren: () => import('./presentation/features/coach/coach.routes')
          .then(m => m.COACH_ROUTES),
        canActivate: [apiKeyGuard]
      },
      {
        path: 'settings',
        loadChildren: () => import('./presentation/features/settings/settings.routes')
          .then(m => m.SETTINGS_ROUTES)
      }
    ]
  }
];
```

---

## 9. Navigation responsive

```typescript
// presentation/layout/shell/shell.component.ts

/**
 * Composant shell — adapte la navigation selon la taille d'écran.
 *
 * @remarks
 * Mobile (< 768px)  : BottomNavComponent — pattern standard iOS/Android
 * Desktop (≥ 768px) : SideNavComponent — navigation latérale fixe
 *
 * BreakpointObserver (Angular CDK) évite les media queries CSS fragiles
 * et garantit la cohérence entre template et logique TypeScript.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  template: `
    <app-side-nav   *ngIf="isDesktop$ | async" />
    <main [class.with-bottom-nav]="!(isDesktop$ | async)">
      <router-outlet />
    </main>
    <app-bottom-nav *ngIf="!(isDesktop$ | async)" />
  `
})
export class ShellComponent {
  protected readonly isDesktop$ = this.breakpointObserver
    .observe('(min-width: 768px)')
    .pipe(map(r => r.matches));

  constructor(private readonly breakpointObserver: BreakpointObserver) {}
}
```

---

## 10. Thème et styles

```scss
// styles/_theme.scss
// Thème Angular Material — FlowEase
//
// Primaire  : vert médical (#0F6E56 → teal-700)
// Secondaire: ambre       (#EF9F27 → amber-600)
// Density -1 : composants compacts — mieux adaptés au mobile
// Dark mode : automatique via prefers-color-scheme

@use '@angular/material' as mat;

$primary : mat.define-palette(mat.$teal-palette,  700);
$accent  : mat.define-palette(mat.$amber-palette, 600);
$warn    : mat.define-palette(mat.$red-palette);

$light-theme: mat.define-light-theme((
  color:      (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.define-typography-config(),
  density:    -1,
));

@include mat.all-component-themes($light-theme);

@media (prefers-color-scheme: dark) {
  $dark-theme: mat.define-dark-theme((
    color: (primary: $primary, accent: $accent, warn: $warn),
  ));
  @include mat.all-component-colors($dark-theme);
}
```

---

## 11. Internationalisation

- Outil : `@angular/localize` (natif Angular, pas de dépendance externe)
- Langues v1 : Français (`fr`) + Anglais (`en`)
- Fichiers : `assets/i18n/fr.json` et `assets/i18n/en.json`
- Persistance : langue choisie stockée dans `localStorage` via `LocalSettingsAdapter`
- Les prompts Claude sont également traduits — un fichier de prompt par langue

---

## 12. Stratégie de tests

### 12.1 Stack

| Outil | Usage | Intégration |
|---|---|---|
| **Vitest** | Runner universel (unitaires + composants) | Natif Angular 21 — zéro configuration |
| **TestBed** | Tests de composants Angular | Standard Angular |
| **Playwright** | E2E — journal uniquement | CI GitHub Actions |
| **fake-indexeddb** | IndexedDB en mémoire pour les tests d'intégration | npm, aucun navigateur requis |

### 12.2 Pyramide de tests

```
         ▲  E2E (Playwright)
        ▲▲  Quelques parcours critiques — journal uniquement
       ▲▲▲  Tests de composants (TestBed)
      ▲▲▲▲  Tests d'intégration (adapters)
    ▲▲▲▲▲▲  Tests unitaires (domain + use cases)   ← majorité
```

**Règle** : plus on descend dans la pyramide, plus les tests sont nombreux, rapides et stables. Les E2E sont peu nombreux et couvrent uniquement les parcours utilisateur irremplaçables.

---

### 12.3 Tests unitaires — Domain

Les entités et value objects sont des fonctions pures et des interfaces TypeScript. Les tests sont triviaux — **zéro mock, zéro setup**.

```typescript
// domain/value-objects/fodmap-level.vo.spec.ts

/**
 * Tests des fonctions pures du value object FodmapLevel.
 * Aucun mock, aucune dépendance — exécution instantanée.
 */
describe('FodmapLevel value object', () => {

  describe('isFodmapDangerous', () => {
    it('retourne true uniquement pour le niveau high', () => {
      expect(isFodmapDangerous('high')).toBe(true);
    });

    it('retourne false pour low, medium et unknown', () => {
      expect(isFodmapDangerous('low')).toBe(false);
      expect(isFodmapDangerous('medium')).toBe(false);
      expect(isFodmapDangerous('unknown')).toBe(false);
    });
  });

  describe('fodmapRank', () => {
    it('respecte l\'ordre de sévérité low < medium < high', () => {
      expect(fodmapRank('low')).toBeLessThan(fodmapRank('medium'));
      expect(fodmapRank('medium')).toBeLessThan(fodmapRank('high'));
    });

    it('retourne -1 pour unknown (non classable)', () => {
      expect(fodmapRank('unknown')).toBe(-1);
    });
  });
});
```

---

### 12.4 Tests unitaires — Use cases (Application)

Les use cases sont testés avec des **doubles injectés via InjectionToken** — jamais les adapters réels. `NullAIAdapter` est utilisé pour le mode dégradé sans aucune configuration supplémentaire.

```typescript
// application/journal/analyze-meal-photo.usecase.spec.ts

describe('AnalyzeMealPhotoUseCase', () => {

  describe('avec IA disponible (AnthropicAdapter mocké)', () => {
    let useCase: AnalyzeMealPhotoUseCase;
    let mockPort: jasmine.SpyObj<MealAnalysisPort>;

    beforeEach(() => {
      mockPort = jasmine.createSpyObj('MealAnalysisPort', ['analyzeMealPhoto']);

      TestBed.configureTestingModule({
        providers: [
          AnalyzeMealPhotoUseCase,
          { provide: MEAL_ANALYSIS_PORT, useValue: mockPort }
        ]
      });
      useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
    });

    it('retourne les aliments identifiés par l\'IA', async () => {
      const items: FoodItemVO[] = [
        { name: 'Riz blanc', fodmapLevel: 'low', confirmed: false }
      ];
      mockPort.analyzeMealPhoto.and.resolveTo(items);

      const result = await useCase.execute('base64...', 'image/jpeg');

      expect(result).toEqual(items);
    });
  });

  describe('en mode dégradé (NullAIAdapter)', () => {
    let useCase: AnalyzeMealPhotoUseCase;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          AnalyzeMealPhotoUseCase,
          { provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }
        ]
      });
      useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
    });

    it('retourne un tableau vide sans lever d\'exception', async () => {
      const result = await useCase.execute('base64...', 'image/jpeg');

      expect(result).toEqual([]);
    });

    it('ne bloque pas l\'utilisateur quand l\'IA est indisponible', async () => {
      await expectAsync(useCase.execute('base64...', 'image/jpeg'))
        .toBeResolved();
    });
  });
});
```

```typescript
// application/journal/add-meal.usecase.spec.ts

describe('AddMealUseCase', () => {
  let useCase: AddMealUseCase;
  let mockRepository: jasmine.SpyObj<MealRepository>;

  beforeEach(() => {
    mockRepository = jasmine.createSpyObj('MealRepository', ['save']);
    mockRepository.save.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        AddMealUseCase,
        { provide: STORAGE_PORT, useValue: mockRepository }
      ]
    });
    useCase = TestBed.inject(AddMealUseCase);
  });

  it('assigne un UUID v4 et un timestamp à l\'entité persistée', async () => {
    const result = await useCase.execute({
      mealType: 'lunch', mealTime: new Date(),
      inputMode: 'text', items: [], aiAnalyzed: false
    });

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('propage l\'erreur si le stockage échoue', async () => {
    mockRepository.save.and.rejectWith(new Error('StorageError'));

    await expectAsync(useCase.execute({
      mealType: 'lunch', mealTime: new Date(),
      inputMode: 'text', items: [], aiAnalyzed: false
    })).toBeRejectedWithError('StorageError');
  });
});
```

---

### 12.5 Tests d'intégration — Adapters (Infrastructure)

#### IndexedDBAdapter — fake-indexeddb

`fake-indexeddb` émule IndexedDB en mémoire sans navigateur. Les tests s'exécutent dans Vitest (Node) avec la vraie logique de l'adapter.

```typescript
// infrastructure/storage/indexeddb.adapter.spec.ts
import 'fake-indexeddb/auto'; // remplace l'API IndexedDB globale

/**
 * Tests d'intégration de IndexedDBAdapter.
 * Utilise fake-indexeddb — aucun navigateur requis, exécution en Node via Vitest.
 * La base est réinitialisée avant chaque test (isolation garantie).
 */
describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    // Réinitialise la base en mémoire
    indexedDB = new IDBFactory();
    adapter = new IndexedDBAdapter();
    await adapter.init();
  });

  describe('save + getById', () => {
    it('persiste et retrouve un repas par son id', async () => {
      const meal: MealEntity = {
        id: crypto.randomUUID(), timestamp: new Date(),
        mealTime: new Date(), mealType: 'lunch',
        inputMode: 'text', items: [], aiAnalyzed: false
      };

      await adapter.save(STORES.MEALS, meal);
      const retrieved = await adapter.getById<MealEntity>(STORES.MEALS, meal.id);

      expect(retrieved).toEqual(meal);
    });
  });

  describe('getRange', () => {
    it('retourne uniquement les entrées dans la plage de dates demandée', async () => {
      // setup : 3 repas à des dates différentes
      // assert : seul le repas dans la plage est retourné
    });
  });

  describe('migration de schéma', () => {
    it('initialise tous les stores attendus lors de la première ouverture', async () => {
      const storeNames = Object.values(STORES);
      // vérifier que chaque store existe dans la base
    });
  });
});
```

#### AnthropicAdapter — HttpClientTestingModule

```typescript
// infrastructure/ai/anthropic/anthropic.adapter.spec.ts

/**
 * Tests d'intégration de AnthropicAdapter.
 * HttpClientTestingModule intercepte les appels HTTP — aucun réseau réel.
 * Vérifie que les payloads envoyés et les réponses parsées sont conformes.
 */
describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let httpTesting: HttpTestingController;
  let mockSettings: jasmine.SpyObj<LocalSettingsAdapter>;

  beforeEach(() => {
    mockSettings = jasmine.createSpyObj('LocalSettingsAdapter', ['getApiKey']);
    mockSettings.getApiKey.and.returnValue('test-api-key');

    TestBed.configureTestingModule({
      providers: [
        AnthropicAdapter,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalSettingsAdapter, useValue: mockSettings }
      ]
    });
    adapter    = TestBed.inject(AnthropicAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify()); // aucun appel non intercepté

  describe('analyzeMealPhoto', () => {
    it('envoie la clé API dans le header x-api-key', async () => {
      const promise = adapter.analyzeMealPhoto('base64data', 'image/jpeg');

      const req = httpTesting.expectOne('https://api.anthropic.com/v1/messages');
      expect(req.request.headers.get('x-api-key')).toBe('test-api-key');
      req.flush({ content: [{ text: JSON.stringify({ items: [] }) }] });

      await promise;
    });

    it('retourne null si aucune clé API n\'est configurée', async () => {
      mockSettings.getApiKey.and.returnValue(null);

      const result = await adapter.analyzeMealPhoto('base64data', 'image/jpeg');

      expect(result).toBeNull();
      httpTesting.expectNone('https://api.anthropic.com/v1/messages');
    });

    it('retourne null en cas d\'erreur réseau (mode dégradé)', async () => {
      const promise = adapter.analyzeMealPhoto('base64data', 'image/jpeg');

      const req = httpTesting.expectOne('https://api.anthropic.com/v1/messages');
      req.error(new ProgressEvent('error'));

      const result = await promise;
      expect(result).toBeNull();
    });

    it('retourne un tableau vide si la réponse JSON est invalide', async () => {
      const promise = adapter.analyzeMealPhoto('base64data', 'image/jpeg');

      const req = httpTesting.expectOne('https://api.anthropic.com/v1/messages');
      req.flush({ content: [{ text: 'JSON invalide {{{' }] });

      const result = await promise;
      expect(result).toEqual([]);
    });
  });
});
```

---

### 12.6 Tests de composants — Presentation (TestBed)

Les composants sont testés avec TestBed. Les use cases sont mockés — jamais les adapters infrastructure.

```typescript
// presentation/features/journal/meal-entry/meal-entry.component.spec.ts

/**
 * Tests du composant MealEntryComponent.
 * Les use cases sont mockés via jasmine.createSpyObj —
 * le composant ne connaît pas les adapters Infrastructure.
 */
describe('MealEntryComponent', () => {
  let fixture: ComponentFixture<MealEntryComponent>;
  let component: MealEntryComponent;
  let mockAddMeal: jasmine.SpyObj<AddMealUseCase>;
  let mockAnalyzePhoto: jasmine.SpyObj<AnalyzeMealPhotoUseCase>;

  beforeEach(async () => {
    mockAddMeal     = jasmine.createSpyObj('AddMealUseCase', ['execute']);
    mockAnalyzePhoto = jasmine.createSpyObj('AnalyzeMealPhotoUseCase', ['execute']);
    mockAddMeal.execute.and.resolveTo({ id: 'uuid', timestamp: new Date() } as any);

    await TestBed.configureTestingModule({
      imports: [MealEntryComponent],
      providers: [
        { provide: AddMealUseCase,          useValue: mockAddMeal },
        { provide: AnalyzeMealPhotoUseCase, useValue: mockAnalyzePhoto }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(MealEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('mode photo — IA disponible', () => {
    it('affiche les aliments proposés par l\'IA après analyse', async () => {
      const items: FoodItemVO[] = [{ name: 'Poulet', fodmapLevel: 'low', confirmed: false }];
      mockAnalyzePhoto.execute.and.resolveTo(items);

      await component.onPhotoSelected({ base64: 'data', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const chips = fixture.debugElement.queryAll(By.css('app-food-chip'));
      expect(chips.length).toBe(1);
    });
  });

  describe('mode photo — IA indisponible', () => {
    it('affiche un message d\'information sans bloquer la saisie', async () => {
      mockAnalyzePhoto.execute.and.resolveTo([]);

      await component.onPhotoSelected({ base64: 'data', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const banner = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(banner).toBeTruthy();
    });

    it('permet quand même de valider un repas vide ou saisi manuellement', async () => {
      mockAnalyzePhoto.execute.and.resolveTo([]);
      await component.onPhotoSelected({ base64: 'data', mediaType: 'image/jpeg' });

      await component.onConfirm([]);

      expect(mockAddMeal.execute).toHaveBeenCalled();
    });
  });
});
```

---

### 12.7 Tests E2E — Playwright (journal uniquement)

**Périmètre** : les 4 modes de saisie d'un repas. C'est la fonctionnalité critique de l'app — une régression ici bloque l'adoption.

**Convention** : les tests E2E ne testent jamais l'IA réelle — l'app est lancée avec `NullAIAdapter` forcé via une variable d'environnement.

```typescript
// e2e/journal/meal-entry.spec.ts

/**
 * Tests E2E du parcours de saisie d'un repas.
 * L'app est démarrée avec NullAIAdapter (FLOWEASE_AI_MODE=null)
 * pour éviter les appels réseau réels et les coûts de tokens.
 */
test.describe('Saisie d\'un repas — Journal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/journal');
  });

  test('saisie en mode texte — repas persisté et visible dans le journal', async ({ page }) => {
    await page.getByRole('button', { name: /ajouter un repas/i }).click();
    await page.getByRole('button', { name: /texte/i }).click();
    await page.getByRole('textbox').fill('riz blanc, poulet grillé, courgettes');
    await page.getByRole('button', { name: /valider/i }).click();

    await expect(page.getByText('riz blanc')).toBeVisible();
  });

  test('saisie vocale — transcription visible et éditable avant validation', async ({ page }) => {
    // Note : Web Speech API est mockée dans Playwright via page.exposeFunction
    await page.getByRole('button', { name: /ajouter un repas/i }).click();
    await page.getByRole('button', { name: /vocal/i }).click();

    // Simule une transcription vocale
    await page.evaluate(() => {
      (window as any).__mockSpeechResult('poulet rôti avec haricots verts');
    });

    await expect(page.getByRole('textbox')).toHaveValue('poulet rôti avec haricots verts');
  });

  test('mode photo désactivé hors ligne', async ({ page, context }) => {
    await context.setOffline(true);
    await page.getByRole('button', { name: /ajouter un repas/i }).click();

    const photoButton = page.getByRole('button', { name: /photo/i });
    await expect(photoButton).toBeDisabled();

    await context.setOffline(false);
  });

  test('saisie depuis les aliments récurrents — tap unique suffit', async ({ page }) => {
    // Pré-condition : historique avec "riz blanc" (seedé en IndexedDB)
    await page.getByRole('button', { name: /ajouter un repas/i }).click();
    await page.getByRole('button', { name: /récurrents/i }).click();

    await page.getByText('riz blanc').click(); // tap unique
    await page.getByRole('button', { name: /valider/i }).click();

    await expect(page.getByText('riz blanc')).toBeVisible();
  });

  test('saisie rétrospective — l\'heure du repas est modifiable', async ({ page }) => {
    await page.getByRole('button', { name: /ajouter un repas/i }).click();
    await page.getByRole('button', { name: /modifier l\'heure/i }).click();
    await page.getByLabel(/heure du repas/i).fill('12:30');
    await page.getByRole('button', { name: /valider/i }).click();

    await expect(page.getByText('12:30')).toBeVisible();
  });
});
```

---

### 12.8 Configuration Vitest (Angular 21)

Angular 21 intègre Vitest nativement via `@angular/build:vitest`. Configuration dans `angular.json` :

```json
{
  "test": {
    "builder": "@angular/build:vitest",
    "options": {
      "include": ["src/**/*.spec.ts"],
      "exclude": ["e2e/**"],
      "coverage": {
        "enabled": true,
        "provider": "v8",
        "reporter": ["text", "lcov"],
        "thresholds": {
          "domain":      { "lines": 100 },
          "application": { "lines": 90  },
          "infrastructure": { "lines": 80 },
          "presentation":   { "lines": 70 }
        }
      }
    }
  }
}
```

### 12.9 Configuration Playwright

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4200',
    // NullAIAdapter forcé via variable d'env lue dans app.config.ts
    extraHTTPHeaders: {},
  },
  webServer: {
    command: 'FLOWEASE_AI_MODE=null ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 14'] } },
  ]
});
```

**Pourquoi mobile uniquement en E2E** : l'app est principalement utilisée sur smartphone. Les projets Playwright ciblent Pixel 7 et iPhone 14 — les deux plateformes les plus représentatives.

---

### 12.10 Couverture cible et règles CI

| Couche | Cible lignes | Justification |
|---|---|---|
| Domain | 100% | Fonctions pures — trivial à couvrir entièrement |
| Application | 90% | Use cases critiques — nominal + mode dégradé obligatoires |
| Infrastructure | 80% | Adapters — nominal + erreurs réseau + JSON invalide |
| Presentation | 70% | Composants — interactions principales + mode dégradé IA |

**Pipeline CI** (`deploy.yml`) — ordre d'exécution :

```
1. npm ci
2. ng test (Vitest) — bloquant si < seuils de couverture
3. npx playwright test — bloquant si E2E échoue
4. ng build --configuration production
5. Déploiement GitHub Pages
```

Un build ne se déploie jamais avec des tests en échec ou une couverture insuffisante.

---

## 13. Déploiement GitHub Pages

```bash
# Build production
ng build --configuration production --base-href /flowease/

# Déploiement manuel
npx angular-cli-ghpages --dir=dist/flowease/browser
```

```yaml
# .github/workflows/deploy.yml
name: Deploy FlowEase

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --watch=false --browsers=ChromeHeadless  # bloquant
      - run: npm run build -- --base-href /flowease/
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/flowease/browser
```

---

## 14. Ordre de développement

| Phase | Contenu | Livrable testable |
|---|---|---|
| **1 — Socle** | Structure couches, tokens DI, NullAIAdapter, IndexedDBAdapter, thème, navigation responsive | App vide navigable, storage fonctionnel |
| **2 — Domain + Application** | Entités, value objects, ports, use cases (sans IA) | Use cases testables unitairement avec NullAIAdapter |
| **3 — Journal offline** | Saisie repas (texte + vocal + récurrents), symptômes, prises, notes | Journal 100% fonctionnel offline |
| **4 — IA saisie** | AnthropicAdapter, analyse photo, extraction texte, tagging | 4 modes de saisie repas complets |
| **5 — Analyse** | Graphiques Chart.js, heatmap bien-être, analyse IA | Module 2 complet |
| **6 — Rapport** | Génération PDF/texte (jsPDF), synthèse IA optionnelle | Module 3 complet |
| **7 — Coach** | Chat IA streaming, sessions, résumés inter-sessions | Module 4 complet |
| **8 — Paramètres** | Tous les écrans, export/import JSON, i18n FR+EN | Module 5 + i18n complets |
| **9 — Polish** | Rappels (Web Notifications), tests de couverture, audit accessibilité | Production-ready |

---

## 15. Composants Claude pour la maintenabilité

### 15.1 Projet Claude — "FlowEase Dev"

**Type** : Projet Claude (claude.ai) avec knowledge base  
**Contenu** : `flowease-specs.md` + `flowease-architecture.md` uploadés dans le projet

**Usage** : toutes les sessions de développement (questions d'architecture, génération de code, revues) se font dans ce projet. Claude connaît les specs et l'architecture à chaque conversation.

**Bénéfice** : cohérence garantie — Claude ne réinvente pas l'architecture d'une session à l'autre.

---

### 15.2 Fichier CLAUDE.md — Agent Claude Code

**Type** : Fichier lu automatiquement par Claude Code à chaque session  
**Emplacement** : racine du projet

```markdown
# FlowEase — Instructions pour Claude Code

## Architecture — règles absolues
Ce projet suit une Clean Architecture à 4 couches strictement séparées :
- domain/      : entités et interfaces — zéro import Angular ou externe
- application/ : use cases — importent uniquement depuis domain/
- infrastructure/ : adapters — implémentent les interfaces de domain/
- presentation/ : composants Angular — importent uniquement depuis application/

## Règles non négociables
1. Jamais d'import Angular dans domain/ (pas de @Injectable, HttpClient, etc.)
2. Jamais d'import d'adapter concret dans application/ ou presentation/
3. Jamais d'appel HTTP direct dans un composant ou un use case
4. Tout nouveau port IA doit avoir un NullAIAdapter correspondant mis à jour
5. Toute méthode publique doit avoir sa JSDoc complète (@param, @returns, @remarks)
6. Toute violation connue d'un principe SOLID doit être documentée dans @remarks

## Mode dégradé (sans IA) — obligatoire
Chaque use case utilisant un port IA doit fonctionner si le port retourne null.
Ne jamais throw si l'IA est indisponible — retourner un état vide ou dégradé.
Le composant affiche un message informatif, pas une erreur bloquante.

## Sécurité clé API
La clé API Anthropic est lue uniquement depuis localStorage via LocalSettingsAdapter.
Elle ne doit jamais apparaître dans :
- Le code source ou les fichiers environment
- Les logs console (même en dev)
- Les messages d'erreur propagés vers le template

## Avant de créer un fichier
- domain/         → interface TypeScript pure ou value object (fonctions pures)
- application/    → @Injectable({ providedIn: 'root' }) + use case unique
- infrastructure/ → classe implémentant une interface de domain/
- presentation/   → composant Angular standalone

## Tests attendus
Chaque use case doit avoir un fichier .spec.ts couvrant :
- Le comportement nominal (AnthropicAdapter mocké)
- Le mode dégradé (NullAIAdapter injecté)
- Les cas d'erreur (storage error, réseau indisponible)
```

---

### 15.3 Prompt de revue CLEAN / SOLID

**Déclenchement recommandé** : avant chaque merge sur `main`

```
Tu es un expert en Clean Architecture et principes SOLID appliqués à Angular.

Architecture de référence du projet : [voir flowease-architecture.md]

Analyse le code suivant et signale chaque violation avec fichier, ligne et principe violé.

CLEAN Architecture :
□ domain/ ne contient aucun import Angular ou externe
□ Les use cases importent uniquement depuis domain/ (jamais infrastructure/)
□ Les composants importent uniquement depuis application/ (jamais infrastructure/)
□ Les adapters implémentent les interfaces de domain/ sans les modifier

SOLID :
□ S : chaque classe/use case a une seule raison de changer
□ O : ajouter un comportement crée un nouveau fichier, pas une modification
□ L : NullAIAdapter est substituable à AnthropicAdapter sans impact sur les use cases
□ I : les ports IA sont bien séparés (MealAnalysisPort ≠ CoachPort ≠ AnalysisPort)
□ D : les use cases dépendent d'InjectionToken, jamais des classes concrètes

Mode dégradé :
□ Chaque use case IA gère explicitement le retour null du port
□ Aucun use case IA ne throw si l'IA est indisponible

JSDoc :
□ Chaque classe publique a @remarks expliquant son rôle architectural
□ Chaque méthode publique a @param et @returns
□ Les violations connues sont documentées avec justification

Pour chaque violation : principe violé → problème → correction proposée.

Code à analyser :
[COLLER ICI]
```

---

### 15.4 Prompt de revue sécurité

**Déclenchement recommandé** : tout changement touchant la clé API, le stockage ou les appels réseau

```
Tu es un expert en sécurité des SPA web côté client.

Contexte : FlowEase est une SPA Angular sur GitHub Pages sans backend.
Elle stocke une clé API Anthropic dans localStorage et des données médicales
personnelles dans IndexedDB.

Vérifie les risques suivants :

Clé API Anthropic :
□ Absente du code source, des fichiers environment et des bundles compilés
□ Lue uniquement depuis localStorage au moment de l'appel HTTP
□ Jamais loguée (console, Sentry, etc.), même en développement
□ Envoyée uniquement vers api.anthropic.com (pas d'autre endpoint)
□ Non exposée dans les messages d'erreur propagés au template

Données médicales (IndexedDB) :
□ Aucune donnée médicale envoyée à un service tiers non consenti
□ Aucune donnée sensible dans les query params ou le hash d'URL
□ Aucun console.log contenant des données médicales en production

Appels réseau :
□ Tous les appels externes vont vers api.anthropic.com uniquement
□ Les erreurs réseau sont capturées sans faire fuiter la clé

Code à analyser :
[COLLER ICI]
```

---

### 15.5 Prompt de génération de tests

**Déclenchement recommandé** : après l'écriture d'un use case ou d'un adapter

```
Tu es un expert en tests unitaires Angular (Jasmine + Angular Testing Library).

Conventions du projet FlowEase :
- Les ports IA sont injectés via InjectionToken (MEAL_ANALYSIS_PORT, COACH_PORT, etc.)
- NullAIAdapter retourne null sur toutes ses méthodes (mode sans IA)
- Les tests unitaires ne font jamais d'appels réseau réels
- Les tests unitaires n'accèdent jamais à IndexedDB réel

Génère les tests couvrant :
1. Comportement nominal — mock AnthropicAdapter retournant des données valides
2. Mode dégradé — NullAIAdapter injecté (retourne null) → résultat vide attendu
3. Erreur de stockage — StorageRepository mock qui rejette
4. Invariants du domaine si applicable

Format :
- describe() = nom de la classe testée
- it() = comportement attendu en langage naturel (pas le nom de méthode)
- Utilise TestBed avec standalone: true
- Injecte les ports via leurs InjectionToken

Code à tester :
[COLLER ICI]
```

---

### 15.6 Prompt de revue accessibilité mobile

**Déclenchement recommandé** : après l'écriture d'un composant de saisie

```
Tu es un expert en accessibilité web (WCAG 2.1 AA) et UX mobile.

Contexte : FlowEase est utilisée sur smartphone par une personne pouvant être
en état de douleur ou de fatigue. La friction doit être minimale absolue.

Vérifie le template Angular suivant :

Accessibilité :
□ Tous les éléments interactifs ont aria-label explicite
□ Les curseurs mat-slider ont aria-valuemin, aria-valuemax, aria-valuenow
□ Les SVG fonctionnels ont role="img" et aria-label
□ Le focus est géré (tabindex, focus trap si dialog)
□ Contraste texte ≥ 4.5:1

UX état de douleur / fatigue :
□ Zones tappables ≥ 44×44px (recommandation Apple/Google)
□ Action principale accessible en 1 tap (pas 3 clics)
□ Aucun champ obligatoire ne bloque la sauvegarde
□ Libellés courts, langage courant (pas de jargon médical)
□ Feedback visuel immédiat après chaque action
□ Mode dégradé IA visible mais non bloquant

Template à analyser :
[COLLER ICI]
```

---

### Récapitulatif des composants Claude

| Composant | Type | Déclenchement | Bénéfice |
|---|---|---|---|
| Projet "FlowEase Dev" | Projet Claude + knowledge | Toutes les sessions dev | Cohérence architecturale persistante |
| CLAUDE.md | Fichier racine (Claude Code) | Toute session Claude Code | Implémentation conforme à l'architecture |
| Revue CLEAN/SOLID | Prompt réutilisable | Avant merge main | Intégrité architecture |
| Revue sécurité | Prompt réutilisable | Changements API/storage | Protection clé API + données médicales |
| Génération de tests | Prompt réutilisable | Après use case/adapter | Couverture systématique + mode dégradé |
| Revue accessibilité | Prompt réutilisable | Après composant de saisie | UX état de douleur garanti |
