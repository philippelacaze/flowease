# FlowEase — Plan de migration IHM

> **Objectif** : Aligner la couche `presentation/` sur la maquette `FlowEase_prototype.jsx`.
> Le code reste Angular standalone + Angular Material (sauf là où le prototype impose
> un composant natif plus léger). On ne touche **pas** aux couches domain/application/infrastructure.

---

## Statut des sessions

| Session | Titre | Statut |
|---------|-------|--------|
| S01 | Design System : tokens CSS + typographie | ✅ Terminé |
| S02 | Shell & BottomNav | ✅ Terminé |
| S03 | JournalHome — Quick Capture Grid | ✅ Terminé |
| S04 | JournalHome — liste des entrées | ✅ Terminé |
| S05 | MealEntry | ✅ Terminé |
| S06 | SymptomEntry + SymptomConfirm | ✅ Terminé |
| S07 | IntakeEntry + NoteEntry | ✅ Terminé |
| S08 | Analysis | ✅ Terminé |
| S09 | CoachChat | ✅ Terminé |
| S10 | Report | ✅ Terminé |
| S11 | Settings | ✅ Terminé |
| S12 | Accessibilité & micro-interactions | ✅ Terminé |
| S13 | Tests E2E & polish final | ✅ Terminé |

---

## Conventions de lecture de ce document

- **GARDER** → le code existant est correct, on ne touche pas à ce bloc
- **MODIFIER** → le bloc existe mais doit changer ; l'ancien et le nouveau sont montrés
- **AJOUTER** → nouvelle section/composant à créer de zéro
- **SUPPRIMER** → le bloc existant disparaît

---

## Référence de design — tokens

### Palette CSS (variables à déclarer)

```scss
// light (défaut)
--app-bg:       #F8F7F4;
--card-bg:      #FFFFFF;
--nav-bg:       #FFFFFF;
--border:       #E8E6DE;
--border-sub:   #F1EFE8;
--text-1:       #2C2C2A;
--text-2:       #5F5E5A;
--text-3:       #888780;
--text-4:       #B4B2A9;
--chip:         #F1EFE8;
--chip-border:  #D3D1C7;
--surface-var:  #F1EFE8;
--input-bg:     #FFFFFF;

// sémantiques (identiques en light et dark)
--teal:   #0F6E56;
--coral:  #D85A30;
--amber:  #BA7517;
--blue:   #378ADD;

// FODMAP
--fodmap-low-dot:    #1D9E75;  --fodmap-low-bg:    #E1F5EE;  --fodmap-low-border:    #5DCAA5;  --fodmap-low-text:    #085041;
--fodmap-medium-dot: #EF9F27;  --fodmap-medium-bg: #FAEEDA;  --fodmap-medium-border: #FAC775;  --fodmap-medium-text: #854F0B;
--fodmap-high-dot:   #D85A30;  --fodmap-high-bg:   #FAECE7;  --fodmap-high-border:   #F0997B;  --fodmap-high-text:   #993C1D;
--fodmap-unknown-dot:#B4B2A9;  --fodmap-unknown-bg:#F1EFE8;  --fodmap-unknown-border:#D3D1C7;  --fodmap-unknown-text:#5F5E5A;
```

```scss
// dark — surcharge dans [data-theme="dark"] { }
--app-bg:       #141412;
--card-bg:      #1E1D1A;
--nav-bg:       #1A1917;
--border:       #2E2D28;
--border-sub:   #252420;
--text-1:       #F0EFE8;
--text-2:       #B8B6AE;
--text-3:       #7A7872;
--text-4:       #4E4D48;
--chip:         #252420;
--chip-border:  #36352E;
--surface-var:  #252420;
--input-bg:     #1E1D1A;
// FODMAP dark (fonds sombres)
--fodmap-low-bg:    #0D2B1E; --fodmap-low-border:    #1D6B48; --fodmap-low-text:    #5DCAA5;
--fodmap-medium-bg: #271A04; --fodmap-medium-border: #7A5010; --fodmap-medium-text: #FAC775;
--fodmap-high-bg:   #2B1108; --fodmap-high-border:   #7A2E14; --fodmap-high-text:   #F0997B;
--fodmap-unknown-bg:#252420; --fodmap-unknown-border:#36352E; --fodmap-unknown-text:#7A7872;
```

### Classes utilitaires à créer dans `styles.scss`

```scss
.card      { background: var(--card-bg); border: 0.5px solid var(--border); border-radius: 14px; overflow: hidden; }
.chip-pill { background: var(--chip);    border: 0.5px solid var(--chip-border); border-radius: 20px; }
.sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--text-4); margin-bottom: 8px; }
.primary-btn { width: 100%; padding: 14px; border-radius: 12px; background: var(--teal); color: #fff; border: none; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 44px; }
.icon-btn    { width: 40px; height: 40px; border-radius: 20px; background: none; border: none; cursor: pointer; color: var(--text-3); display: flex; align-items: center; justify-content: center; font-size: 20px; }
```

---

## S01 — Design System : tokens CSS + typographie

### Fichier `src/styles.scss`

**État actuel (12 lignes) :**
```scss
@use './styles/theme';
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; margin: 0; font-family: Roboto, 'Helvetica Neue', sans-serif; }
```

**État cible :**
```scss
@use './styles/theme'; // GARDER — contient les Material tokens existants

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body {
  height: 100%;
  margin: 0;
  font-family: 'DM Sans', system-ui, sans-serif; // MODIFIER : Roboto → DM Sans
  background: var(--app-bg);
  color: var(--text-1);
}

:root {
  // … tous les tokens light listés ci-dessus …
}
[data-theme="dark"] {
  // … tous les tokens dark …
}

// Classes utilitaires listées ci-dessus (.card, .chip-pill, .sec-label, .primary-btn, .icon-btn)

@keyframes spin { to { transform: rotate(360deg); } }
```

> **Impact** : aucun composant existant ne casse — les `var(--mat-sys-*)` sont inchangés.
> Les nouveaux composants utilisent les `var(--*)` du design system.

### Fichier `src/app/presentation/core/theme.service.ts`

**État actuel :** applique les classes `theme-dark` / `theme-light` sur `document.documentElement`.

**MODIFIER :** remplacer `classList.add('theme-dark')` par `setAttribute('data-theme', 'dark')` (et idem pour light, et `removeAttribute` pour auto) afin que le sélecteur CSS `[data-theme="dark"]` fonctionne.

```typescript
// AVANT
root.classList.remove('theme-dark', 'theme-light');
if (value === 'dark') root.classList.add('theme-dark');
else if (value === 'light') root.classList.add('theme-light');

// APRÈS
root.removeAttribute('data-theme');
if (value === 'dark') root.setAttribute('data-theme', 'dark');
else if (value === 'light') root.setAttribute('data-theme', 'light');
// 'auto' : pas d'attribut, prefers-color-scheme prend le relais
```

**Tests :** mettre à jour les tests de `ThemeService` si présents (recherche `theme-dark` dans les specs).

