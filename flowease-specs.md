# FlowEase — Spécifications fonctionnelles & techniques

> Document vivant — rédigé collaborativement  
> Version 0.1 — Module Journal quotidien  
> Projet : SIBO méthane + hydrogène / gastroparésie / dysbiose

---

## Contexte & principes directeurs

FlowEase est une application web Angular responsive, hébergée sur GitHub Pages, **sans backend**. Elle est conçue pour une personne souffrant au quotidien de SIBO mixte (méthane + hydrogène), gastroparésie et dysbiose.

### Principes non négociables

- **Friction zéro** : chaque module de saisie doit être utilisable en moins de 30 secondes, même en état de douleur ou de fatigue.
- **Offline first** : toutes les fonctions de saisie fonctionnent sans connexion internet.
- **Données personnelles** : les données restent sur l'appareil par défaut (IndexedDB). Aucun serveur tiers ne reçoit de données médicales sans consentement explicite.
- **IA en complément** : Claude API est sollicitée uniquement pour enrichir ou analyser, jamais pour bloquer une action.

### Stack technique cible

| Composant | Choix | Raison |
|---|---|---|
| Framework | Angular (dernière version stable) | Responsive, structuré, typage fort |
| Hébergement | GitHub Pages | Gratuit, statique, CI/CD natif |
| Stockage principal | IndexedDB (via `@angular/service-worker` + `idb`) | Offline, volumeux, structuré |
| Sauvegarde optionnelle | GitHub Gist (API REST) | Sans serveur, multi-appareils, contrôle utilisateur |
| IA | Anthropic Claude API (`claude-sonnet-4-20250514`) | Vision, analyse texte, contexte médical |
| Clé API | Saisie utilisateur, stockée en localStorage | Sécurité : jamais dans le code source |
| Voix | Web Speech API (natif navigateur) | Gratuit, offline, aucune dépendance externe |

---

## Module 1 — Journal quotidien

### 1.1 Objectif

Permettre à l'utilisateur de consigner **à la demande**, depuis son smartphone, tout événement pertinent de sa journée : repas, symptômes, prises médicamenteuses, douleurs, notes libres. La saisie doit rester possible quel que soit son état physique du moment.

### 1.2 Principes UX spécifiques

- **Saisie contextuelle** : l'utilisateur ouvre l'app au moment de l'événement ou plus tard (saisie rétrospective possible avec horodatage manuel).
- **Mode dégradé gracieux** : si l'IA est indisponible (pas de clé API, pas de réseau), toutes les fonctions de saisie continuent de fonctionner sans elle.
- **Pas de formulaire long** : aucun écran ne doit présenter plus de 3 champs actifs simultanément.
- **Toujours modifiable** : toute entrée du journal est éditable après coup.

---

### 1.3 Entrées de type Repas

#### 1.3.1 Quatre modes de saisie

L'utilisateur choisit son mode via 4 boutons d'accès rapide. Les modes sont combinables (ex : photo + correction vocale).

---

**Mode A — Vocal**

- Déclenchement : bouton micro sur l'écran principal du journal.
- Technologie : **Web Speech API** (natif navigateur, offline, gratuit).
- Flux :
  1. L'utilisateur appuie et parle (ex : *"j'ai mangé du riz blanc, du poulet grillé et des courgettes"*).
  2. La transcription apparaît en temps réel dans un champ texte éditable.
  3. L'utilisateur peut corriger le texte avant validation.
  4. À la validation, le texte est envoyé à Claude API pour extraction structurée des aliments (voir 1.3.2).
- Fallback si Web Speech API indisponible : bascule automatique sur le mode Texte.
- Offline : la transcription fonctionne offline. L'extraction IA est mise en file d'attente si pas de réseau.

---

**Mode B — Photo**

- Déclenchement : bouton appareil photo sur l'écran principal du journal.
- Source : caméra directe ou galerie (selon choix utilisateur au moment de la saisie).
- Flux :
  1. L'utilisateur prend ou sélectionne une photo du repas.
  2. L'image est envoyée à Claude API (vision) avec un prompt contextuel incluant le profil de l'utilisateur (restrictions SIBO, gastroparésie).
  3. Claude retourne une liste structurée d'aliments identifiés avec niveau de confiance.
  4. L'utilisateur voit la proposition sous forme de chips éditables : il peut supprimer, corriger ou ajouter des aliments.
  5. Validation explicite requise avant enregistrement.
- Offline : le bouton photo est **désactivé** hors connexion. Un message invite à utiliser le mode vocal ou texte à la place.
- Prompt système envoyé à Claude : voir Annexe A.

---

**Mode C — Texte libre**

- Champ texte simple, sans contrainte de format.
- L'utilisateur peut taper en langage naturel (ex : *"sandwich jambon beurre, pas terrible"*).
- À la validation, envoi optionnel à Claude pour structuration (si clé API disponible).
- Toujours enregistrable tel quel, sans passer par l'IA.

---

**Mode D — Aliments récurrents**

- Liste personnalisée des aliments/repas saisis fréquemment, classés par fréquence d'utilisation.
- Alimentée automatiquement par l'historique de l'utilisateur (les 20 aliments les plus fréquents).
- Sélection par tap sur des chips/badges.
- Modifiable dans les paramètres (ajout manuel, suppression, renommage).
- Entièrement offline.

---

#### 1.3.2 Structure de données — Entrée repas

```typescript
interface MealEntry {
  id: string;                        // UUID v4
  timestamp: Date;                   // horodatage réel de saisie
  mealTime: Date;                    // horodatage du repas (peut différer)
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  inputMode: 'voice' | 'photo' | 'text' | 'recurring';
  rawInput: string;                  // transcription brute ou texte libre
  photoRef?: string;                 // référence locale (IndexedDB blob)
  items: FoodItem[];                 // aliments structurés
  aiAnalyzed: boolean;               // si Claude a analysé l'entrée
  aiFodmapFlags?: FodmapFlag[];      // alertes FODMAP générées par IA
  notes?: string;                    // note libre additionnelle
  editedAt?: Date;                   // date de dernière modification
}

interface FoodItem {
  name: string;                      // nom de l'aliment
  quantity?: string;                 // portion estimée (libre)
  fodmapLevel?: 'low' | 'medium' | 'high' | 'unknown';
  confirmed: boolean;                // validé par l'utilisateur (vs suggestion IA)
}

interface FodmapFlag {
  item: string;
  reason: string;                    // ex : "fructose élevé"
  severity: 'warning' | 'danger';
}
```

