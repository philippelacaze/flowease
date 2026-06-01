# FlowEase — Audit des écarts fonctionnels

Ce fichier présent les écarts entre le code existant et les spécifications fonctionnelles de flowease-specs.md et des propositions pour y remédier ou pas. 

> **Caractère de validation (copier-coller) :** ☑

> **Mode de validation :**  
> Pour chaque écart, indique ta décision dans la colonne **Décision** :  
> - **VALIDER** → la correction sera implémentée  
> - **INVALIDER** → on garde l'existant et on met à jour `flowease-specs.md` en conséquence

---

## Module 1 — Journal quotidien

---

### Écart 1.1 · Selles : champs `blood`, `mucus`, `frequency` absents

| | |
|---|---|
| **Réf. spec** | §1.4.4 — Saisie du transit |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
La saisie du transit doit inclure, en plus du type Bristol (1-7) :
- **Fréquence** : nombre de selles depuis la dernière saisie
- **Présence de sang** (oui/non) — avec rappel d'en informer le médecin si oui
- **Présence de mucus** (oui/non)

**Ce qui est implémenté :**  
`StoolEntry` dans `symptom.entity.ts` contient uniquement `bristolType` et un champ `count?` optionnel. Les champs `blood`, `mucus` et `frequency` n'existent pas. Il n'y a aucune alerte médicale affichée.

**Correction proposée :**  
1. Ajouter `blood: boolean`, `mucus: boolean`, `frequency?: number` à `StoolEntry` dans `domain/entities/symptom.entity.ts`
2. Ajouter dans `symptom-entry.component.html` (section transit) : un compteur de fréquence + deux checkboxes "Présence de sang" / "Présence de mucus"
3. Afficher un bandeau d'alerte orange `⚠️ Pensez à informer votre médecin` si `blood === true` au moment de la saisie
4. Mettre à jour le store IndexedDB (migration de version)
5. Mettre à jour les tests unitaires de `AddSymptomUseCase`

---

### Écart 1.2 · Prises de traitement : raison du saut et note absents du panneau détail

| | |
|---|---|
| **Réf. spec** | §1.5.3 — Confirmation détaillée (tap long) |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
Le panneau de confirmation détaillée (tap long sur une carte de traitement) doit contenir :
- Heure de prise (pré-remplie, modifiable) ✅ implémenté
- Dose réelle prise (pré-remplie, modifiable) ✅ implémenté
- **Note libre** (ex : "pris avec repas léger") ❌ absent
- **Raison du saut** si statut = Ignoré : oubli / effet secondaire / choix délibéré ❌ absent

**Ce qui est implémenté :**  
`IntakeDetailSheetComponent` affiche heure + dose uniquement. Les champs `skipReason` et `notes` existent dans `IntakeEntity` et sont transmis au use case `ConfirmIntakeUseCase`, mais aucun composant ne les collecte en UI.