---

## S02 — Shell & BottomNav

### `bottom-nav.component.ts` — MODIFIER les icônes

**État actuel :** les `navItems` utilisent des noms d'icônes Material Icons.
```typescript
{ path: '/journal',  icon: 'menu_book',   label: 'Journal'    },
{ path: '/analysis', icon: 'bar_chart',   label: 'Analyse'    },
{ path: '/report',   icon: 'description', label: 'Rapport'    },
{ path: '/coach',    icon: 'chat',        label: 'Coach'      },
{ path: '/settings', icon: 'settings',    label: 'Paramètres' },
```

**État cible :** les icônes deviennent des emoji (inline dans le template, pas un champ séparé).
```typescript
// Ajouter un champ emoji dans l'interface NavItem
readonly emoji: string;
// Valeurs :
{ path: '/journal',  emoji: '📓', label: 'Journal'    },
{ path: '/analysis', emoji: '📊', label: 'Analyse'    },
{ path: '/report',   emoji: '📄', label: 'Rapport'    },
{ path: '/coach',    emoji: '💬', label: 'Coach'      },
{ path: '/settings', emoji: '⚙️', label: 'Paramètres' },
```

### `bottom-nav.component.html` — MODIFIER

**État actuel :**
```html
<mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
<span class="bottom-nav__label">{{ item.label }}</span>
```

**État cible :**
```html
<span class="bottom-nav__emoji" aria-hidden="true">{{ item.emoji }}</span>
<span class="bottom-nav__label">{{ item.label }}</span>
<span class="bottom-nav__dot" aria-hidden="true"></span>  <!-- visible uniquement si active -->
```

> Supprimer `MatIconModule` et `MatRippleModule` des imports du composant.

### `bottom-nav.component.scss` — MODIFIER entièrement

**État actuel :** background `white` hardcodé, `border-top: 1px solid rgba(0,0,0,.12)`, hauteur 56px, pas de dot.

**État cible :**
```scss
:host { display: block; position: sticky; bottom: 0; z-index: 100; }

.bottom-nav {
  display: flex;
  background: var(--nav-bg);
  border-top: 0.5px solid var(--border);
  padding: 8px 0 16px;
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 0;
  text-decoration: none;
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;

  &.active { .bottom-nav__label { font-weight: 600; color: var(--teal); } }
  &:not(.active) .bottom-nav__dot { display: none; }
}

.bottom-nav__emoji { font-size: 20px; line-height: 1; }
.bottom-nav__label { font-size: 10px; font-weight: 400; }
.bottom-nav__dot   { width: 4px; height: 4px; border-radius: 2px; background: var(--teal); margin-top: -2px; }
```

### `shell.component.scss` — MODIFIER

Remplacer les références aux couleurs Material hardcodées par les tokens :
```scss
// AVANT
.shell-mobile { display: flex; flex-direction: column; height: 100%; }
// APRÈS — ajouter background
.shell-mobile { display: flex; flex-direction: column; height: 100%; background: var(--app-bg); }
```

> `shell.component.html` : **GARDER** — la structure `@if (isDesktop())` reste inchangée.

---

## S03 — Journal Home : Quick Capture Grid

### `journal-home.component.html` — section `<section class="quick-actions">`

**État actuel :** 4 cartes dont 2 `full` (Repas, Symptômes) et 2 `half` (Prises, Note).
La carte Repas a déjà `action-card-shortcuts` avec 2 `mat-icon-button`.
Les cartes Prises et Note ont juste icône + label.

**État cible :** toutes les cartes passent en grille `2×2` symétrique.
Chaque carte a : emoji + label (ligne 1) + 2 boutons d'action (ligne 2) + éventuellement un lien texte (ligne 3).

```html
<!-- SUPPRIMER la section quick-actions existante et la remplacer par : -->
<div class="sec-label" style="padding: 14px 16px 0">Saisie rapide</div>
<div class="qc-grid">

  <!-- Repas -->
  <div class="qc-card" aria-label="Saisir un repas" data-testid="qc-meal">
    <div class="qc-card-head">
      <span aria-hidden="true">🍽️</span>
      <span class="qc-card-label">Repas</span>
    </div>
    <div class="qc-card-btns">
      <button class="qc-btn" aria-label="Dicter un repas"
              data-testid="qc-meal-voice"
              (click)="navigate('/journal/meal', 'voice')">
        <span>🎤</span><span>Vocal</span>
      </button>
      <button class="qc-btn" aria-label="Photographier un repas"
              data-testid="qc-meal-photo"
              (click)="openCamera($event)">
        <span>📷</span><span>Photo</span>
      </button>
    </div>
    <button class="qc-text-link" aria-label="Saisir manuellement un repas"
            data-testid="qc-meal-text"
            (click)="navigate('/journal/meal', 'text')">
      ＋ Saisir manuellement
    </button>
  </div>

  <!-- Symptômes -->
  <div class="qc-card" aria-label="Saisir des symptômes" data-testid="qc-symptom">
    <div class="qc-card-head"><span>🫀</span><span class="qc-card-label">Symptômes</span></div>
    <div class="qc-card-btns">
      <button class="qc-btn" aria-label="Dicter des symptômes"
              data-testid="qc-symptom-voice"
              (click)="navigate('/journal/symptom', 'voice')">
        <span>🎤</span><span>Vocal</span>
      </button>
      <button class="qc-btn" aria-label="Saisir les symptômes"
              data-testid="qc-symptom-form"
              (click)="navigate('/journal/symptom', 'form')">
        <span>✏️</span><span>Saisir</span>
      </button>
    </div>
  </div>

  <!-- Médicaments -->
  <div class="qc-card" aria-label="Saisir des prises" data-testid="qc-intake">
    <div class="qc-card-head"><span>💊</span><span class="qc-card-label">Médicaments</span></div>
    <div class="qc-card-btns">
      <button class="qc-btn" aria-label="Dicter une prise">
        <span>🎤</span><span>Vocal</span>
      </button>
      <button class="qc-btn" aria-label="Valider les prises"
              data-testid="qc-intake-validate"
              (click)="navigate('/journal/intake')">
        <span>✓</span><span>Valider</span>
      </button>
    </div>
  </div>

  <!-- Note -->
  <div class="qc-card" aria-label="Saisir une note" data-testid="qc-note">
    <div class="qc-card-head"><span>📝</span><span class="qc-card-label">Note</span></div>
    <div class="qc-card-btns">
      <button class="qc-btn" aria-label="Dicter une note">
        <span>🎤</span><span>Vocal</span>
      </button>
      <button class="qc-btn" aria-label="Saisir une note texte"
              data-testid="qc-note-text"
              (click)="navigate('/journal/note')">
        <span>✏️</span><span>Texte</span>
      </button>
    </div>
  </div>

</div>
<!-- input photo caché — GARDER -->
<input #photoInput type="file" accept="image/*" capture="environment"
  class="hidden-input" aria-hidden="true" (change)="onPhotoChosen($event)" />
```

