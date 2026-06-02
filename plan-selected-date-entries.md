# Plan — Correction : entrées créées sur la date sélectionnée du journal

**Date :** 2026-06-02  
**Priorité :** Critique — bug de cohérence données  
**Branche :** master

---

## Diagnostic du bug

### Cause racine

`JournalHomeComponent` maintient `currentDate` (la date affichée dans le journal), mais **ne la transmet pas** aux composants de saisie. Ceux-ci initialisent `occurredAt`/`confirmedAt` avec `new Date()` (aujourd'hui), quelle que soit la date sélectionnée.

### Fichiers incriminés

| Composant | Ligne | Code actuel (incorrect) |
|-----------|-------|-------------------------|
| `meal-entry.component.ts` | ~230 | `const occurredAt = new Date()` puis `setHours(...)` → base = aujourd'hui |
| `symptom-entry.component.ts` | ~250 | `now = new Date()` |
| `intake-entry.component.ts` | ~158–163 | `scheduledAt: new Date()` + `confirmedAt: new Date()` |
| `note-entry.component.ts` | ~136 | `occurredAt: new Date()` |

### Mécanisme correct attendu

```
JournalHomeComponent.currentDate  (ex: hier, 2026-06-01)
         │
         │  transmis via router state { journalDate }
         ▼
EntryComponent.journalDate  (2026-06-01 à minuit)
         │
         │  utilisé comme base de date — l'heure saisie par l'utilisateur est appliquée dessus
         ▼
occurredAt = journalDate + heure saisie (HH:mm)
```

---

## To-do list

### 1. Documentation specs

- [x] **`flowease-specs.md`** — Ajouter dans la section 1.2 (Principes UX) et 1.3.3 (Horodatage) la règle :
  > Toute entrée créée depuis le journal (repas, symptôme, prise, note) utilise la date actuellement sélectionnée dans le journal comme date de base. L'heure saisie par l'utilisateur est appliquée sur cette date, jamais sur la date du jour si une date antérieure est sélectionnée.

---

### 2. Couche présentation — transmission de la date

- [x] **`journal-home.component.ts`** — Modifier les 4 méthodes de navigation vers les formulaires de saisie pour inclure `{ state: { journalDate: this.currentDate.toISOString() } }` dans les extras du router.

- [x] **`meal-entry.component.ts`** — Lire `history.state.journalDate` à l'init. Substituer `new Date()` par `new Date(journalDate)` comme base de date pour `occurredAt`. L'heure `mealTime` (HH:mm) s'applique sur cette base.

- [x] **`symptom-entry.component.ts`** — Lire `history.state.journalDate` à l'init. Substituer `now = new Date()` par `now = new Date(journalDate)` — date de base pour `occurredAt`.

- [x] **`intake-entry.component.ts`** — Lire `history.state.journalDate` à l'init. Substituer `new Date()` par `new Date(journalDate)` pour `scheduledAt` et `confirmedAt` (quick confirm et confirm détaillé). Méthode privée `dateOnJournalDay()` : date du journal + heure courante.

- [x] **`note-entry.component.ts`** — Lire `history.state.journalDate` à l'init. Substituer `occurredAt: new Date()` par `occurredAt: new Date(journalDate)`. `openLinkSheet` utilise aussi `this.journalDate`.

---

### 3. Couche présentation — indicateur visuel (UX)

- [x] **`meal-entry.component.ts`**, **`symptom-entry.component.ts`**, **`intake-entry.component.ts`**, **`note-entry.component.ts`** — Bandeau `"Saisie pour le [date]"` (`data-testid="retrospective-banner"`) ajouté dans les 4 templates et 4 SCSS.

---

### 4. Tests unitaires (Vitest)

- [x] **`meal-entry.component.spec.ts`** — 5 cas ajoutés : occurredAt date correcte, isRetrospective vrai/faux, bandeau visible/absent.

- [x] **`symptom-entry.component.spec.ts`** — 5 cas ajoutés : occurredAt avant-hier, isRetrospective, bandeau.

- [x] **`intake-entry.component.spec.ts`** — 4 cas dans un nouveau describe top-level : confirmedAt/scheduledAt corrects, isRetrospective, bandeau.

- [x] **`note-entry.component.spec.ts`** — 5 cas ajoutés : occurredAt il y a 3 jours, isRetrospective, bandeau.

- [x] **`add-meal.usecase.spec.ts`**, **`add-symptom.usecase.spec.ts`**, **`confirm-intake.usecase.spec.ts`** — occurredAt/confirmedAt déjà testés ✅. **`add-note.usecase.spec.ts`** créé (10 cas dont preservation de occurredAt).

---

### 5. Tests E2E Playwright

- [x] **`e2e/journal/journal-date-selection.spec.ts`** (créé) — 6 scénarios :

  1. **Repas** : hier → meal visible hier + absent aujourd'hui (filtre par texte unique).
  2. **Symptôme** : hier → symptom-entry visible dans journal d'hier.
  3. **Prise (quick confirm)** : hier → intake-entry visible dans journal d'hier (avec seedIndexedDB).
  4. **Note** : hier → note visible hier + absente aujourd'hui (filtre par texte unique).
  5. **Bandeau visible** : prev-day → qc-meal-text → `retrospective-banner` visible + `"pour le"`.
  6. **Pas de bandeau** : aujourd'hui → qc-meal-text → `retrospective-banner` absent.

---

## Ordre d'exécution recommandé

```
1 → specs (documentation)
2 → journal-home.component.ts (transmission de la date)
3 → 4 composants de saisie (lecture + usage)
4 → bandeau UX
5 → tests unitaires (Vitest)
6 → tests E2E (Playwright)
7 → npm test → tout vert
```

---

## Fichiers impactés

```
flowease-specs.md                                             (doc)
src/app/presentation/features/journal/
  journal-home/journal-home.component.ts                     (transmission)
  meal-entry/meal-entry.component.ts                         (date base)
  symptom-entry/symptom-entry.component.ts                   (date base)
  intake-entry/intake-entry.component.ts                     (date base)
  note-entry/note-entry.component.ts                         (date base)
src/app/presentation/features/journal/
  meal-entry/meal-entry.component.spec.ts                    (tests)
  symptom-entry/symptom-entry.component.spec.ts              (tests)
  intake-entry/intake-entry.component.spec.ts                (tests)
  note-entry/note-entry.component.spec.ts                    (tests)
e2e/journal/journal-date-selection.spec.ts                   (E2E - nouveau)
```
