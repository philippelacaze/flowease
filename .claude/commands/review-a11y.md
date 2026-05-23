# /review-a11y

Vérifie l'accessibilité et l'ergonomie mobile du template fourni en argument.
Contexte : utilisateur pouvant être en état de douleur ou de fatigue.
Cible WCAG 2.1 AA.

## Instructions

Lis le fichier template (.html) et vérifie chaque point ci-dessous.
Pour chaque violation : fichier, ligne, critère WCAG ou règle UX, correction exacte.

---

## Accessibilité WCAG 2.1 AA

**Structure et sémantique**
- [ ] Titres hiérarchiques cohérents (h1 → h2 → h3, pas de saut)
- [ ] Landmarks ARIA présents (main, nav, region si pertinent)
- [ ] Listes de choix utilisent ul/li ou role="list"

**Éléments interactifs**
- [ ] Chaque bouton sans texte visible a un aria-label explicite
- [ ] Chaque icône fonctionnelle a aria-hidden="true" si décorative, aria-label si fonctionnelle
- [ ] mat-slider : aria-valuemin, aria-valuemax, aria-valuenow, aria-label présents
- [ ] input sans label visible utilise aria-label ou aria-labelledby
- [ ] Liens avec texte générique ("ici", "cliquez") évités

**États et feedback**
- [ ] Les éléments disabled ont aria-disabled="true"
- [ ] Les éléments en chargement ont aria-busy="true"
- [ ] Les messages d'état utilisent role="status" ou role="alert"
- [ ] data-testid="ai-unavailable" a role="status"

**Focus et navigation clavier**
- [ ] tabindex="-1" uniquement sur les éléments focusés programmatiquement
- [ ] tabindex positif (> 0) absent (anti-pattern)
- [ ] Dialog/bottom-sheet : focus piégé à l'intérieur (focus trap)

**SVG**
- [ ] SVG fonctionnels : role="img" + aria-label
- [ ] SVG décoratifs : aria-hidden="true"
- [ ] Les zones tappables du schéma abdominal ont chacune un aria-label de zone

---

## Ergonomie mobile — état de douleur / fatigue

**Taille des cibles**
- [ ] Zones tappables ≥ 44×44px (vérifier padding si l'élément est petit)
- [ ] Espacement entre deux cibles tappables ≥ 8px

**Friction minimale**
- [ ] Action principale accessible en 1 tap depuis la vue courante
- [ ] Aucun champ obligatoire ne bloque la sauvegarde
- [ ] Bouton photo/IA désactivé hors ligne avec message explicatif (pas silencieusement)

**Feedback**
- [ ] Retour visuel immédiat après tap (ripple Material ou changement d'état visible)
- [ ] État de chargement visible pendant les appels IA (spinner ou skeleton)
- [ ] Message de succès après validation (MatSnackBar ou équivalent)

**Libellés**
- [ ] Langage courant (pas de jargon médical dans les libellés d'action)
- [ ] Libellés courts (≤ 4 mots pour les boutons d'action)
- [ ] Descriptions de symptômes en langage naturel

---

Synthèse : violations bloquantes (accessibilité) / importantes (ergonomie) / mineures