### `journal-home.component.ts` — MODIFIER `navigate()`

**État actuel :** `navigate(route: string): void { this.router.navigate([route]); }`

**État cible :** accepter un mode optionnel et le passer en `queryParams` :
```typescript
protected navigate(route: string, mode?: string): void {
  void this.router.navigate([route], mode ? { queryParams: { mode } } : {});
}
```

> **Note :** `startVoice()` et `openCamera()` restent mais ne sont plus appelés depuis la section QC.
> `openCamera()` est appelé depuis `qc-meal-photo` directement.
> Le boutton vocal QC-meal navigue directement `/journal/meal?mode=voice` (pas SpeechRecognition inline).

### `journal-home.component.scss` — MODIFIER la section quick-actions, AJOUTER qc-*

**SUPPRIMER** : `.action-card`, `.action-card--full`, `.action-card--half`, `.action-card-main`, `.action-card-shortcuts`, `.action-icon`, `.action-label`, `button.recording`.

**AJOUTER** :
```scss
.qc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px 12px;
}

.qc-card {
  background: var(--card-bg);
  border: 0.5px solid #B0AEA5; // légèrement plus foncé que --border, comme dans le proto
  border-radius: 14px;
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qc-card-head {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 16px; // emoji
}

.qc-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-1);
}

.qc-card-btns {
  display: flex;
  gap: 6px;
}

.qc-btn {
  flex: 1;
  min-height: 44px;
  padding: 6px 4px;
  border-radius: 20px;
  background: var(--surface-var);
  border: 0.5px solid var(--chip-border);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.qc-text-link {
  padding: 4px 0;
  border-radius: 20px;
  background: transparent;
  border: 0.5px solid var(--chip-border);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  min-height: 32px;
}
```

---

## S04 — Journal Home : Bien-être + Affichage des entrées

### `journal-home.component.html` — AJOUTER widget Bien-être (entre .qc-grid et les entrées)

```html
<!-- Widget Bien-être global du jour -->
<div class="wb-section">
  @if (!showWellbeing) {
    <div class="card wb-card wb-card--prompt">
      <div>
        <div class="wb-card-title">Bien-être global du jour</div>
        <div class="wb-card-sub">Comment vous sentez-vous ?</div>
      </div>
      <button class="wb-btn-open" aria-label="Saisir le bien-être du jour"
              data-testid="wb-open" (click)="showWellbeing = true">
        + Saisir
      </button>
    </div>
  }

  @if (showWellbeing && wellbeingScore === null) {
    <div class="card wb-card wb-card--picker">
      <div class="wb-picker-title">Comment vous sentez-vous ?</div>
      <div class="wb-picker-grid">
        @for (n of wellbeingOptions; track n) {
          <button class="wb-score-btn"
                  [class.wb-score-btn--active]="wellbeingScore === n"
                  [attr.aria-label]="'Bien-être ' + n + ' sur 10'"
                  (click)="setWellbeing(n)">{{ n }}</button>
        }
      </div>
    </div>
  }

  @if (wellbeingScore !== null && !showWellbeing) {
    <div class="card wb-card wb-card--done">
      <div>
        <div class="wb-card-title">Bien-être global du jour</div>
        <div class="wb-card-sub">Saisi à {{ wellbeingTime }}</div>
      </div>
      <div class="wb-score-display">
        <span class="wb-score-value">{{ wellbeingScore }}</span>
        <span class="wb-score-denom">/10</span>
      </div>
    </div>
  }
</div>
```

### `journal-home.component.ts` — AJOUTER propriétés Bien-être

```typescript
protected showWellbeing = false;
protected wellbeingScore: number | null = null;
protected wellbeingTime = '';
protected readonly wellbeingOptions = [1,2,3,4,5,6,7,8,9,10];

protected setWellbeing(n: number): void {
  this.wellbeingScore = n;
  this.wellbeingTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  this.showWellbeing = false;
  this.cdr.markForCheck();
}
```

> Note : la persistance du score bien-être sera branchée sur un use case dans une session ultérieure.
> Pour cette session, le signal reste local (signal ou propriété de composant).

### `journal-home.component.html` — MODIFIER la liste des repas (`.food-list`)

**État actuel :** liste `<ul>/<li>` avec `.fodmap-dot` CSS-only, pas de `app-food-chip`.

**État cible :** remplacer dans la section `@for (e of meals; track e)` :
```html
<!-- AVANT -->
<ul class="food-list">
  @for (item of e.data.items; track item) {
    <li class="food-item">
      <span class="food-name">{{ item.name }}</span>
      <span class="fodmap-dot fodmap-{{ item.fodmap?.level }}"></span>
    </li>
  }
</ul>

<!-- APRÈS -->
<div class="food-chips-row">
  @for (item of e.data.items; track item) {
    <app-food-chip [item]="item" [removable]="false" />
  }
</div>
```

**AJOUTER** `FoodChipComponent` aux imports du composant.

### `journal-home.component.scss` — AJOUTER wb-* et food-chips-row, SUPPRIMER food-list

```scss
// SUPPRIMER : .food-list, .food-item, .food-name, .food-qty, .fodmap-dot, .fodmap-dot.*

.wb-section { padding: 0 16px 12px; }
.wb-card { padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wb-card-title { font-size: 12px; font-weight: 600; color: var(--text-1); }
.wb-card-sub   { font-size: 11px; color: var(--text-3); margin-top: 2px; }
.wb-btn-open   { padding: 6px 14px; border-radius: 20px; background: var(--teal); color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; min-height: 44px; }
.wb-picker-title { font-size: 13px; font-weight: 600; color: var(--text-1); margin-bottom: 10px; }
.wb-picker-grid  { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.wb-score-btn    { width: 34px; height: 34px; border-radius: 17px; background: var(--chip); color: var(--text-2); border: 0.5px solid var(--chip-border); font-size: 13px; font-weight: 600; cursor: pointer; }
.wb-score-btn--active { background: var(--teal); color: white; border-color: var(--teal); }
.wb-score-display { display: flex; align-items: baseline; gap: 4px; }
.wb-score-value { font-size: 28px; font-weight: 700; color: var(--teal); }
.wb-score-denom { font-size: 12px; color: var(--text-3); }

.food-chips-row { padding: 8px 14px; display: flex; flex-wrap: wrap; gap: 5px; }
```

---

## S05 — Meal Entry : flux multi-phases

### Architecture actuelle vs cible

| Actuel | Cible |
|---|---|
| Vue unique, `mode` dans `MatButtonToggleGroup` | Machine d'état `phase` déterminée par `queryParams.mode` |
| Pas d'écran de processing | Phase `processing` (animation) |
| Pas d'écran d'erreur IA | Phases `empty` et `network` |
| `proposedItems` toujours visibles | Phase `validation` (après IA) ou `form` (manuel) |
| Navigation immédiate vers /journal | Phase `confirm` (écran succès) |

### `meal-entry.component.ts` — MODIFIER

