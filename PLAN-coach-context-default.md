# Plan — Coach : utiliser le contexte par défaut sans modale forcée

## Problème
Quand l'utilisateur va sur `/coach`, un bottom sheet s'ouvre **automatiquement** et **oblige** à choisir une fenêtre de contexte, même si un paramètre par défaut a été configuré dans Paramètres > Préférences Coach. La valeur par défaut est ignorée.

## Comportement cible
1. Ouvrir `/coach` → la session démarre **silencieusement** avec la fenêtre par défaut des paramètres.
2. Un chip dans l'en-tête affiche le contexte actif (ex : *"Contexte : 14 derniers jours"*).
3. Un bouton "Modifier" permet d'ouvrir le picker **volontairement**.
4. Quand le picker s'ouvre, la valeur par défaut des paramètres est **pré-sélectionnée**.
5. Fermer le picker sans choisir ne change rien au contexte actif.
   Ok   
---

## Tâches

### 1. `CoachChatComponent` — Auto-démarrage avec le contexte par défaut
- [x] Dans `ngOnInit()`, lire `LOCAL_SETTINGS_PORT.getDefaultContextWindow()`
- [x] Appeler `StartCoachSessionUseCase.execute(defaultWindow)` directement, sans ouvrir le bottom sheet
- [x] Supprimer l'appel automatique à `openContextPicker()` au démarrage
- [x] Stocker la fenêtre active dans un signal `activeContextWindow`

### 2. `CoachChatComponent` — Indicateur de contexte actif + bouton "Modifier"
- [x] Ajouter un chip/badge dans l'en-tête affichant le label de la fenêtre active
- [x] Ajouter un bouton "Modifier" (icône crayon) avec `aria-label="Modifier le contexte — <label>"`
- [x] Zone tappable du bouton ≥ 44×44px (min-height: 28px + padding, cible englobante)
- [x] Le clic sur "Modifier" appelle `openContextPicker()`
- [x] `openContextPicker()` passe la fenêtre active en data d'entrée au bottom sheet

### 3. `CoachContextPickerComponent` — Fermeture optionnelle + pré-sélection
- [x] Passer `disableClose` de `true` à `false` (côté appelant CoachChatComponent)
- [x] Accepter une `data` d'entrée `{ currentWindow: CoachContextWindow }` depuis `MAT_BOTTOM_SHEET_DATA`
- [x] À l'ouverture, pré-sélectionner visuellement l'option correspondant à `currentWindow` (badge "Actif" + classe CSS)
- [x] Distinguer visuellement "Actif" (session en cours) du badge "Défaut" (paramètre settings)
- [x] Dans `CoachChatComponent.afterDismissed()` : ignorer un résultat `null` (fermeture sans choix)

### 4. Tests unitaires — `CoachChatComponent`
- [x] `ngOnInit()` appelle `StartCoachSessionUseCase` avec la valeur de `getDefaultContextWindow()`
- [x] Le bottom sheet **n'est pas** ouvert au démarrage
- [x] Le chip affiche le label de la fenêtre active
- [x] `openContextPicker()` ouvre le bottom sheet avec `currentWindow` en data et `disableClose: false`
- [x] `afterDismissed()` avec `null` ne change pas le contexte actif
- [x] `afterDismissed()` avec un nouveau contexte met à jour `activeContextWindow`
- [x] `onNewConversation()` démarre avec le contexte par défaut sans ouvrir le picker

### 5. Tests unitaires — `CoachContextPickerComponent`
- [x] L'option correspondant à `currentWindow` (data d'entrée) est pré-sélectionnée (badge "Actif" + classe)
- [x] Une option peut porter à la fois "Actif" et "Défaut" quand les deux coïncident
- [x] Cliquer une option appelle `StartCoachSessionUseCase` et ferme le sheet avec un résultat
- [x] Garde contre le double-clic (loading en cours)
- [x] Le badge "Défaut" apparaît sur l'option correspondant à `getDefaultContextWindow()`
- [x] Fallback sur défaut si `MAT_BOTTOM_SHEET_DATA` est null

### 6. Tests Playwright — Scénarios E2E
- [x] Ouvrir `/coach` → aucun bottom sheet ne s'ouvre, le chat est prêt
- [x] Le chip de contexte affiche la valeur par défaut configurée dans les paramètres
- [x] Cliquer "Modifier" → le bottom sheet s'ouvre avec la bonne option pré-sélectionnée
- [x] Fermer le bottom sheet (Échap ou clic extérieur) → le contexte actif ne change pas
- [x] Choisir une nouvelle fenêtre dans le picker → le chip du chat se met à jour
- [x] Bout-en-bout : configurer "7 derniers jours" via localStorage → aller sur `/coach` → contexte correct sans picker

---

## Fichiers concernés

| Fichier | Modification |
|---------|-------------|
| `presentation/features/coach/coach-chat/coach-chat.component.ts` | Auto-démarrage, signal contexte actif, bouton Modifier |
| `presentation/features/coach/coach-chat/coach-chat.component.html` | Chip contexte + bouton Modifier |
| `presentation/features/coach/coach-chat/coach-chat.component.scss` | Styles chip contexte |
| `presentation/features/coach/coach-context-picker/coach-context-picker.component.ts` | MAT_BOTTOM_SHEET_DATA, selectedKey, pré-sélection |
| `presentation/features/coach/coach-context-picker/coach-context-picker.component.html` | Badge "Actif" + badge "Défaut" distincts |
| `presentation/features/coach/coach-context-picker/coach-context-picker.component.scss` | Style badge "Actif" + classe `context-option--active` |
| `presentation/features/coach/coach-chat/coach-chat.component.spec.ts` | Tests unitaires mis à jour |
| `presentation/features/coach/coach-context-picker/coach-context-picker.component.spec.ts` | Tests unitaires (nouveau fichier) |
| `e2e/coach/coach-context-default.spec.ts` | Tests Playwright E2E (nouveau fichier) |

## Résultat tests unitaires
✅ 327 tests passent — 0 échec (`npx ng test --runner vitest --no-watch`)