---

#### 1.3.3 Horodatage et saisie rétrospective

- Par défaut : horodatage = heure de saisie.
- L'utilisateur peut modifier l'heure du repas via un sélecteur date/heure simple (pas l'heure de saisie, mais l'heure réelle du repas).
- La distinction `timestamp` / `mealTime` permet de savoir si la saisie était en temps réel ou rétrospective (utile pour l'analyse IA).

---

### 1.4 Entrées de type Symptômes & douleurs

#### 1.4.1 Principes de saisie

- Les symptômes digestifs et systémiques sont **saisis indépendamment**, à la demande, sans ordre imposé.
- Chaque entrée est horodatée automatiquement (avec possibilité de correction rétrospective).
- La saisie doit être faisable en moins de 20 secondes pour un symptôme simple.
- La liste de symptômes est **prédéfinie mais personnalisable** : l'utilisateur peut masquer des symptômes non pertinents, en renommer, ou en ajouter de nouveaux.

---

#### 1.4.2 Liste prédéfinie des symptômes

**Bloc A — Symptômes digestifs** *(saisie à tout moment)*

| Symptôme | Mode de saisie | Détail |
|---|---|---|
| Ballonnements | Intensité (1-10) + localisation (haut / bas / diffus) | — |
| Douleurs abdominales | Intensité (1-10) + localisation + type | Voir 1.4.3 |
| Nausées | Intensité (1-10) | — |
| Reflux / remontées acides | Intensité (1-10) | — |
| Éructations | Fréquence (rares / fréquentes / constantes) | — |
| Flatulences | Fréquence + odeur (oui / non) | — |
| Transit — selles | Fréquence (nb/jour) + consistance (Bristol) | Voir 1.4.4 |
| Plénitude précoce | Intensité (1-10) | Marqueur gastroparésie |
| Lourdeur post-repas | Intensité (1-10) + délai après repas | Marqueur gastroparésie |

**Bloc B — Symptômes systémiques** *(saisie indépendante, bloc séparé)*

| Symptôme | Mode de saisie |
|---|---|
| Fatigue générale | Intensité (1-10) |
| Brouillard mental / brain fog | Intensité (1-10) |
| Maux de tête | Intensité (1-10) |
| Douleurs articulaires / musculaires | Présence (oui/non) + intensité si oui |
| Troubles du sommeil | Qualité (1-10) + heures dormies |

**Bloc C — Bien-être global** *(idéalement 1x/jour, en fin de journée)*

| Symptôme | Mode de saisie |
|---|---|
| Score de bien-être général | Curseur 1-10 |
| Humeur / anxiété | Curseur 1-10 |
| Note libre du jour | Texte libre (optionnel) |

---

#### 1.4.3 Saisie des douleurs abdominales

La douleur abdominale est le symptôme le plus complexe et le plus important à documenter précisément pour le suivi médical. Elle se saisit en 3 étapes rapides, sur un seul écran :

**Étape 1 — Intensité**
Curseur horizontal de 1 à 10, avec retour haptique sur mobile. Valeur mémorisée entre les saisies (proposée en pré-remplissage).

**Étape 2 — Localisation**
Schéma SVG simplifié de l'abdomen divisé en 6 zones tappables :
- Épigastre (haut centre)
- Hypocondre gauche / droit (haut côtés)
- Péri-ombilical (centre)
- Fosse iliaque gauche / droite (bas côtés)

L'utilisateur tape une ou plusieurs zones. La zone sélectionnée se colore. Plusieurs zones peuvent être sélectionnées simultanément.

**Étape 3 — Type de douleur**
Sélection par boutons (choix multiple possible) :
- 🔴 Crampe / spasme
- 🔥 Brûlure
- ⬇️ Pression / pesanteur
- ⚡ Élancement
- 🌀 Torsion
- ❓ Difficile à décrire

---

#### 1.4.4 Saisie du transit — Échelle de Bristol

L'échelle de Bristol est présentée sous forme visuelle avec 7 types illustrés par des icônes SVG simples (pas de photos médicales). L'utilisateur tape le type correspondant.

| Type | Description courte | Association clinique |
|---|---|---|
| Type 1 | Séparés, durs | Constipation sévère |
| Type 2 | Boudinés, grumeleux | Constipation légère |
| Type 3 | Fissurés en surface | Normal-limite |
| Type 4 | Lisse, souple | Idéal |
| Type 5 | Morceaux mous | Manque de fibres |
| Type 6 | Pâteux, effilochés | Inflammation légère |
| Type 7 | Liquide | Diarrhée |

Champs complémentaires : fréquence (nombre de selles depuis la dernière saisie), présence de sang ou mucus (oui/non — si oui, rappel d'en informer le médecin).

---

#### 1.4.5 Structure de données — Entrée symptôme

```typescript
interface SymptomEntry {
  id: string;                          // UUID v4
  timestamp: Date;                     // horodatage réel de saisie
  occurredAt: Date;                    // heure réelle du symptôme
  category: 'digestive' | 'systemic' | 'wellbeing';
  symptomKey: string;                  // clé normalisée (ex: 'bloating', 'pain', 'stool')
  symptomLabel: string;                // label affiché (personnalisable)

  // Champs communs
  intensity?: number;                  // 1-10
  notes?: string;                      // note libre

  // Champs douleur abdominale
  pain?: {
    intensity: number;                 // 1-10
    locations: AbdominalZone[];        // zones sélectionnées
    types: PainType[];                 // types de douleur
  };

  // Champs transit
  stool?: {
    bristolType: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    frequency: number;                 // nb de selles
    blood: boolean;
    mucus: boolean;
  };

  // Champs flatulences / éructations
  gasEvent?: {
    frequency: 'rare' | 'frequent' | 'constant';
    odor?: boolean;
  };

  editedAt?: Date;
}

type AbdominalZone =
  'epigastric' | 'hypochondre_left' | 'hypochondre_right' |
  'periumbilical' | 'iliac_left' | 'iliac_right';

type PainType =
  'cramp' | 'burning' | 'pressure' | 'stabbing' | 'torsion' | 'unclear';
```

---

#### 1.4.6 Personnalisation de la liste

Accessible depuis les **Paramètres > Mon profil de symptômes** :

- Masquer un symptôme non pertinent (il reste dans l'historique mais disparaît de la saisie rapide).
- Renommer un symptôme (ex : "Plénitude précoce" → "Saturation rapide").
- Ajouter un symptôme personnalisé avec choix du mode de saisie (intensité / fréquence / oui-non).
- Réordonner les symptômes par glisser-déposer.
- Réinitialiser à la liste par défaut.

### 1.5 Entrées de type Médicaments & traitements

#### 1.5.1 Principes

- Les traitements sont saisis **depuis le journal quotidien**, à partir d'une liste prédéfinie personnalisable — pas d'écran dédié séparé pour la saisie.
- La confirmation d'une prise est **rapide et non bloquante** : heure, dose et note sont optionnelles. Seul le statut pris/ignoré est obligatoire.
- Certains traitements ont une **durée de cure définie** (antibiotiques), d'autres sont **continus** (compléments, prokinétiques au long cours). Les deux coexistent.
- Un **module de gestion** dédié dans les paramètres permet de configurer la liste, les posologies cibles et les protocoles de cure.

---

#### 1.5.2 Liste prédéfinie par catégorie

Chaque traitement de la liste est configurable individuellement. La liste est modifiable dans **Paramètres > Mes traitements**.

| Catégorie | Exemples prédéfinis | Mode |
|---|---|---|
| Antibiotiques | Rifaximine 550mg, Néomycine 500mg, Métronidazole | Cure (début/fin) |
| Prokinétiques | Métoclopramide, Dompéridone, Érythromycine faible dose | Continu ou cure |
| Antimicrobiens naturels | Huile d'origan, Berbérine, Allicine, Neem | Cure |
| Probiotiques | Lactobacillus, Saccharomyces boulardii, Bifidus | Continu ou cure |
| Compléments | Magnésium, Zinc, Vitamine D, B12, Fer | Continu |

L'utilisateur peut :
- Renommer n'importe quel traitement.
- Ajouter un traitement personnalisé non listé.
- Masquer un traitement inactif sans perdre son historique.
- Définir la posologie cible (dose + fréquence + timing recommandé).

---

#### 1.5.3 Flux de confirmation d'une prise

Depuis le journal quotidien, l'utilisateur voit la liste de ses traitements actifs du jour. Chaque item affiche :
- Nom + dose cible configurée
- Statut : **À prendre** / **Pris** / **Ignoré**
- Heure prévue si configurée

**Confirmation rapide (tap unique)** : un tap sur le traitement le passe à "Pris" avec horodatage automatique. C'est le chemin le plus court — aucun autre champ requis.

**Confirmation détaillée (tap long ou bouton "···")** : ouvre un panneau optionnel avec :
- Heure de prise (pré-remplie avec l'heure actuelle, modifiable)
- Dose réelle prise (pré-remplie avec la dose cible, modifiable si variable)
- Note libre (ex : *"pris avec repas léger"*, *"oublié, rattrapé 2h après"*)
- Statut alternatif : **Ignoré** (avec raison optionnelle : oubli / effet secondaire / choix délibéré)

---

#### 1.5.4 Gestion des cures

Pour les traitements de type **cure** (antibiotiques, protocoles antimicrobiens) :

- L'utilisateur définit une date de début et une durée (ou date de fin) dans **Paramètres > Mes traitements**.
- L'app affiche une **barre de progression de cure** dans le journal (ex : "Rifaximine — Jour 8/14").
- À la fin d'une cure, le traitement passe automatiquement en statut **Inactif** mais reste dans l'historique.
- L'historique des cures passées est consultable (dates, observance, notes).
- Plusieurs cures du même traitement peuvent se succéder dans le temps (ex : 2e round de Rifaximine).

**Observance** : pour chaque cure, l'app calcule un score d'observance (% de prises confirmées sur la durée totale). Affiché dans le résumé de cure et exportable dans le rapport médecin.

---

#### 1.5.5 Rappels

- Chaque traitement actif peut avoir 1 ou plusieurs rappels configurés (heure fixe ou relatif à un repas : "30 min avant le dîner").
- Les rappels utilisent les **notifications natives du navigateur** (Web Notifications API) — aucun serveur requis.
- Sur mobile, l'utilisateur doit autoriser les notifications au premier lancement.
- Si les notifications sont refusées : les rappels apparaissent uniquement dans l'app (bandeau en haut du journal à l'ouverture).
- Les rappels sont **désactivés automatiquement** à la fin d'une cure.

---

#### 1.5.6 Structure de données

```typescript
interface TreatmentConfig {
  id: string;                           // UUID v4
  name: string;                         // nom affiché
  category: 'antibiotic' | 'prokinetic' | 'natural' | 'probiotic' | 'supplement' | 'other';
  targetDose: string;                   // ex : "550mg", "2 gélules"
  frequency: string;                    // ex : "2x/jour", "1x le soir"
  timing?: string;                      // ex : "30min avant repas"
  mode: 'continuous' | 'cure';
  active: boolean;
  hidden: boolean;                      // masqué mais historique conservé
  reminders: ReminderConfig[];
}

interface CureConfig {
  id: string;
  treatmentId: string;
  startDate: Date;
  endDate: Date;                        // calculée depuis durée ou saisie directe
  durationDays: number;
  notes?: string;
  status: 'active' | 'completed' | 'interrupted';
}

interface IntakeEntry {
  id: string;                           // UUID v4
  timestamp: Date;                      // horodatage de saisie
  takenAt: Date;                        // heure réelle de prise (modifiable)
  treatmentId: string;
  cureId?: string;                      // lié à une cure si applicable
  status: 'taken' | 'skipped';
  actualDose?: string;                  // si différente de la dose cible
  notes?: string;
  skipReason?: 'forgot' | 'side_effect' | 'deliberate' | 'other';
}

interface ReminderConfig {
  id: string;
  time?: string;                        // heure fixe HH:mm
  relativeToMeal?: 'before' | 'after'; // relatif à un repas
  relativeMinutes?: number;            // ex : 30 (avant/après)
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  enabled: boolean;
}
```

### 1.6 Entrées de type Note libre

#### 1.6.1 Principes

- La note libre est une entrée **autonome par défaut** — elle n'a pas besoin d'être rattachée à quoi que ce soit pour être sauvegardée.
- Elle peut optionnellement être **liée à une ou plusieurs entrées existantes** du journal (repas, symptôme, prise médicamenteuse) pour enrichir le contexte sans dupliquer la saisie.
- Les **tags sont générés par Claude** à la validation — l'utilisateur confirme ou modifie, il ne les saisit jamais à la main.
- En l'absence de connexion ou de clé API, la note est sauvegardée sans tags ; l'analyse IA est mise en file d'attente.
- Le texte est **brut uniquement** — pas de formatage, pas de markdown. Objectif : saisie rapide, pas un éditeur de documents.

---

#### 1.6.2 Modes de saisie

Cohérents avec le reste du journal — même interface, mêmes boutons d'accès :

**Texte libre** — champ multi-lignes, sans limite de longueur. Auto-expansion au fur et à mesure de la saisie.

**Vocal** — Web Speech API, même comportement qu'en 1.3.1 Mode A. La transcription apparaît en temps réel et est éditable avant validation.

**Photo** — pour capturer un document (ordonnance, résultat d'analyse, étiquette alimentaire, note manuscrite). L'envoi à Claude pour extraction de texte nécessite une connexion. Le bouton photo est **désactivé hors ligne** ; le mode texte ou vocal prend le relais.

---

#### 1.6.3 Liaison à une entrée existante (optionnel)

Accessible via le bouton **"Lier à…"** dans le panneau de saisie :

- L'utilisateur voit la liste des entrées du jour (repas, symptômes, prises) sous forme de chips tappables.
- Il peut en sélectionner une ou plusieurs.
- La liaison est **bidirectionnelle** : la note apparaît aussi dans le détail de l'entrée liée.
- Une note peut également être liée à une entrée d'un autre jour (utile pour les observations rétrospectives — ex : *"j'ai réalisé que la crise de jeudi était liée au repas du midi"*).

Cas d'usage typiques :
- Annoter un repas après coup (*"ballonnements intenses 2h après, probablement les lentilles corail"*)
- Commenter une douleur (*"même type de crampe qu'il y a 3 semaines"*)
- Retranscrire une information médicale (*"gastro dit d'arrêter le probiotique pendant la cure"*)

---

#### 1.6.4 Tags générés par l'IA

À la validation, si la clé API est disponible, Claude analyse le contenu de la note et retourne 1 à 3 tags contextuels. Voir Annexe A.3 pour le prompt.

Tags prédéfinis reconnus (liste extensible) :

`repas` `douleur` `transit` `médecin` `stress` `sommeil` `traitement` `réaction` `nouveau symptôme` `observation` `question` `amélioration` `rechute` `résultat` `ordonnance`

L'utilisateur voit les tags proposés sous la note et peut :
- Les valider tous d'un tap ("✓ OK")
- Supprimer un tag individuel
- Ajouter un tag libre non listé

---

#### 1.6.5 Structure de données

```typescript
interface NoteEntry {
  id: string;                          // UUID v4
  timestamp: Date;                     // horodatage de saisie
  occurredAt: Date;                    // moment de l'observation (modifiable)
  inputMode: 'text' | 'voice' | 'photo';
  content: string;                     // texte brut (transcription si vocal, extrait IA si photo)
  linkedEntries: LinkedEntry[];        // entrées liées (optionnel)
  tags: string[];                      // tags confirmés par l'utilisateur
  aiTagSuggestions?: string[];         // suggestions IA avant confirmation
  aiAnalyzed: boolean;
  editedAt?: Date;
}

interface LinkedEntry {
  entryId: string;                     // id de l'entrée liée
  entryType: 'meal' | 'symptom' | 'intake' | 'note';
  entryDate: Date;                     // pour les liens inter-journées
  label: string;                       // label affiché (ex : "Déjeuner — 12h30")
}
```

---

## Annexe A — Prompts Claude API

### A.1 — Prompt analyse photo repas

```
Tu es un assistant spécialisé en nutrition digestive. 
L'utilisateur souffre de SIBO mixte (méthane + hydrogène), de gastroparésie et de dysbiose.

Analyse cette photo de repas et retourne UNIQUEMENT un JSON valide, sans texte autour, 
au format suivant :
{
  "items": [
    {
      "name": "nom de l'aliment en français",
      "quantity": "estimation de la portion si visible",
      "fodmapLevel": "low | medium | high | unknown",
      "confidence": "high | medium | low"
    }
  ],
  "globalNote": "observation courte si pertinente (max 1 phrase)"
}

Sois conservateur : en cas de doute sur un aliment, indique confidence: "low".
Ne liste que ce qui est clairement visible ou très fortement probable.
```

### A.2 — Prompt extraction texte/vocal repas

```
Tu es un assistant spécialisé en nutrition digestive.
L'utilisateur souffre de SIBO mixte (méthane + hydrogène), de gastroparésie et de dysbiose.

Extrait les aliments mentionnés dans ce texte et retourne UNIQUEMENT un JSON valide :
{
  "items": [
    {
      "name": "nom normalisé de l'aliment en français",
      "quantity": "portion mentionnée ou null",
      "fodmapLevel": "low | medium | high | unknown"
    }
  ]
}

Texte à analyser : "{{RAW_INPUT}}"
```

### A.3 — Prompt tagging note libre

```
Tu es un assistant spécialisé en suivi médical digestif.
L'utilisateur souffre de SIBO mixte (méthane + hydrogène), de gastroparésie et de dysbiose.

Analyse cette note et retourne UNIQUEMENT un JSON valide, sans texte autour :
{
  "tags": ["tag1", "tag2"],
  "summary": "résumé en une phrase courte (max 10 mots)"
}

Règles :
- 1 à 3 tags maximum, choisis parmi : repas, douleur, transit, médecin, stress, sommeil,
  traitement, réaction, nouveau symptôme, observation, question, amélioration, rechute,
  résultat, ordonnance. Si aucun ne convient, propose un tag libre en minuscules.
- Le résumé est utilisé comme titre de la note dans le journal (neutre, factuel).

Note à analyser : "{{NOTE_CONTENT}}"
```

### A.4 — Prompt analyse approfondie (Module 2)

```
Tu es un assistant spécialisé en suivi médical digestif.
L'utilisateur souffre de SIBO mixte (méthane + hydrogène), de gastroparésie et de dysbiose.

Analyse les données ci-dessous et retourne UNIQUEMENT un JSON valide, sans texte autour :
{
  "correlations": [
    {
      "finding": "description de la corrélation observée",
      "confidence": "high | medium | low",
      "supportingDays": ["YYYY-MM-DD"]
    }
  ],
  "patterns": [
    {
      "finding": "description du pattern temporel",
      "confidence": "high | medium | low"
    }
  ],
  "cureComparison": {
    "available": true,
    "beforeAvg": { "bloating": 0, "pain": 0, "energy": 0 },
    "duringAfterAvg": { "bloating": 0, "pain": 0, "energy": 0 },
    "trend": "improving | stable | worsening"
  },
  "alerts": [
    {
      "message": "signal faible ou alerte",
      "severity": "info | warning"
    }
  ],
  "recommendations": [
    {
      "action": "suggestion concrète pour la semaine suivante",
      "toValidateWithDoctor": true
    }
  ],
  "globalConfidence": "high | medium | low",
  "dataCoverageNote": "observation sur la qualité/complétude des données si pertinent"
}

Règles :
- Maximum 3 corrélations, 2 patterns, 3 alertes, 3 recommandations.
- Sois conservateur : ne rapporte que ce qui est clairement soutenu par les données.
- Toutes les recommendations ont toValidateWithDoctor: true.
- Si les données sont insuffisantes pour une section, retourne un tableau vide.

Données à analyser (fenêtre de {{WINDOW_DAYS}} jours) :
{{CONTEXT_DATA}}
```

### A.5 — Prompt synthèse rapport médecin (Module 3)

```
Tu es un assistant de suivi médical digestif. Tu aides à préparer un résumé structuré
pour un médecin gastro-entérologue ou généraliste.

À partir des données de suivi ci-dessous, rédige une synthèse médicale sobre et factuelle.
Retourne UNIQUEMENT un JSON valide, sans texte autour :
{
  "summary": "paragraphe de synthèse en langage médical sobre (3 à 5 phrases)",
  "significantCorrelations": [
    "corrélation 1 formulée de façon médicale",
    "corrélation 2"
  ],
  "pointsForConsultation": [
    "point d'attention 1 à aborder avec le praticien",
    "point d'attention 2",
    "point d'attention 3"
  ],
  "disclaimer": "Synthèse générée par intelligence artificielle — à valider par le praticien."
}

Règles :
- Ton médical sobre, sans dramatisation ni minimisation.
- Maximum 3 corrélations significatives, maximum 3 points de consultation.
- Toujours inclure le disclaimer tel quel dans le champ disclaimer.
- Ne pas formuler de diagnostic, uniquement des observations et questions à explorer.

Données de la période ({{START_DATE}} au {{END_DATE}}) :
{{REPORT_DATA}}
```

### A.6 — Prompt résumé de fin de session Coach (Module 4)

```
Résume cette conversation entre un utilisateur et le Coach FlowEase.
Retourne UNIQUEMENT un JSON valide, sans texte autour :
{
  "summary": "résumé factuel en 5 à 10 lignes",
  "topicsDiscussed": ["sujet 1", "sujet 2"],
  "keyAdvice": ["conseil ou suggestion important formulé pendant la session"],
  "followUpPoints": ["point à surveiller ou à aborder lors de la prochaine session"],
  "userMood": "positive | neutral | concerned | distressed"
}

Règles :
- Le résumé sera réinjecté au début de la prochaine session — sois factuel et utile.
- Ne reproduis pas les échanges mot pour mot, synthétise.
- userMood reflète l'état général exprimé par l'utilisateur pendant la conversation.
- Maximum 3 éléments par tableau.

Conversation à résumer :
{{CONVERSATION_HISTORY}}
```

---

## Questions ouvertes & décisions à prendre

| # | Question | Statut |
|---|---|---|
| 1 | Niveau de détail des symptômes (liste fixe vs personnalisable) | ✅ Liste prédéfinie + personnalisation utilisateur |
| 2 | Saisie douleurs : échelle, localisation, ou combinaison | ✅ Intensité + schéma SVG 6 zones + type de douleur |
| 3 | Médicaments : intégré au journal ou module séparé | ✅ Saisie dans le journal, configuration dans les paramètres |
| 4 | Stockage photos : IndexedDB blob ou référence fichier | ✅ Pas de stockage — analyse IA immédiate obligatoire. Bouton photo désactivé hors ligne (fallback vocal/texte suggéré) |
| 5 | Gist sync : optionnelle dès v1 ou reportée en v2 | ✅ Export/import JSON manuel en v1 — sync Gist automatique en v2 (architecture UUID/timestamp prête) |
| 6 | Langue de l'interface : français uniquement ou i18n dès le départ | ✅ Français + anglais dès la v1 via `@angular/localize` |

---

*Module 1 — Journal quotidien : ✅ Spécifications complètes*  
*Module 2 — Analyse & tendances : ✅ Spécifications complètes*  
*Module 3 — Rapport médecin : ✅ Spécifications complètes*  
*Module 4 — Coach IA : ✅ Spécifications complètes*  
*Module 5 — Paramètres : ✅ Spécifications complètes*  
*Prochaine étape : Annexes complètes + architecture Angular*

---

## Module 5 — Paramètres

### 5.1 Objectif

Centraliser toutes les configurations de l'application. Les paramètres sont organisés en sections distinctes, accessibles depuis le menu principal. Toutes les données sont stockées en localStorage (préférences légères) ou IndexedDB (données volumineuses comme les listes personnalisées).

---

### 5.2 Section — Mon profil médical

Informations injectées dans tous les system prompts Claude. Configurées une fois à l'installation, modifiables à tout moment.

| Champ | Type | Valeur par défaut |
|---|---|---|
| Prénom (optionnel) | Texte libre | Vide |
| Conditions suivies | Cases à cocher | SIBO méthane ✅ SIBO hydrogène ✅ Gastroparésie ✅ Dysbiose ✅ |
| Autres conditions | Texte libre | Vide |
| Protocole en cours | Texte libre | Vide |
| Médecin référent (optionnel) | Texte libre | Vide |
| Date du diagnostic | Date | Vide |
| Allergies connues | Texte libre | Vide |
| Restrictions alimentaires spécifiques | Texte libre | Vide |

---

### 5.3 Section — Clé API Anthropic

- Champ de saisie de la clé API (type password, masquée par défaut)
- Bouton "Afficher / masquer"
- Bouton "Tester la connexion" — envoie un appel minimal à Claude pour vérifier la validité
- Statut affiché : ✅ Clé valide / ❌ Clé invalide / ⚠️ Non renseignée
- Stockage : localStorage uniquement, jamais dans le code source ni dans IndexedDB
- Avertissement affiché : *"Votre clé API est stockée localement sur cet appareil uniquement. Elle n'est jamais envoyée à un serveur tiers."*
- Lien vers la page de création de clé API Anthropic

---

### 5.4 Section — Mes traitements

Interface de gestion de la liste des traitements (référencée en 1.5.2) :

- Liste des traitements actifs et masqués
- Bouton "Ajouter un traitement" : nom, catégorie, dose cible, fréquence, timing, mode (cure / continu)
- Tap sur un traitement existant → édition inline
- Bouton "Masquer" (conserve l'historique) vs "Supprimer" (suppression définitive avec confirmation)
- Gestion des cures actives : date de début, durée, statut
- Configuration des rappels par traitement (heure fixe ou relatif à un repas)

---

### 5.5 Section — Mon profil de symptômes

Interface de personnalisation de la liste des symptômes (référencée en 1.4.6) :

- Liste des symptômes actifs, masqués, et personnalisés
- Réordonnement par glisser-déposer
- Bouton "Ajouter un symptôme" : nom, mode de saisie (intensité / fréquence / oui-non)
- Bouton "Réinitialiser à la liste par défaut" avec confirmation

---

### 5.6 Section — Coach IA

| Paramètre | Options | Défaut |
|---|---|---|
| Mode d'interaction | Chat uniquement / Chat + suggestions | Chat uniquement |
| Contexte par défaut | Aujourd'hui / 7j / 14j / 30j / Profil uniquement | 7 jours |
| Afficher l'indicateur de tokens | Oui / Non | Oui |
| Langue du Coach | Français / English | Selon langue interface |
| Historique des sessions | Consulter / Supprimer tout | — |

---

### 5.7 Section — Données & confidentialité

#### Export manuel (v1)

- Bouton **"Exporter toutes mes données"** → génère un fichier `flowease_backup_YYYY-MM-DD.json` téléchargeable
- Contenu : toutes les entrées IndexedDB (journal, symptômes, prises, notes, sessions Coach, rapports)
- Format JSON structuré, lisible et réimportable

- Bouton **"Importer une sauvegarde"** → sélection d'un fichier JSON
- Validation du format avant import
- Option : "Fusionner avec les données existantes" ou "Remplacer toutes les données" (avec confirmation)

#### Sync GitHub Gist (v2 — placeholder)

- Section visible mais désactivée en v1
- Message : *"La synchronisation multi-appareils via GitHub Gist sera disponible dans une prochaine version."*
- Architecture UUID/timestamp déjà prête pour cette fonctionnalité

#### Suppression des données

- Bouton **"Supprimer toutes mes données"** → confirmation en deux étapes, suppression complète IndexedDB + localStorage
- Bouton **"Supprimer l'historique du Coach"** → supprime uniquement les sessions de chat et résumés

---

### 5.8 Section — Affichage & langue

| Paramètre | Options | Défaut |
|---|---|---|
| Langue de l'interface | Français / English | Français |
| Thème | Clair / Sombre / Système | Système |
| Fenêtre temporelle par défaut | 7j / 30j / 90j | 7 jours |
| Format de date | JJ/MM/AAAA / MM/DD/YYYY | Selon langue |

---

### 5.9 Section — À propos

- Version de l'application
- Lien vers le dépôt GitHub
- Lien vers la documentation Anthropic API
- Mention légale : *"FlowEase est un outil de suivi personnel. Il ne remplace pas un avis médical professionnel."*

---

## Module 4 — Coach IA

### 4.1 Objectif

Offrir un espace conversationnel où l'utilisateur peut interroger Claude sur sa situation personnelle, obtenir des suggestions alimentaires, comprendre ses symptômes, préparer une consultation ou simplement exprimer ce qu'il ressent. Le Coach IA est **conscient du contexte de l'utilisateur** — il ne répond pas de façon générique mais en tenant compte des données réelles du journal.

---

### 4.2 Mode d'interaction

L'utilisateur choisit son mode dans **Paramètres > Coach IA** :

**Mode Chat uniquement** — interface conversationnelle classique, l'utilisateur pose ses questions librement. Aucune suggestion proactive.

**Mode Chat + suggestions ponctuelles** — en plus du chat, Claude génère occasionnellement une suggestion courte affichée en haut du journal (ex : *"Vous n'avez pas saisi de repas depuis 6h — voulez-vous noter votre déjeuner ?"* ou *"Vos ballonnements sont en hausse depuis 3 jours — souhaitez-vous en parler avec le Coach ?"*). Ces suggestions sont **déclenchées localement** (règles simples côté client, sans appel API) et servent uniquement de point d'entrée vers le chat.

---

### 4.3 Contexte injecté dans chaque conversation

L'utilisateur choisit le contexte à inclure **à l'ouverture de chaque nouvelle conversation**, via un panneau de sélection rapide :

| Option | Contenu injecté | Coût tokens estimé |
|---|---|---|
| Aujourd'hui | Entrées du jour uniquement | Très faible |
| 7 derniers jours | Résumé agrégé sur 7 jours | Faible |
| 14 derniers jours | Résumé agrégé sur 14 jours | Modéré |
| 30 derniers jours | Résumé agrégé sur 30 jours | Élevé |
| Sans données | Profil médical uniquement | Minimal |

Le **profil médical de base** est toujours injecté quel que soit le choix (conditions, protocole en cours, traitements actifs) — c'est le socle permanent du system prompt.

Les données sont **agrégées avant envoi** (même logique qu'en 2.5.2) — jamais le brut de chaque entrée individuelle.

---

### 4.4 Mémoire entre les sessions

Claude n'a pas de mémoire native entre les appels API. La continuité est assurée ainsi :

**En fin de session** (quand l'utilisateur ferme le chat ou après 10 minutes d'inactivité) : un appel API résume automatiquement la conversation en 5 à 10 lignes. Ce résumé est sauvegardé en IndexedDB.

**En début de nouvelle session** : le résumé de la session précédente est injecté dans le system prompt, sous la forme :

```
Résumé de la dernière conversation (le [date]) :
[résumé en texte libre, 5-10 lignes]
```

Cela donne à Claude la continuité nécessaire sans réinjecter l'intégralité de l'historique de chat.

Un seul résumé de session précédente est injecté (pas une chaîne de résumés). L'utilisateur peut consulter les résumés des sessions passées dans **"Historique du Coach"**.

---

### 4.5 Interface de chat

- Design sobre : bulles de conversation classiques, distinctions claire utilisateur / Claude
- **Questions suggérées** affichées au démarrage d'une nouvelle conversation pour aider l'utilisateur à démarrer :
  - *"Que puis-je manger ce soir ?"*
  - *"Pourquoi ai-je eu si mal hier ?"*
  - *"Prépare mes questions pour ma prochaine consultation"*
  - *"Comment va mon observance ce mois-ci ?"*
- Ces suggestions sont statiques (pas d'appel API) et disparaissent dès le premier message
- L'historique de la conversation en cours est affiché en scroll, les messages les plus récents en bas
- Bouton **"Nouvelle conversation"** — démarre une session fraîche (déclenche la sauvegarde du résumé de la session courante)
- Bouton **"Copier la réponse"** sur chaque message de Claude
- Indicateur de tokens consommés dans la session en cours (affiché discrètement en bas de l'écran)

---

### 4.6 Limites et garde-fous

- Claude est configuré via le system prompt pour **ne jamais se substituer à un avis médical**. Chaque réponse touchant à un traitement ou symptôme grave inclut un rappel : *"À valider avec votre médecin."*
- Si l'utilisateur exprime une douleur intense ou un symptôme alarmant, Claude l'invite explicitement à contacter un professionnel de santé.
- Le Coach **ne prescrit pas** : il suggère, explique, aide à formuler des questions pour le médecin.
- Pas de mode automatique : chaque appel API est déclenché par un message explicite de l'utilisateur.

---

### 4.7 Structure de données

```typescript
interface CoachSession {
  id: string;                          // UUID v4
  startedAt: Date;
  endedAt?: Date;
  contextWindow: 'today' | '7d' | '14d' | '30d' | 'profile_only';
  messages: CoachMessage[];
  summary?: string;                    // résumé généré en fin de session
  summarizedAt?: Date;
  tokenCount?: number;                 // total tokens consommés dans la session
}

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}
```

---

### 4.8 Prompts Claude API

#### System prompt de base (toujours injecté)

```
Tu es FlowEase Coach, un assistant de suivi médical digestif bienveillant et rigoureux.
Tu accompagnes un utilisateur souffrant de SIBO mixte (méthane + hydrogène), 
de gastroparésie et de dysbiose au quotidien.

Ton rôle :
- Aider à comprendre les symptômes et leurs causes possibles
- Suggérer des adaptations alimentaires Low-FODMAP adaptées à la gastroparésie
- Aider à préparer les consultations médicales
- Analyser les tendances des données du journal si l'utilisateur le demande

Règles absolues :
- Tu ne prescris jamais de traitement, ne modifies jamais un protocole médical
- Pour tout symptôme grave ou douleur intense, tu renvoies vers un professionnel de santé
- Chaque suggestion alimentaire ou liée à un traitement est accompagnée de "À valider avec votre médecin"
- Tu réponds en [FR/EN selon la langue de l'interface]
- Tu es concis : tes réponses font moins de 200 mots sauf si l'utilisateur demande un développement

Profil de l'utilisateur :
- Conditions : {{CONDITIONS}}
- Protocole en cours : {{PROTOCOL}}
- Traitements actifs : {{TREATMENTS}}

{{PREVIOUS_SESSION_SUMMARY}}

Données de contexte sélectionnées par l'utilisateur :
{{CONTEXT_DATA}}
```

#### Prompt résumé de fin de session (Annexe A.6)

```
Résume cette conversation en 5 à 10 lignes maximum, en retenant :
- Les sujets principaux abordés
- Les suggestions importantes formulées
- Les points à suivre ou à aborder avec le médecin
- Le ton général (l'utilisateur allait-il bien, était-il inquiet ?)

Sois factuel et concis. Ce résumé sera réinjecté au début de la prochaine session.

Conversation :
{{CONVERSATION_HISTORY}}
```

---

## Module 3 — Rapport médecin

### 3.1 Objectif

Produire un document structuré et lisible qu'un gastro-entérologue ou généraliste peut parcourir en consultation en moins de 2 minutes. Le rapport est **généré à la demande**, uniquement quand l'utilisateur le décide.

---

### 3.2 Déclenchement

- Bouton **"Générer un rapport"** accessible depuis le menu principal
- L'utilisateur choisit :
  - La **fenêtre temporelle** à couvrir (7 / 14 / 30 / 90 jours, ou plage personnalisée)
  - Le **format de sortie** : PDF téléchargeable ou texte formaté à copier-coller
  - En option : **"Ajouter une synthèse rédigée par Claude"** (checkbox, désactivée par défaut)
- Si la synthèse IA est demandée : affichage du nombre de jours inclus et rappel du coût en tokens avant confirmation

---

### 3.3 Contenu du rapport

#### Bloc 1 — En-tête (automatique, sans IA)

```
Rapport de suivi — FlowEase
Période : du [date début] au [date fin]
Généré le : [date]
Patient : [prénom optionnel, configurable dans les paramètres]
Conditions suivies : SIBO méthane + hydrogène / gastroparésie / dysbiose
Protocole en cours : [nom du protocole si renseigné]
```

#### Bloc 2 — Résumé des symptômes (automatique, sans IA)

- Score de bien-être moyen sur la période
- Tableau des symptômes principaux : intensité moyenne / intensité max / fréquence de saisie
- Jours les plus difficiles (top 3, avec date et score)
- Évolution globale : stable / en amélioration / en dégradation (calculé sur les 2 moitiés de la période)

#### Bloc 3 — Observance des traitements (automatique, sans IA)

- Tableau par traitement : posologie cible / taux d'observance / nombre de prises manquées
- Pour les cures : dates de début/fin, statut (en cours / terminée / interrompue)
- Prises manquées groupées si récurrentes (ex : "soir — 8 fois sur 14 jours")

#### Bloc 4 — Alimentation (automatique, sans IA)

- Aliments les plus fréquents sur la période
- Aliments flaggés FODMAP élevé consommés (fréquence)
- Repas non saisis (jours sans entrée alimentaire)

#### Bloc 5 — Notes pertinentes (automatique, sans IA)

- Liste des notes libres de la période taguées `médecin`, `résultat`, `ordonnance`, `nouveau symptôme`
- Affichées telles quelles, avec date

#### Bloc 6 — Synthèse rédigée par Claude (optionnel, à la demande)

Activé uniquement si l'utilisateur coche l'option. Claude reçoit les blocs 1 à 5 en contexte et produit :

- Un paragraphe de synthèse en langage médical sobre (3 à 5 phrases)
- Les corrélations les plus significatives observées sur la période
- 2 à 3 points d'attention à aborder en consultation
- Toujours accompagné de la mention : *"Synthèse générée par intelligence artificielle — à valider par le praticien."*

Voir Annexe A.5 pour le prompt.

---

### 3.4 Formats de sortie

**PDF téléchargeable**
- Généré côté client via la librairie `jsPDF` (pas de serveur)
- Mise en page sobre : police lisible, sections bien délimitées, logo FlowEase en en-tête
- Nom de fichier automatique : `FlowEase_rapport_YYYY-MM-DD.pdf`

**Texte formaté à copier-coller**
- Markdown structuré affiché dans l'app, sélectionnable et copiable en un tap
- Utilisable dans un email à son médecin, un message, ou un document partagé

---

### 3.5 Historique des rapports

- Chaque rapport généré est sauvegardé en IndexedDB (métadonnées + contenu texte)
- Accessible depuis **"Mes rapports"** : liste chronologique avec date, fenêtre couverte, format
- Limite : 20 rapports conservés (les plus anciens sont supprimés automatiquement)
- Un rapport peut être regénéré à partir des mêmes paramètres en un tap

---

## Module 2 — Analyse & tendances

### 2.1 Objectif

Transformer les données du journal en visualisations lisibles et en insights actionnables. Ce module est **majoritairement offline et gratuit** — seule l'analyse IA approfondie consomme des tokens, et uniquement à la demande explicite de l'utilisateur.

---

### 2.2 Principe de séparation offline / IA

| Fonctionnalité | Offline | IA requise | Coût tokens |
|---|---|---|---|
| Graphiques d'évolution des symptômes | ✅ | ❌ | Nul |
| Observance des traitements | ✅ | ❌ | Nul |
| Calendrier de bien-être global | ✅ | ❌ | Nul |
| Corrélations repas → symptômes | ❌ | ✅ | Modéré |
| Comparaison avant/après cure | ❌ | ✅ | Modéré |
| Détection de patterns et insights | ❌ | ✅ | Modéré |

---

### 2.3 Fenêtres temporelles

- Fenêtre par défaut : **7 jours**
- Fenêtres disponibles : 7 jours / 30 jours / 90 jours
- Sélectionnable par l'utilisateur via un sélecteur en haut de l'écran d'analyse
- La fenêtre choisie s'applique à tous les graphiques simultanément

---

### 2.4 Visualisations offline (sans IA)

#### 2.4.1 Courbes d'évolution des symptômes

- Un graphique en courbe par symptôme tracké (intensité dans le temps)
- Superposition possible de 2 symptômes sur le même graphique (ex : ballonnements + douleurs)
- Les jours sans saisie apparaissent en pointillé (données manquantes, pas interpolées)
- Tap sur un point → affiche le détail de la saisie ce jour-là

#### 2.4.2 Observance des traitements

- Vue calendrier : chaque jour coloré selon le taux de prises confirmées (vert / orange / rouge)
- Score d'observance global par traitement sur la fenêtre sélectionnée (ex : "Rifaximine : 87%")
- Pour les cures : barre de progression + date de fin estimée

#### 2.4.3 Calendrier de bien-être global

- Vue mensuelle type "heatmap" : chaque jour coloré selon le score de bien-être saisi
- Donne une lecture visuelle immédiate des périodes difficiles vs périodes stables
- Tap sur un jour → résumé des entrées de ce jour (repas, symptômes, prises)

---

### 2.5 Analyse IA approfondie (à la demande)

#### 2.5.1 Déclenchement

- Bouton explicite **"Lancer une analyse"** — jamais automatique
- Au déclenchement, un panneau s'affiche avec :
  - Fenêtre de données à envoyer : **14 jours par défaut**, modifiable par l'utilisateur (7 / 14 / 30 / 90 jours)
  - Rappel indicatif du coût approximatif en tokens selon la fenêtre choisie
  - Bouton "Confirmer et analyser"
- Si une analyse a déjà été effectuée récemment : message *"Dernière analyse : il y a X jours — les données ont évolué depuis [oui/non]. Relancer ?"*
- La date et la fenêtre de la dernière analyse sont mémorisées en localStorage

#### 2.5.2 Construction du contexte envoyé à Claude

Seules les données pertinentes pour l'analyse sont envoyées — pas l'intégralité de l'historique brut. Le contexte est construit côté client avant l'appel API :

```typescript
interface AnalysisContext {
  profile: {
    conditions: string[];              // ["SIBO méthane", "SIBO hydrogène", "gastroparésie", "dysbiose"]
    activeProtocol: string;            // description du protocole en cours
  };
  windowDays: number;                  // fenêtre choisie par l'utilisateur
  meals: MealSummary[];                // repas avec aliments et flags FODMAP
  symptoms: SymptomSummary[];          // symptômes agrégés par jour
  intakes: IntakeSummary[];            // prises médicamenteuses avec observance
  notes: string[];                     // notes libres de la période (texte uniquement)
}
```

Les données sont **agrégées par jour** avant envoi (pas le détail de chaque entrée individuelle) pour minimiser les tokens tout en conservant les patterns temporels.

#### 2.5.3 Types d'analyse produits par Claude

Claude reçoit le contexte et produit une analyse structurée en JSON (voir Annexe A.4) couvrant :

**Corrélations repas → symptômes**
Identification des aliments ou groupes d'aliments qui précèdent systématiquement une aggravation des symptômes dans la fenêtre analysée. Ex : *"Les repas contenant des légumineuses sont suivis d'une augmentation des ballonnements de +3 points en moyenne dans les 2h."*

**Patterns temporels**
Détection de récurrences : heure de la journée, jour de la semaine, semaine dans un cycle de cure. Ex : *"Les symptômes sont systématiquement plus intenses en fin de journée."*

**Comparaison avant/après cure**
Si une cure est en cours ou vient de se terminer dans la fenêtre : comparaison automatique des scores moyens avant/pendant/après. Pertinent pour évaluer l'efficacité d'un protocole antibiotique.

**Alertes et signaux faibles**
Signaux que l'utilisateur n'aurait pas détectés seul : dégradation progressive d'un symptôme, chute d'observance corrélée à une aggravation, aliment "safe" qui semble poser problème dans le contexte personnel.

**Recommandations actionnables**
1 à 3 suggestions concrètes pour la semaine suivante — toujours formulées comme des pistes à valider avec le médecin, jamais comme des prescriptions.

#### 2.5.4 Affichage des résultats

Les résultats s'affichent dans des **cartes d'insight** distinctes, chacune correspondant à un type d'analyse. Chaque carte indique :
- La fenêtre de données utilisée
- La date de l'analyse
- Un niveau de confiance (élevé / modéré / faible) retourné par Claude
- Un bouton "Copier pour mon médecin" (texte formaté prêt à coller)

Les résultats sont **sauvegardés en IndexedDB** et restent consultables offline jusqu'à la prochaine analyse.

---

### 2.6 Prompt Claude API — Analyse approfondie

Voir Annexe A.4.