**SUPPRIMER :** `mode: MealInputMode`, `modeLabels`, `MatButtonToggleModule` dans imports.

**AJOUTER :**
```typescript
type MealPhase = 'processing' | 'validation' | 'form' | 'empty' | 'network' | 'confirm';

protected phase: MealPhase = 'form';
protected srcMode: 'voice' | 'photo' | 'text' = 'text';
protected processingStep = 0; // 0 = capture, 1 = IA, 2 = done
```

**MODIFIER `ngOnInit()`** pour lire `queryParams` au lieu de `history.state` pour le mode :
```typescript
// Lire queryParams.mode pour srcMode
// Si mode === 'voice' ou 'photo' → phase = 'processing', lancer le timer
// Si mode === 'text' → phase = 'form'
// history.state.transcript / photo restent utilisés pour déclencher l'analyse réelle
```

**AJOUTER** méthode `private startProcessing()` :
```typescript
private startProcessing(): void {
  this.processingStep = 0;
  const t1 = setTimeout(() => { this.processingStep = 1; this.cdr.markForCheck(); }, 1800);
  const t2 = setTimeout(() => {
    this.processingStep = 2;
    this.cdr.markForCheck();
    setTimeout(() => this.phase = 'validation', 400);
  }, 3200);
  // stocker t1, t2 dans des props pour cleanup dans ngOnDestroy
}
```

**MODIFIER `onTranscript()` et `onPhotoSelected()`** :
- Si IA retourne `[]` et que l'erreur est réseau → `phase = 'network'`
- Si IA retourne `[]` et que l'erreur est "non reconnu" → `phase = 'empty'`
- Si IA retourne des items → `phase = 'validation'`

**MODIFIER `submit()`** → après `addMeal.execute()`, `phase = 'confirm'` au lieu de `router.navigate`.

### `meal-entry.component.html` — RÉÉCRIRE entièrement

Remplacer la vue unique par des blocs conditionnels `@if (phase === '...')` :

```html
<!-- Phase : processing -->
@if (phase === 'processing') {
  <app-page-header title="Saisir un repas" (back)="back()" />
  <div class="processing-body">
    <div class="processing-circle" [class.processing-circle--ai]="processingStep >= 1">
      {{ processingStep === 0 ? (srcMode === 'photo' ? '📷' : '🎤') : '✨' }}
    </div>
    <div class="processing-text">
      <div class="processing-title">
        {{ processingStep === 0 ? (srcMode === 'photo' ? 'Traitement de la photo…' : 'Enregistrement vocal…') : 'Analyse IA en cours…' }}
      </div>
    </div>
    <div class="processing-dots">
      @for (i of [0,1,2]; track i) {
        <div class="processing-dot" [class.processing-dot--active]="i <= processingStep"></div>
      }
    </div>
  </div>
}

<!-- Phase : empty (IA n'a rien reconnu) -->
@if (phase === 'empty') { … }

<!-- Phase : network (hors ligne) -->
@if (phase === 'network') { … }

<!-- Phase : form (saisie manuelle) -->
@if (phase === 'form') {
  <!-- header avec sélecteur de type repas (select natif, pas MatSelect) -->
  <!-- section "Aliments ajoutés" (chips supprimables) -->
  <!-- input + bouton + -->
  <!-- section "Récents" (boutons rapides) -->
  <!-- footer .primary-btn -->
}

<!-- Phase : validation (résultat IA) -->
@if (phase === 'validation') {
  <!-- bannière orange si FODMAP high -->
  <!-- section chips avec × -->
  <!-- FodPill légende -->
  <!-- input pour ajouter aliment manquant -->
  <!-- footer .primary-btn -->
}

<!-- Phase : confirm -->
@if (phase === 'confirm') {
  <div class="confirm-body">
    <div class="confirm-circle">✅</div>
    <div class="confirm-title">Repas enregistré !</div>
    <div class="confirm-sub">{{ proposedItems.length }} aliments · {{ mealTypeLabel }}</div>
    <button class="primary-btn confirm-back" (click)="back()">← Retour au journal</button>
  </div>
}
```

**SUPPRIMER** des imports TS : `MatButtonToggleModule`, `MatFormFieldModule` (pour le mode selector),
`MatSelectModule` (remplacé par `<select>` natif).

**GARDER** : `FoodChipComponent`, `VoiceInputComponent`, `PhotoInputComponent`,
`AddMealUseCase`, `ExtractMealFromTextUseCase`, `AnalyzeMealPhotoUseCase`, `GetFrequentFoodsUseCase`.

---

## S06 — Symptom Entry + SymptomConfirm

### `symptom-entry.component.html` — MODIFIER header et AJOUTER éléments

**MODIFIER le header :** remplacer `<header class="page-header">` par :
```html
<div class="sym-header">
  <button class="icon-btn" aria-label="Retour" (click)="back()">←</button>
  <div class="sym-header-titles">
    <div class="sym-header-title">
      {{ srcMode === 'voice' ? 'Vérifier les symptômes' : 'Saisir les symptômes' }}
    </div>
    <div class="sym-header-sub">
      {{ srcMode === 'voice' ? 'Dictée analysée · ajustez si besoin' : 'Faites glisser les curseurs' }}
    </div>
  </div>
  @if (avgScore > 0) {
    <div class="sym-score-badge" [class]="avgSeverityClass" aria-label="Score moyen {{ avgScore }} sur 10">
      {{ avgScore }}/10
    </div>
  }
</div>
@if (srcMode === 'voice') {
  <div class="sym-voice-banner" aria-live="polite">
    <span>✨</span><span>Ballonnements intenses et fatigue notable détectés.</span>
  </div>
}
```

**AJOUTER** au bas du formulaire (avant `.submit-row`) :
```html
<!-- Ajout de symptôme personnalisé -->
<div class="sym-add-section">
  @if (!showAddCustom) {
    <button class="sym-add-btn" aria-label="Ajouter un symptôme personnalisé"
            data-testid="add-custom-symptom" (click)="showAddCustom = true">
      ＋ Ajouter un symptôme
    </button>
  }
  @if (showAddCustom) {
    <div class="sym-add-row">
      <input class="sym-add-input" [(ngModel)]="newCustomLabel"
             placeholder="Ex : maux de tête…"
             aria-label="Nom du symptôme personnalisé"
             (keydown.enter)="addCustomSymptom()" />
      <button class="sym-add-confirm" aria-label="Confirmer" (click)="addCustomSymptom()">+</button>
      <button class="sym-add-cancel" aria-label="Annuler" (click)="cancelCustom()">×</button>
    </div>
  }
</div>
```

**MODIFIER le footer CTA :** changer couleur de `primary` vers coral pour les symptômes :
```html
<button class="primary-btn primary-btn--coral" …>
  ✓ Enregistrer{{ hasAnyRating ? ' — ' + activeCount + ' élément(s)' : '' }}
</button>
```

### `symptom-entry.component.ts` — AJOUTER