**Correction proposée :**  
1. Dans `intake-detail-sheet.component.html` : ajouter un `<textarea>` "Note (optionnelle)" toujours visible
2. Ajouter un `<mat-select>` "Raison" visible uniquement quand le bouton "Sauté" est sélectionné, avec les options : Oubli / Effet secondaire / Choix délibéré / Autre
3. Passer ces valeurs au `ConfirmIntakeUseCase` existant (les champs sont déjà dans l'entité)
4. Mettre à jour le test Playwright `intake-entry.spec.ts` (le test "tap long" existant ne testait pas ces champs)

---

### Écart 1.3 · Cures actives : aucune barre de progression dans le journal

| | |
|---|---|
| **Réf. spec** | §1.5.4 — Gestion des cures |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
Quand un traitement de type "cure" est actif, le journal doit afficher une **barre de progression de cure** (ex : `"Rifaximine — Jour 8/14"`). À la fin de la cure, le traitement passe automatiquement en statut "Inactif".

**Ce qui est implémenté :**  
`CureEntity` existe en domaine (`domain/entities/cure.entity.ts`) et en IndexedDB (store `cures`). Mais :
- `GetJournalDayUseCase` n'inclut pas les cures dans ses données retournées
- Aucun composant n'affiche de barre de progression
- Il n'y a pas de `GetActiveCuresUseCase`

**Correction proposée :**  
1. Créer `GetActiveCuresUseCase` : lit le store `cures`, filtre par `status = 'active'` et par date (`startDate ≤ today ≤ endDate`)
2. Créer `CureProgressComponent` : affiche une barre linéaire + label "Traitement — Jour X/Y" — style discret, intégré au-dessus de la liste des entrées du jour
3. Injecter ce composant dans `journal-home.component.html`
4. Ajouter une logique de clôture automatique : si `today > endDate`, passer la cure en `status = 'completed'`

---

### Écart 1.4 · Rappels de traitement : structure existante mais non fonctionnelle

| | |
|---|---|
| **Réf. spec** | §1.5.5 — Rappels |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
Chaque traitement actif peut avoir des rappels via **Web Notifications API** (heure fixe ou relatif à un repas). Les rappels sont désactivés automatiquement à la fin d'une cure.

**Ce qui est implémenté :**  
`ReminderConfig` existe dans `TreatmentEntity` (champs : `enabled`, `times[]`, `soundEnabled`) mais est initialisé à `{ enabled: false, times: [], soundEnabled: false }` et jamais modifiable. Il n'existe aucun service de notification, aucune demande de permission, et aucune UI de configuration.

**Correction proposée :**  
1. Créer `NotificationService` dans `infrastructure/` : demande permission, schedule via `setTimeout` ou `Notification` API, annulation des rappels
2. Dans `treatments.component.html` : ajouter un toggle "Rappels actifs" + liste d'heures (bouton +, bouton ✕ pour chaque heure)
3. À la sauvegarde d'un traitement avec rappels, appeler `NotificationService.schedule()`
4. Si les notifications sont refusées : afficher un bandeau en haut du journal à l'ouverture

---

### Écart 1.5 · Édition des entrées existantes impossible

| | |
|---|---|
| **Réf. spec** | §1.2 — Principes UX |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
"Toujours modifiable : toute entrée du journal est éditable après coup."

**Ce qui est implémenté :**  
Il n'existe aucun `EditMealUseCase`, `EditSymptomUseCase`, `EditIntakeUseCase`, `EditNoteUseCase`. Les cartes d'entrée dans `journal-home` ne proposent aucun bouton "Éditer". Le champ `editedAt` est absent de toutes les entités.

**Correction proposée :**  
1. Ajouter `editedAt?: Date` à `MealEntity`, `SymptomEntity`, `IntakeEntity`, `NoteEntity`
2. Créer les 4 use cases `Edit*` (clonage de l'entité existante + mise à jour des champs modifiés)
3. Ajouter dans `journal-home` un bouton "Éditer" sur chaque carte (accessible via un long-press ou un menu contextuel ···)
4. Le clic "Éditer" navigue vers le formulaire de saisie correspondant avec les données pré-remplies (via `history.state` ou `queryParams`)
5. Mise à jour des stores IndexedDB avec migration de version pour `editedAt`

---

### Écart 1.6 · Tags IA sur les notes : pas de confirmation interactive

| | |
|---|---|
| **Réf. spec** | §1.6.4 — Tags générés par l'IA |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
Les tags générés par Claude s'affichent **en attente de confirmation**. L'utilisateur peut : valider tous d'un tap "✓ OK", supprimer un tag individuel, ajouter un tag libre non listé.

**Ce qui est implémenté :**  
`TagNoteUseCase` génère les tags et les sauvegarde directement dans `NoteEntity.tags[]` sans confirmation. L'affichage dans le journal montre les tags avec `#tag-name` mais sans interaction (pas de bouton supprimer individuel, pas d'ajout libre).

**Correction proposée :**  
1. Stocker les tags IA dans un champ temporaire `aiTagSuggestions?: string[]` (déjà dans la spec de l'entité) distinct de `tags[]` (tags confirmés)
2. Afficher les suggestions avec un style distinct (fond grisé, icône IA) et des boutons ✓ / ✕ individuels
3. Bouton "Tout valider" + champ de saisie pour ajouter un tag libre
4. Une fois validés, déplacer les tags dans `tags[]` et vider `aiTagSuggestions`

---

### Écart 1.7 · Score de bien-être non persisté en base

| | |
|---|---|
| **Réf. spec** | §1.4.2 — Bien-être global |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
Le score de bien-être est un symptôme de catégorie `'wellbeing'`. La heatmap mensuelle du Module 2 dépend de ces données historiques.

**Ce qui est implémenté :**  
Le widget "Bien-être du jour" dans `journal-home` affiche un slider 1-10 et stocke la valeur dans un signal Angular (mémoire uniquement). La valeur est perdue au rechargement de la page. La heatmap de bien-être dans l'Analyse existe mais affiche des données vides.

**Correction proposée :**  
1. Appeler `AddSymptomUseCase` avec `{ category: 'wellbeing', symptomKey: 'wellbeing_score', intensity: value }` à chaque modification du slider (avec debounce de 1s)
2. Au chargement de `journal-home`, lire la valeur existante pour le jour courant et pré-remplir le slider
3. Vérifier que `GetAdherenceStatsUseCase` ou le use case correspondant à la heatmap lit correctement le store `symptoms` filtré par `category = 'wellbeing'`

---

### Écart 1.8 · Alertes FODMAP (`aiFodmapFlags`) non stockées ni affichées

| | |
|---|---|
| **Réf. spec** | §1.3.2 — Structure MealEntry |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
```typescript
aiFodmapFlags?: FodmapFlag[];  // { item, reason, severity: 'warning'|'danger' }
```
Les alertes FODMAP générées par l'IA lors de l'analyse d'un repas doivent être stockées et affichées (ex : "⚠️ Lentilles corail — fructose élevé").

**Ce qui est implémenté :**  
`FoodItemVO` possède un champ `fodmapLevel` ('low'|'medium'|'high'|'unknown') qui colore les chips d'aliment, mais il n'y a pas de champ `aiFodmapFlags` au niveau de `MealEntity`. L'analyse IA retourne des niveaux FODMAP par aliment mais ne génère pas d'alertes contextuelles avec raison.

**Correction proposée :**  
1. Ajouter `aiFodmapFlags?: ReadonlyArray<FodmapFlag>` à `MealEntity`  
2. Dans le prompt IA analyse photo/vocal (`meal-photo.prompt.ts`, `meal-text.prompt.ts`), demander à Claude de retourner les alertes FODMAP avec raison et sévérité
3. Extraire et stocker ces alertes dans `AddMealUseCase`
4. Afficher les alertes sous le repas dans `journal-home` (chips rouges/orange avec icône ⚠️)

---

## Module 2 — Analyse & tendances

---

### Écart 2.1 · Comparaison avant/après cure non affichée

| | |
|---|---|
| **Réf. spec** | §2.5.3 — Comparaison avant/après cure |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
"Si une cure est en cours ou vient de se terminer dans la fenêtre : comparaison automatique des scores moyens avant/pendant/après."

**Ce qui est implémenté :**  
Le prompt envoyé à Claude via `AnalysisPort` inclut bien `cureComparison` dans le JSON retourné. Mais `AiInsightsComponent` n'a pas de section dédiée pour ce type d'insight — les données sont perdues ou fondues dans les autres cartes génériques.

**Correction proposée :**  
1. Ajouter un type `'cureComparison'` dans `InsightVO` (en plus des types `correlation|pattern|alert|recommendation` existants)
2. Créer une carte visuelle dédiée dans `AiInsightsComponent` : tableau avant/pendant/après avec scores moyens des symptômes clés
3. Cette carte n'apparaît que si l'insight de type `cureComparison` est présent dans les résultats

---

## Module 3 — Rapport médecin

---

### Écart 3.1 · Rapport exporté en `.txt` au lieu d'un PDF formaté

| | |
|---|---|
| **Réf. spec** | §3.4 — Formats de sortie |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
"PDF téléchargeable généré côté client via la librairie `jsPDF`. Mise en page sobre, logo FlowEase en en-tête. Nom de fichier : `FlowEase_rapport_YYYY-MM-DD.pdf`."

**Ce qui est implémenté :**  
`ReportBuilderComponent` propose un sélecteur "PDF / Texte" en UI, mais les deux options téléchargent un fichier `.txt` brut. `jsPDF` n'est pas installé dans `package.json`. Le nom du fichier produit est `flowease-rapport-YYYY-MM-DD.txt`.

**Correction proposée :**  
1. Installer `jspdf` et `@types/jspdf`
2. Créer `PdfReportService` dans `infrastructure/` : construit un PDF avec `jsPDF` (en-tête avec logo textuel "FlowEase", titre, sections avec niveaux de titre, corps en police lisible)
3. Dans `ReportBuilderComponent`, appeler `PdfReportService.generate(report)` quand le format "PDF" est sélectionné
4. Garder le chemin texte existant (`.txt`) pour le format "Texte"

---

### Écart 3.2 · Fenêtre de rapport : plage de dates personnalisée absente

| | |
|---|---|
| **Réf. spec** | §3.2 — Déclenchement |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
L'utilisateur choisit "la fenêtre temporelle à couvrir (7 / 14 / 30 / 90 jours, **ou plage personnalisée**)".

**Ce qui est implémenté :**  
`ReportBuilderComponent` propose uniquement les 4 presets (7j, 14j, 30j, 90j). Pas d'option "Période personnalisée".

**Correction proposée :**  
1. Ajouter une 5e option "Période personnalisée" dans le sélecteur de fenêtre
2. Quand sélectionnée, afficher deux `<input type="date">` (date de début / date de fin) avec validation (fin > début, plage max 365j)
3. Passer ces dates à `BuildReportUseCase` en paramètre (il accepte déjà `startDate` et `endDate`)

---

## Module 4 — Coach IA

---

### Écart 4.1 · Sélecteur de contexte — comportement différent de la spec *(changement délibéré)*

| | |
|---|---|
| **Réf. spec** | §4.3 — Contexte injecté |
| **Décision** | ☐ VALIDER (revenir au comportement spec) &nbsp;&nbsp; ☐ INVALIDER (MAJ specs) |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"L'utilisateur choisit le contexte à inclure **à l'ouverture de chaque nouvelle conversation**, via un panneau de sélection rapide."

**Ce qui est implémenté :**  
La session démarre automatiquement avec la valeur par défaut des paramètres. Le picker de contexte s'ouvre **à la demande** (bouton "Modifier" dans le chip de l'en-tête). Ce comportement a été explicitement demandé et implémenté lors d'une session de travail précédente ("puisque j'ai sélectionné des paramètres par défaut, on ne doit pas m'obliger à saisir").

**Note :** Si tu **INVALIDES**, on met à jour `flowease-specs.md §4.3` pour refléter le comportement actuel (défaut depuis les paramètres, modification volontaire).

---

### Écart 4.2 · Mode "Chat + suggestions ponctuelles dans le journal" absent

| | |
|---|---|
| **Réf. spec** | §4.2 — Mode d'interaction |
| **Décision** | ☑ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ✅ Traité |

**Ce que dit la spec :**  
Deux modes sélectionnables dans les paramètres :
- **Chat uniquement** — pas de suggestion proactive
- **Chat + suggestions ponctuelles** — affiche des cartes dans le journal (déclenchées localement, sans appel IA) ex : "Pas de repas depuis 6h — noter votre déjeuner ?" ou "Ballonnements en hausse depuis 3 jours — en parler avec le Coach ?"

**Ce qui est implémenté :**  
`CoachSettingsComponent` propose "Concis / Standard / Détaillé" (style de réponse Claude), pas un mode d'interaction. Aucune logique de suggestions proactives dans `journal-home`. Les 4 questions suggérées dans le chat sont statiques et toujours affichées.

**Correction proposée :**  
1. Ajouter dans `coach-settings.component.html` un toggle "Afficher des suggestions dans le journal (Oui/Non)"
2. Stocker la préférence dans `LocalSettingsAdapter` (nouvelle clé `flowease_coach_suggestions`)
3. Dans `journal-home.component.ts`, évaluer des règles simples côté client (pas d'appel IA) :
   - Aucun repas saisi depuis >8h → suggérer de noter le repas
   - Intensité d'un symptôme en hausse 3 jours de suite → suggérer d'en parler au Coach
4. Afficher un chip/bannière discret en haut du journal si une règle est satisfaite ET que le mode est actif

---

## Module 5 — Paramètres

---

### Écart 5.1 · Profil médical : 5 champs manquants

| | |
|---|---|
| **Réf. spec** | §5.2 — Section "Mon profil médical" |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
8 champs dans le profil médical. 3 sont implémentés (prénom, conditions, protocole). 5 sont absents :
- **Autres conditions** (texte libre)
- **Médecin référent** (nom optionnel)
- **Date du diagnostic** (date)
- **Allergies connues** (texte libre)
- **Restrictions alimentaires spécifiques** (texte libre)

**Ce qui est implémenté :**  
`profile.component.html` contient : prénom, cases à cocher conditions SIBO/gastroparésie, sélecteur de protocole FODMAP, langue et thème. `UserProfileEntity` possède `diagnosedAt?: Date` mais le champ n'est pas affiché. Les 4 autres champs n'existent pas dans l'entité.

**Correction proposée :**  
1. Ajouter à `UserProfileEntity` : `otherConditions?: string`, `referringDoctor?: string`, `diagnosedAt?: Date` (déjà présent), `allergies?: string`, `dietaryRestrictions?: string`
2. Ajouter les 5 champs dans `profile.component.html` (texte libres, date-picker pour `diagnosedAt`)
3. Ces champs sont injectés dans les system prompts Claude (analyse, rapport, coach) — mettre à jour les `BuildContextUseCase` correspondants
4. Migration IndexedDB si nécessaire

---

### Écart 5.2 · Gestion des cures dans les paramètres : aucun composant UI

| | |
|---|---|
| **Réf. spec** | §5.4 — Section "Mes traitements" |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Gestion des cures actives : date de début, durée, statut." Et §1.5.4 : "L'utilisateur définit une date de début et une durée dans Paramètres > Mes traitements."

**Ce qui est implémenté :**  
`CureEntity` existe en domaine et en base, mais `treatments.component` n'y fait aucune référence. Il n'existe pas de `CreateCureUseCase` ni de `GetCuresUseCase`. Il est impossible de créer ou gérer une cure depuis l'interface.

**Correction proposée :**  
1. Créer `CreateCureUseCase` et `GetCuresUseCase`
2. Dans `treatments.component.html`, ajouter une section "Cures" pour chaque traitement de type "cure" : bouton "Démarrer une cure" (date début + durée), liste des cures actives et passées avec statut
3. Créer le composant `CureFormComponent` (modale ou panneau inline)

---

### Écart 5.3 · Rappels de traitement : aucune UI de configuration dans les paramètres

| | |
|---|---|
| **Réf. spec** | §5.4 — Rappels par traitement |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Configuration des rappels par traitement (heure fixe ou relatif à un repas)."

**Ce qui est implémenté :**  
Voir Écart 1.4 — `ReminderConfig` existe dans l'entité mais n'est jamais affiché ni éditable dans `treatments.component`.

**Correction proposée :**  
Identique à Écart 1.4 — côté paramètres : ajouter dans le formulaire d'édition de traitement une section "Rappels" avec toggle + liste d'heures configurables.

> *Note : Les Écarts 1.4 et 5.3 sont les deux faces du même problème (service + UI). Si tu valides l'un, il faut valider l'autre.*

---

### Écart 5.4 · Contexte par défaut Coach : 14 jours dans l'app vs 7 jours dans la spec

| | |
|---|---|
| **Réf. spec** | §5.6 — Section "Coach IA" |
| **Décision** | ☐ VALIDER (changer le défaut à 7j) &nbsp;&nbsp; ☐ INVALIDER (MAJ spec → 14j) |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Contexte par défaut : **7 jours**."

**Ce qui est implémenté :**  
`LocalSettingsAdapter.getDefaultContextWindow()` retourne `'14d'` par défaut. Le sélecteur dans `coach-settings.component.html` marque "14 derniers jours (recommandé)".

**Note :** La valeur 14j peut être un choix délibéré fait lors du développement (meilleur compromis tokens/pertinence). Si tu **INVALIDES**, on met à jour `flowease-specs.md §5.6` pour écrire `14 jours` comme défaut.

---

### Écart 5.5 · Placeholder "Sync Gist v2" absent des paramètres

| | |
|---|---|
| **Réf. spec** | §5.7 — Sync GitHub Gist (v2 — placeholder) |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Section visible mais désactivée en v1. Message : *'La synchronisation multi-appareils via GitHub Gist sera disponible dans une prochaine version.'*"

**Ce qui est implémenté :**  
`data-privacy.component.html` ne contient aucune mention de cette section. Il n'y a que l'export, l'import et la suppression des données.

**Correction proposée :**  
Ajouter un bloc désactivé dans `data-privacy.component.html` avec :
- Titre "Synchronisation multi-appareils (bientôt)"
- Icône cadenassée
- Message exact de la spec
- Tous les contrôles en état `disabled`

---

### Écart 5.6 · Import de données : fusion non disponible, remplacement uniquement

| | |
|---|---|
| **Réf. spec** | §5.7 — Import de sauvegarde |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Option : 'Fusionner avec les données existantes' ou 'Remplacer toutes les données' (avec confirmation)."

**Ce qui est implémenté :**  
`ImportDataUseCase` efface d'abord tous les stores puis réimporte (`clear()` puis `bulkAdd()`). Il n'y a pas d'option de fusion. Si l'utilisateur importe une sauvegarde partielle, toutes les données existantes sont perdues.

**Correction proposée :**  
1. Afficher une boîte de dialogue de choix avant l'import : "Fusionner" vs "Remplacer"
2. Implémenter le mode fusion dans `ImportDataUseCase` : pour chaque entrée importée, si un document avec le même `id` existe déjà → le garder (ou le remplacer selon une option avancée) ; sinon → insérer
3. Garder l'option "Remplacer tout" avec une confirmation en deux étapes

---

## Transversal / Infrastructure

---

### Écart T.1 · Service Worker absent — app non mise en cache offline

| | |
|---|---|
| **Réf. spec** | Principes non négociables : "Offline first" |
| **Décision** | ☐ VALIDER &nbsp;&nbsp; ☐ INVALIDER |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Offline first : toutes les fonctions de saisie fonctionnent sans connexion internet."

**Ce qui est implémenté :**  
Les données sont stockées localement en IndexedDB (les saisies fonctionnent offline ✅). Mais l'application elle-même (fichiers JS, CSS, HTML) n'est pas mise en cache. Si le réseau est coupé et que l'app n'a pas été chargée au préalable, elle ne s'ouvre pas.

**Correction proposée :**  
1. Installer `@angular/service-worker`
2. Créer `ngsw-config.json` (stratégie `prefetch` pour les assets Angular, `lazy` pour les assets optionnels)
3. Activer `provideServiceWorker()` dans `app.config.ts`
4. Ce changement rend l'app installable comme PWA (bouton "Ajouter à l'écran d'accueil")

---

### Écart T.2 · `@angular/localize` absent — i18n runtime uniquement

| | |
|---|---|
| **Réf. spec** | §Stack technique |
| **Décision** | ☐ VALIDER (migrer vers @angular/localize) &nbsp;&nbsp; ☐ INVALIDER (MAJ spec → i18n runtime JSON) |
| **Statut** | ⬜ À traiter |

**Ce que dit la spec :**  
"Français + anglais dès la v1 via `@angular/localize`."

**Ce qui est implémenté :**  
Les traductions sont chargées à l'exécution depuis des fichiers JSON statiques (`/assets/i18n/fr.json`, `en.json`), avec 202 clés dans chaque fichier. `@angular/localize` n'est pas dans `package.json`. Les templates n'utilisent pas les attributs `i18n`. L'approche runtime est **valide et fonctionnelle**.

**Note :** `@angular/localize` nécessite un build par langue et complique le déploiement. L'approche JSON runtime est souvent préférée pour les SPA statiques. Si tu **INVALIDES**, on met à jour `flowease-specs.md` pour préciser "i18n runtime via fichiers JSON".

---

## Récapitulatif

| # | Écart | Effort estimé | Décision |
|---|-------|:---:|---|
| 1.1 | Selles : blood / mucus / frequency | M | |
| 1.2 | Prises : skipReason + note dans détail | S | |
| 1.3 | Cures : barre de progression journal | L | |
| 1.4 | Rappels de traitement | L | |
| 1.5 | Édition des entrées existantes | L | ✅ |
| 1.6 | Tags IA : confirmation interactive | M | ✅ |
| 1.7 | Bien-être non persisté | S | |
| 1.8 | aiFodmapFlags absents | M | ✅ |
| 2.1 | Comparaison avant/après cure | S | ✅ |
| 3.1 | Rapport PDF (jsPDF) | M | ✅ |
| 3.2 | Rapport : plage de dates personnalisée | S | ✅ |
| 4.1 | Coach picker : comportement délibéré | — (MAJ spec si INVALIDER) | |
| 4.2 | Mode chat + suggestions dans journal | M | ✅ |
| 5.1 | Profil : 5 champs manquants | M | |
| 5.2 | UI gestion des cures (paramètres) | L | |
| 5.3 | UI rappels (paramètres) | L | |
| 5.4 | Coach : défaut 14j vs 7j spec | S (MAJ spec si INVALIDER) | |
| 5.5 | Placeholder Gist sync | XS | |
| 5.6 | Import : fusion vs remplacement | M | |
| T.1 | Service Worker / PWA | M | |
| T.2 | @angular/localize vs runtime JSON | — (MAJ spec si INVALIDER) | |

**Légende effort :** XS < 2h · S = 2-4h · M = 4-8h · L = 1-2 jours
