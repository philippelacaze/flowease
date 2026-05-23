# FlowEase

Application mobile Angular de suivi quotidien pour les personnes atteintes de SIBO et gastroparésie.
Toutes les données restent sur l'appareil (IndexedDB / localStorage) — aucun serveur requis.

## Fonctionnalités

- **Journal quotidien** : repas (texte, vocal, photo IA), symptômes, prises de traitements, notes
- **Analyse** : tendances symptômes, observance, analyse IA sur fenêtre 7–90 jours
- **Rapport** : génération PDF ou texte, synthèse IA optionnelle
- **Coach IA** : chat Claude avec streaming, contexte médical configurable
- **Offline-first** : toutes les saisies fonctionnent sans connexion

## Architecture

Clean Architecture 4 couches — la dépendance ne va jamais dans l'autre sens :

```
domain/         → interfaces et types purs (zéro dépendance externe)
application/    → use cases (dépend uniquement de domain/)
infrastructure/ → adapters IndexedDB + Anthropic (implémente domain/repositories/)
presentation/   → composants Angular standalone (dépend uniquement de application/)
```

## Installation

```bash
git clone https://github.com/<user>/flow-ease.git
cd flow-ease
npm install
ng serve
```

Ouvrir [http://localhost:4200](http://localhost:4200) dans un navigateur mobile ou DevTools en vue mobile.

## Configuration de la clé API Anthropic

1. Ouvrir **Paramètres → Clé API**
2. Coller une clé API Anthropic (`sk-ant-...`)
3. Appuyer sur **Tester** — un badge "Claude Pro actif" apparaît dans la navigation

La clé est stockée uniquement dans `localStorage` de l'appareil, jamais transmise ailleurs.
Les fonctions IA (analyse photo, coach, analyse tendances) restent disponibles en mode dégradé
(sans clé) : les appels IA retournent silencieusement une réponse vide.

## Lancer les tests

```bash
# Tests unitaires (Vitest)
ng test --watch=false

# Tests E2E (Playwright — Mobile Chrome + Mobile Safari)
npx playwright test

# Tests avec couverture
ng test --coverage
```

## Déploiement GitHub Pages

```bash
ng build --base-href /flowease/
```

Le workflow CI (`.github/workflows/deploy.yml`) déclenche automatiquement le déploiement
sur `main` après que les tests unitaires et E2E ont réussi.

URL de production : `https://<user>.github.io/flowease/`

## Références

- [Spécifications fonctionnelles](flowease-specs.md)
- [Architecture détaillée](flowease-architecture.md)
- [Plan de sessions Claude Code](flowease-sessions.md)