```typescript
protected srcMode: 'voice' | 'form' = 'form'; // lire depuis queryParams
protected showAddCustom = false;
protected newCustomLabel = '';
protected customSymptoms: SymptomRow[] = [];

protected get avgScore(): number { /* moyenne des intensités > 0 */ }
protected get avgSeverityClass(): string { /* 'score-low|medium|high' */ }
protected get activeCount(): number { /* nb intensités > 0 + bristol si renseigné */ }

protected addCustomSymptom(): void { … }
protected cancelCustom(): void { this.showAddCustom = false; this.newCustomLabel = ''; }
```

**MODIFIER `submit()`** : au lieu de naviguer vers `/journal`, passer à une phase `confirm`
ou passer les données à un composant `SymptomConfirmComponent` via un service de navigation d'état.

### AJOUTER `symptom-confirm.component` (nouveau fichier)

**Fichier :** `src/app/presentation/features/journal/symptom-entry/symptom-confirm.component.ts`

Ce composant affiche :
1. Récapitulatif des symptômes avec barres de progression
2. Section "Corrélation avec le dernier repas" (données du dernier repas via `GetJournalDayUseCase`)
3. Bouton "← Retour au journal"

```
symptom-confirm.component.html
symptom-confirm.component.ts
(pas de .scss séparé — utilise les classes globales)
```

**Route à ajouter** dans `journal.routes.ts` :
```typescript
{ path: 'symptom/confirm', component: SymptomConfirmComponent }
```

L'entrée des données se fait via `router.navigate(['/journal/symptom/confirm'], { state: { scores, symptoms, bristol } })`.

---

## S07 — Intake Entry

### `intake-entry.component.html` — MODIFIER le panneau détail

**État actuel :** panneau inline `<div class="detail-panel" role="dialog">` avec 4 MatFormField.

**État cible :** remplacer le panneau inline par un `MatBottomSheet`.
Créer `IntakeDetailSheetComponent` :
```
src/app/presentation/features/journal/intake-entry/intake-detail-sheet.component.ts
src/app/presentation/features/journal/intake-entry/intake-detail-sheet.component.html
```

**Contenu de la sheet (correspondance maquette) :**
- Nom + dose + fréquence (texte, pas MatFormField)
- 2 tiles côte-à-côte : Heure | Dose (fond `var(--surface-var)`, `border-radius: 10px`)
- 2 boutons : `✓ Pris` (teal, flex: 2) + `Sauté` (neutre, flex: 1)

**SUPPRIMER** dans `intake-entry.component.html` :
- `@if (detailState)` block avec `.detail-panel`, `.detail-form`, `MatFormField`

**MODIFIER dans `intake-entry.component.ts`** :
```typescript
// AVANT : detailState stocké dans le composant, panneau affiché inline
// APRÈS : ouvrir MatBottomSheet
protected openDetail(state: TreatmentState): void {
  const ref = this.bottomSheet.open(IntakeDetailSheetComponent, { data: state });
  ref.afterDismissed().subscribe((action: 'taken' | 'skipped' | undefined) => {
    if (action) this.confirmFromDetail(state, action);
    this.cdr.markForCheck();
  });
}
```

**MODIFIER les cartes traitements :**
```html
<!-- AVANT : border couleur via Material  -->
<!-- APRÈS : fond et border via variables CSS selon l'état -->
<div class="treatment-card"
     [style.background]="cardBg(state)"
     [style.border-color]="cardBorder(state)" …>
```

```scss
// SUPPRIMER .detail-panel, .detail-header, .detail-form, .detail-field, .detail-actions, .detail-btn
// MODIFIER .treatment-card pour utiliser les tokens FODMAP
.treatment-card {
  background: var(--card-bg);
  border: 0.5px solid var(--border);
  border-radius: 14px;
  padding: 13px 14px;
  // states appliqués via [style] binding directement
}
```

---

## S08 — Note Entry

### `note-entry.component.html` — MODIFIER les 3 sections

**MODIFIER le mode selector** : remplacer `MatButtonToggleGroup` par des boutons natifs :
```html
<!-- AVANT : <mat-button-toggle-group> -->
<!-- APRÈS : -->
<div class="note-mode-tabs">
  @for (m of modes; track m.key) {
    <button class="note-mode-tab"
            [class.note-mode-tab--active]="mode === m.key"
            [attr.aria-label]="m.label"
            (click)="setMode(m.key)">
      <span>{{ m.emoji }}</span>
      <span>{{ m.label }}</span>
    </button>
  }
</div>
```

**MODIFIER mode Texte** : remplacer `MatFormField/textarea` par :
```html
<div class="card note-textarea-card">
  <textarea class="note-textarea" [(ngModel)]="content"
            placeholder="Écrivez votre observation…&#10;Ex : ballonnements 2h après le déjeuner"
            aria-label="Contenu textuel de la note"
            data-testid="note-text-input">
  </textarea>
</div>
```

**MODIFIER les tags IA** : remplacer `MatChipSet/MatChip` par spans natifs :
```html
<div class="note-tags-row">
  @for (tag of savedTags; track tag) {
    <span class="note-tag-chip">#{{ tag }}</span>
  }
</div>
```

**MODIFIER le bouton Lier** :
```html
<!-- AVANT : mat-stroked-button -->
<!-- APRÈS : -->
<button class="note-link-btn" aria-label="Lier cette note à d'autres entrées" (click)="openLinkSheet()">
  🔗 Lier à…
  @if (linkedEntries.length > 0) {
    <span class="note-link-count">{{ linkedEntries.length }} lié{{ linkedEntries.length > 1 ? 's' : '' }}</span>
  }
</button>
```

### `note-entry.component.ts` — MODIFIER

**SUPPRIMER** : `MatButtonToggleModule`, `MatFormFieldModule`, `MatInputModule`, `MatChipsModule`.

**AJOUTER** :
```typescript
protected readonly modes = [
  { key: 'text' as NoteInputMode, emoji: '✏️', label: 'Texte' },
  { key: 'voice' as NoteInputMode, emoji: '🎤', label: 'Vocal' },
  { key: 'photo' as NoteInputMode, emoji: '📷', label: 'Photo' },
];
```

**GARDER** : `MatBottomSheet`, `FormsModule`, `VoiceInputComponent`, `PhotoInputComponent`,
`AddNoteUseCase`, `TagNoteUseCase`, `GetJournalDayUseCase`, `LinkEntriesSheetComponent`.

---

## S09 — Analysis

### `analysis-home.component.html` — MODIFIER entièrement la structure

**État actuel :** header `<h1>` + `MatButtonToggleGroup`, puis 4 `<section>` avec enfants.

**État cible :** même logique, mais enveloppée dans des `SC` cards :

