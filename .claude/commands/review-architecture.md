# /review-architecture

Analyse le fichier ou dossier fourni en argument et vérifie la conformité
à la Clean Architecture et aux principes SOLID de FlowEase.

## Instructions

Lis le fichier cible puis vérifie chaque point ci-dessous.
Pour chaque violation : indique le fichier, la ligne, le principe violé,
et propose la correction exacte.

---

## Checklist Clean Architecture

**Couche domain/**
- [ ] Zéro import Angular (@Injectable, HttpClient, FormControl…)
- [ ] Zéro import de librairie externe (idb, rxjs, jsPDF…)
- [ ] Toutes les propriétés des interfaces sont readonly
- [ ] Aucune classe — uniquement interfaces et fonctions pures

**Couche application/**
- [ ] Imports uniquement depuis domain/ et @angular/core
- [ ] @Inject(TOKEN) utilisé — jamais la classe concrète en paramètre
- [ ] Chaque use case a une seule méthode execute() ou équivalent
- [ ] Aucun import de infrastructure/

**Couche infrastructure/**
- [ ] Implémente explicitement l'interface de domain/ (implements MonPort)
- [ ] getApiKey() appelé à chaque méthode, pas stocké en propriété
- [ ] Try/catch sur chaque appel externe — retourne null, jamais throw
- [ ] NullAIAdapter mis à jour si un nouveau port est ajouté

**Couche presentation/**
- [ ] Imports uniquement depuis application/ et domain/
- [ ] Aucun appel HTTP direct, aucun accès localStorage/IndexedDB direct
- [ ] Mode dégradé IA géré (aiUnavailable flag)
- [ ] Bouton photo/IA désactivé si offline

---

## Checklist SOLID

- [ ] **S** : la classe a une seule raison de changer
- [ ] **O** : ajouter un comportement crée un nouveau fichier
- [ ] **L** : NullAIAdapter est substituable sans impact sur les use cases
- [ ] **I** : les ports IA sont séparés (MealAnalysisPort ≠ CoachPort)
- [ ] **D** : dépendances vers des abstractions (InjectionToken), pas des concrets

---

## Checklist JSDoc

- [ ] Chaque classe/interface exportée a @remarks expliquant son rôle
- [ ] Chaque méthode publique a @param et @returns documentés
- [ ] Les violations de principes connues sont documentées

---

## Checklist sécurité

- [ ] La clé API n'apparaît pas dans le code source
- [ ] Aucun console.log ne peut contenir la clé API
- [ ] Les erreurs réseau sont capturées sans exposer la clé

---

Synthèse finale :
- Nombre de violations par catégorie
- Priorité de correction (bloquant / important / mineur)