```html
<!-- Header -->
<div class="analysis-header">
  <span class="analysis-title">Analyse</span>
  <div class="window-pills">
    @for (d of [7, 30, 90]; track d) {
      <button class="window-pill" [class.window-pill--active]="windowDays === d"
              [attr.aria-label]="d + ' jours'" (click)="onWindowChange(d)">{{ d }}j</button>
    }
  </div>
</div>

<!-- SC cards -->
<div class="analysis-body">
  <div class="sc-card">
    <div class="sc-header"><span>📈</span><span class="sc-title">Évolution des symptômes</span></div>
    <div class="sc-body">
      <!-- sélecteurs primaire + secondaire (select natif) -->
      <app-symptom-chart [primaryKey]="primarySymptom" [secondaryKey]="secondarySymptom" [windowDays]="windowDays" />
    </div>
  </div>

  <div class="sc-card">
    <div class="sc-header"><span>💚</span><span class="sc-title">Bien-être quotidien</span></div>
    <div class="sc-body"><app-wellbeing-heatmap [windowDays]="windowDays" /></div>
  </div>

  <div class="sc-card">
    <div class="sc-header sc-header--amber"><span>💊</span><span class="sc-title">Observance traitements</span></div>
    <div class="sc-body"><app-adherence-calendar [windowDays]="windowDays" /></div>
  </div>

  <div class="sc-card">
    <div class="sc-header sc-header--blue"><span>✨</span><span class="sc-title">Analyses IA</span></div>
    <div class="sc-body"><app-ai-insights [refreshKey]="insightsRefreshKey" /></div>
  </div>
</div>

<!-- FAB : remplacer mat-fab par bouton natif (évite la dépendance Material FAB) -->
<button class="analysis-fab"
        [class.analysis-fab--loading]="analyzing"
        aria-label="Lancer une analyse IA"
        data-testid="run-analysis-fab"
        [disabled]="analyzing"
        (click)="openRunDialog()">
  @if (analyzing) { <span class="fab-spinner"></span><span>Analyse…</span> }
  @else { ✨ }
</button>
```

**MODIFIER `openRunDialog()`** : remplacer `MatDialog` par `MatBottomSheet` :
```typescript
// AVANT : this.dialog.open(RunAnalysisDialogComponent, { width: '320px' })
// APRÈS :
protected openRunDialog(): void {
  const ref = this.bottomSheet.open(RunAnalysisSheetComponent);
  ref.afterDismissed().subscribe(async (days: number | undefined) => {
    if (days) await this.runAnalysis(days);
  });
}
```

**CRÉER `run-analysis-sheet.component.ts/html`** (renommer le dialog existant) :
```html
<!-- Contenu de la sheet -->
<div class="sheet-content">
  <div class="sheet-title">Lancer une analyse IA</div>
  <div class="sheet-sub">Claude analysera vos données pour identifier corrélations et patterns.</div>
  @for (opt of options; track opt.days) {
    <button class="sheet-option" (click)="select(opt.days)">
      <span>{{ opt.days }} jours</span>
      <span class="sheet-option-est">{{ opt.est }}</span>
    </button>
  }
</div>
```

**MODIFIER `analysis-home.component.ts`** : remplacer `MatDialog` par `MatBottomSheet`,
ajouter `primarySymptom = 'abdominal_pain'`, `secondarySymptom: string | null = null`.

**MODIFIER `symptom-chart.component`** : ajouter `@Input() secondaryKey: string | null = null`
et afficher une seconde ligne SVG en coral en tirets si présent.

### SCSS `analysis-home.component.scss`

**SUPPRIMER** : `.analysis-sections`, `.analysis-section`, `.section-title`.

**AJOUTER** :
```scss
.window-pills { display: flex; background: var(--chip); border-radius: 10px; border: 0.5px solid var(--chip-border); padding: 3px; gap: 2px; }
.window-pill { padding: 4px 12px; border-radius: 7px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; background: transparent; color: var(--text-3); }
.window-pill--active { background: var(--teal); color: white; }
.sc-card { background: var(--card-bg); border: 0.5px solid var(--border); border-radius: 14px; margin: 0 12px 10px; overflow: hidden; }
.sc-header { padding: 10px 14px 8px; border-bottom: 0.5px solid var(--border-sub); display: flex; align-items: center; gap: 7px; }
.sc-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--teal); }
.sc-header--amber .sc-title { color: var(--amber); }
.sc-header--blue  .sc-title { color: var(--blue); }
.sc-body { padding: 12px 14px; }
.analysis-fab { position: fixed; bottom: 80px; right: 16px; width: 56px; height: 56px; border-radius: 50%; background: var(--teal); border: none; color: white; font-size: 22px; cursor: pointer; box-shadow: 0 4px 16px rgba(15,110,86,.4); z-index: 20; }
.analysis-fab--loading { width: auto; padding: 0 20px; border-radius: 28px; background: var(--chip); border: 0.5px solid var(--chip-border); color: var(--text-3); font-size: 13px; font-weight: 600; }
.fab-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--text-3); border-top-color: transparent; animation: spin .8s linear infinite; margin-right: 6px; }
```

---

## S10 — Coach Chat

### `coach-chat.component.html` — MODIFIER

**MODIFIER le footer** : supprimer `MatFormField`, utiliser `textarea` natif :
```html
<!-- AVANT : <mat-form-field appearance="outline" class="input-field"> -->
<!-- APRÈS : -->
<div class="chat-input-row">
  <textarea class="chat-textarea" [(ngModel)]="currentInput"
            [placeholder]="sessionId ? 'Votre message…' : 'Choisissez un contexte d\'abord'"
            [disabled]="isStreaming || !sessionId"
            aria-label="Message au coach IA"
            data-testid="chat-input" rows="2"
            (keydown.enter)="onEnterKey($event)">
  </textarea>
  <button class="chat-send-btn"
          [class.chat-send-btn--active]="currentInput.trim() && !isStreaming && !!sessionId"
          [disabled]="!currentInput.trim() || isStreaming || !sessionId"
          aria-label="Envoyer le message"
          data-testid="send-button"
          (click)="onSendMessage()">➤</button>
</div>
```

**MODIFIER le token counter** : le `<app-token-counter>` existant est GARDER.

**AJOUTER** le Context Picker (Sheet) : il doit s'ouvrir automatiquement sur `ngOnInit` si aucun contexte.
```typescript
// MODIFIER ngOnInit
ngOnInit(): void {
  if (!this.sessionId) {
    // ouvrir le context picker après un tick
    setTimeout(() => this.openContextPicker());
  }
}

protected openContextPicker(): void {
  const ref = this.bottomSheet.open(CoachContextPickerComponent);
  ref.afterDismissed().subscribe((ctx) => {
    if (ctx) this.onContextSelected(ctx);
  });
}
```

**GARDER** : structure bulles messages, `app-token-counter`, boutons header historique + nouvelle conv.

### `coach-chat.component.scss` — MODIFIER

**SUPPRIMER** : styles `MatFormField` custom.

**AJOUTER** :
```scss
.chat-textarea { flex: 1; border: 0.5px solid var(--border); border-radius: 12px; padding: 10px 12px; background: var(--input-bg); color: var(--text-1); font-size: 14px; font-family: inherit; resize: none; outline: none; }
.chat-send-btn { width: 44px; height: 44px; border-radius: 22px; background: var(--surface-var); border: none; color: white; font-size: 18px; cursor: pointer; }
.chat-send-btn--active { background: var(--teal); }
```

**MODIFIER** `.user-bubble` / `.assistant-bubble` :
```scss
.user-bubble { background: var(--teal); color: white; border-radius: 18px 18px 4px 18px; border: none; }
.assistant-bubble { background: var(--card-bg); color: var(--text-1); border: 0.5px solid var(--border); border-radius: 18px 18px 18px 4px; }
```

---

## S11 — Report Builder

### `report-builder.component.html` — MODIFIER

**MODIFIER le sélecteur de fenêtre** : supprimer l'option "Personnalisé" et le `MatDatepicker`,
remplacer `MatButtonToggleGroup` par pills (comme dans Analysis) :
```html
<!-- SUPPRIMER : mat-button-toggle-group + custom-range datepicker -->
<!-- AJOUTER : -->
<div class="window-pills">
  @for (d of [7, 14, 30, 90]; track d) {
    <button class="window-pill" [class.window-pill--active]="windowPreset === d"
            (click)="windowPreset = d">{{ d }} j</button>
  }
</div>
```

**MODIFIER le sélecteur de format** : remplacer `MatButtonToggleGroup` par :
```html
<div class="format-btns">
  @for (f of formats; track f.value) {
    <button class="format-btn"
            [class.format-btn--active]="format === f.value"
            [attr.aria-label]="f.label"
            (click)="format = f.value">
      {{ f.icon }} {{ f.label }}
    </button>
  }
</div>
```

**MODIFIER la checkbox IA** : remplacer `MatCheckbox` par :
```html
<button class="ai-option-btn" (click)="includeAiSummary = !includeAiSummary"
        aria-label="Inclure une synthèse IA Claude">
  <div class="ai-option-check" [class.ai-option-check--on]="includeAiSummary">
    @if (includeAiSummary) { ✓ }
  </div>
  <div>
    <div class="ai-option-label">Synthèse IA (Claude)</div>
    <div class="ai-option-sub">~2 000 tokens · Clé API requise</div>
  </div>
</button>
```

**MODIFIER le bouton "Générer"** :
```html
<button class="primary-btn" [class.primary-btn--loading]="generating()"
        (click)="onGenerate()" [disabled]="generating() || !isRangeValid()">
  @if (generating()) { <span class="btn-spinner"></span> Génération en cours… }
  @else { 📄 Générer le rapport — {{ windowPreset }} j }
</button>
```

**MODIFIER la section résultat** : remplacer les `<pre>` par des `<div>` stylisés dans une `.card`.

**SUPPRIMER** des imports : `MatButtonToggleModule`, `MatCheckboxModule`, `MatDividerModule`,
`MatDatepickerModule`, `MatNativeDateModule`.

---

## S12 — Settings Home

### `settings-home.component.html` — RÉÉCRIRE

**État actuel :** `mat-nav-list` + `mat-list-item` avec `matListItemIcon`.

**État cible :**
```html
<div class="settings-page">

  <!-- Banner statut API key -->
  @if (apiKeyConfigured) {
    <div class="api-banner api-banner--ok">
      <span>✅</span>
      <div>
        <div class="api-banner-title">Clé API configurée</div>
        <div class="api-banner-sub">Claude IA disponible pour toutes les fonctions</div>
      </div>
    </div>
  } @else {
    <div class="api-banner api-banner--warn">
      <span>⚠️</span>
      <div>
        <div class="api-banner-title">Clé API non configurée</div>
        <div class="api-banner-sub">Certaines fonctions IA sont indisponibles</div>
      </div>
    </div>
  }

  <!-- Liste de navigation -->
  <div class="card settings-list">
    @for (item of items; track item.route; let last = $last) {
      <a [routerLink]="item.route"
         [attr.aria-label]="item.label"
         [attr.data-testid]="'settings-' + item.route"
         class="settings-item"
         [class.settings-item--last]="last">
        <div class="settings-item-icon">{{ item.emoji }}</div>
        <div class="settings-item-text">
          <div class="settings-item-label">{{ item.label }}</div>
          <div class="settings-item-desc">{{ item.description }}</div>
        </div>
        <span class="settings-item-chevron">›</span>
      </a>
    }
  </div>

  <div class="settings-footer">FlowEase v1.0.0 · Propulsé par Claude (Anthropic)</div>
</div>
```

### `settings-home.component.ts` — MODIFIER

**SUPPRIMER** : `MatListModule`.
**AJOUTER** : `LOCAL_SETTINGS_PORT` inject pour lire `apiKeyConfigured`.

```typescript
// Ajouter dans l'interface SettingsItem
readonly emoji: string;

// Modifier les items
{ label: 'Mon profil',            emoji: '👤', route: 'profile',       description: 'Conditions médicales, protocole' },
{ label: 'Clé API Claude',        emoji: '🔑', route: 'api-key',       description: 'Accès aux fonctions IA' },
{ label: 'Traitements',           emoji: '💊', route: 'treatments',    description: 'Médicaments et rappels' },
{ label: 'Symptômes',             emoji: '🫀', route: 'symptoms-config', description: 'Personnaliser le suivi' },
{ label: 'Préférences Coach',     emoji: '🤖', route: 'coach-settings', description: 'Mode et contexte IA' },
{ label: 'Données & confidentialité', emoji: '🛡️', route: 'data-privacy', description: 'Export, import, suppression' },
{ label: 'À propos',              emoji: 'ℹ️', route: 'about',         description: 'Version 1.0.0 · GitHub' },

// Ajouter
protected readonly apiKeyConfigured: boolean;
constructor() {
  this.apiKeyConfigured = !!this.settings.getApiKey();
}
```

### `settings-home.component.scss` — RÉÉCRIRE

**SUPPRIMER** tout (le fichier existant est minimal).

**AJOUTER** :
```scss
.settings-page { padding: 12px 16px 90px; }

.api-banner {
  border-radius: 12px; padding: 10px 14px; margin-bottom: 14px;
  display: flex; align-items: flex-start; gap: 10px; font-size: 18px;
  &--ok   { background: var(--fodmap-low-bg);    border: 0.5px solid var(--fodmap-low-border); }
  &--warn { background: var(--fodmap-medium-bg);  border: 0.5px solid var(--fodmap-medium-border); }
}
.api-banner-title { font-size: 12px; font-weight: 600; }
.api-banner-title.ok   { color: var(--fodmap-low-text); }
.api-banner-title.warn { color: var(--fodmap-medium-text); }
.api-banner-sub { font-size: 11px; color: var(--text-3); }

.settings-list { }
.settings-item {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 13px 14px; text-decoration: none; color: inherit;
  border-bottom: 0.5px solid var(--border-sub);
  &--last { border-bottom: none; }
}
.settings-item-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: var(--surface-var); display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.settings-item-label   { font-size: 14px; font-weight: 500; color: var(--text-1); }
.settings-item-desc    { font-size: 11px; color: var(--text-3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.settings-item-chevron { color: var(--text-4); font-size: 16px; flex-shrink: 0; margin-left: auto; }
.settings-footer { text-align: center; margin-top: 20px; font-size: 11px; color: var(--text-4); }
```

---

## S13 — Composants partagés

### `food-chip.component` — MODIFIER

**État actuel :** utilise `MatChipsModule`, `FodmapColorPipe` (classe CSS), boutons `mat-icon-button`.
Interface : `[item]`, `[editable]` + outputs `remove`, `edit`.

**État cible :** supprimer Material, ajouter prop `[removable]` (remplace `[editable]` pour l'usage dans le journal).
Garder `[editable]` pour `meal-entry` (bouton éditer/modifier).

Template cible :
```html
<span class="food-chip" [attr.class]="'food-chip food-chip--' + item.fodmap.level">
  <span class="food-chip__dot"></span>
  <span class="food-chip__name">{{ item.name }}</span>
  @if (!item.confirmed) { <span class="food-chip__ai">IA</span> }
  @if (removable || editable) {
    <button class="food-chip__remove" [attr.aria-label]="'Retirer ' + item.name"
            (click)="remove.emit()">×</button>
  }
</span>
```

SCSS :
```scss
.food-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 20px; font-size: 12px; font-weight: 500;
  &--low     { background: var(--fodmap-low-bg);     border: 0.5px solid var(--fodmap-low-border);     color: var(--fodmap-low-text);     }
  &--medium  { background: var(--fodmap-medium-bg);  border: 0.5px solid var(--fodmap-medium-border);  color: var(--fodmap-medium-text);  }
  &--high    { background: var(--fodmap-high-bg);    border: 0.5px solid var(--fodmap-high-border);    color: var(--fodmap-high-text);    }
  &--unknown { background: var(--fodmap-unknown-bg); border: 0.5px solid var(--fodmap-unknown-border); color: var(--fodmap-unknown-text); }
}
.food-chip__dot    { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.food-chip__remove { background: none; border: none; cursor: pointer; color: inherit; font-size: 14px; padding: 0; line-height: 1; opacity: .6; margin-left: 2px; }
```

**Input à ajouter :** `@Input() removable = false;`
**SUPPRIMER** des imports : `MatIconModule`, `MatChipsModule`.
**GARDER** : `FodmapColorPipe` peut être retiré si on utilise le pattern `food-chip--{{ level }}`.

### `intensity-slider.component` — MODIFIER

**État actuel :** `MatSlider` avec `<input matSliderThumb>`, range `[1, 10]`, pas de légende.
Input `[label]`, `[value]`, Output `(valueChange)`.

**État cible :** `input[type="range"]` natif avec `accent-color` dynamique, légende `Absent/Modéré/Intense`.

```html
<div class="intensity-slider">
  <div class="intensity-header">
    <span class="intensity-label">{{ label }}</span>
    <span class="intensity-val" [style.color]="scoreColor">{{ value > 0 ? value + '/10' : '—' }}</span>
  </div>
  <input type="range" min="0" max="10" step="1" [value]="value"
         [style.accent-color]="scoreColor"
         class="intensity-range"
         [attr.aria-label]="label + ' — ' + value + ' sur 10'"
         (input)="onInput($event)" />
  <div class="intensity-legend">
    <span>Absent</span><span>Modéré</span><span>Intense</span>
  </div>
</div>
```

```typescript
protected get scoreColor(): string {
  if (this.value === 0) return 'var(--chip-border)';
  if (this.value <= 3)  return 'var(--fodmap-low-dot)';
  if (this.value <= 6)  return 'var(--fodmap-medium-dot)';
  return 'var(--fodmap-high-dot)';
}
```

**MODIFIER le range :** passer de `[min]=1` à `[min]=0` (la valeur 0 = absent).
**SUPPRIMER** : `MatSlider`, `MatSliderModule` des imports.

### `bristol-scale.component` — MODIFIER layout

**État actuel :** liste horizontale de boutons avec SVG + numéro + description.
Fonctionne mais pas collapsible.

**État cible :** ajouter un mode collapsible (collapsed par défaut, expand sur tap) :

```typescript
@Input() collapsed = true;
protected toggle(): void { this.collapsed = !this.collapsed; }
```

```html
@if (collapsed) {
  <!-- bouton collapsed : "Non renseigné ▼" ou "Type N — Label ▼" -->
  <button class="bristol-collapsed-btn" (click)="toggle()" …>
    @if (value !== null) {
      <svg …>…</svg>
      <span>Type {{ value }} — {{ labelFor(value) }}</span>
      <span class="bristol-modify">Modifier ▼</span>
    } @else {
      <span class="bristol-empty">Non renseigné</span>
      <span class="bristol-select">Sélectionner ▼</span>
    }
  </button>
} @else {
  <!-- grille 7 colonnes existante + légende 1–2/3–4/5–7 -->
  <div class="bristol-grid">…</div>
  <div class="bristol-legend">…</div>
}
```

**GARDER** : les SVG existants (ils correspondent à la maquette).

### AJOUTER `fod-pill.component` (composant légende FODMAP)

Nouveau fichier : `src/app/presentation/shared/components/fod-pill/fod-pill.component.ts`

```html
<div class="fod-pill">
  @for (lvl of levels; track lvl.key) {
    <div class="fod-pill-item">
      <div class="fod-pill-dot" [style.background]="lvl.color"></div>
      <span>{{ lvl.label }}</span>
    </div>
  }
</div>
```

```typescript
protected readonly levels = [
  { key: 'low',    color: 'var(--fodmap-low-dot)',    label: 'Faible' },
  { key: 'medium', color: 'var(--fodmap-medium-dot)', label: 'Moyen'  },
  { key: 'high',   color: 'var(--fodmap-high-dot)',   label: 'Élevé'  },
];
```

---

## Ordre d'exécution et dépendances

```
S01 (tokens CSS)
  └── S02 (shell + nav)
        └── S03 (journal home QC)
              └── S04 (journal home entries + bien-être)
                    ├── S05 (meal entry)
                    ├── S06 (symptom entry)
                    ├── S07 (intake entry)
                    └── S08 (note entry)
        └── S09 (analysis)
        └── S10 (coach chat)
        └── S11 (report)
        └── S12 (settings)
S13 (composants partagés) — en deux passes :
  Passe 1 (avant S04) : food-chip, intensity-slider
  Passe 2 (après S12) : bristol-scale collapse, fod-pill
```

---

## Règles transversales

- Toujours lire le fichier avant de le modifier.
- `data-testid` existants : **ne jamais supprimer** — les specs les utilisent.
- `aria-label` : conserver et étendre.
- `npm test` vert avant de déclarer une session terminée.
- Ne jamais importer depuis `infrastructure/`.
- Pas de `MatDialog` dans les nouvelles sessions — utiliser `MatBottomSheet`.
- Les `mat-form-field` existants dans les pages non concernées (profile, api-key, etc.) **restent** tels quels.
