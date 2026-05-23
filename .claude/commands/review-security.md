# /review-security

Vérifie les risques de sécurité dans le fichier fourni en argument.
Contexte : SPA Angular sur GitHub Pages sans backend,
clé API Anthropic dans localStorage, données médicales dans IndexedDB.

## Instructions

Lis le fichier cible et vérifie chaque point ci-dessous.
Pour chaque risque trouvé : fichier, ligne, nature du risque, correction exacte.

---

## Clé API Anthropic

- [ ] Absente du code source et des fichiers environment.*
- [ ] Absente des bundles compilés (jamais dans une constante de module)
- [ ] Lue uniquement via LocalSettingsAdapter.getApiKey() au moment de l'appel
- [ ] Jamais stockée en propriété de classe entre deux appels
- [ ] Absente de tout console.log, console.error, console.warn
- [ ] Absente des messages d'erreur (Error(), throw new Error())
- [ ] Absente des paramètres d'URL (query params, hash, path)
- [ ] Envoyée uniquement vers https://api.anthropic.com — jamais ailleurs

## Données médicales (IndexedDB)

- [ ] Aucune donnée médicale dans les query params ou le hash d'URL
- [ ] Aucun console.log contenant des données médicales
- [ ] Aucun envoi de données médicales vers un service tiers non consenti
- [ ] Les erreurs IndexedDB ne fuient pas de données dans leur message

## Gestion des erreurs réseau

- [ ] Tous les appels HTTP sont dans un try/catch
- [ ] Le catch retourne null ou un état vide — jamais le contenu de l'erreur au template
- [ ] HttpTestingController.verify() dans les tests (pas d'appels non interceptés)

## localStorage

- [ ] Seules les préférences et la clé API sont dans localStorage
- [ ] La clé API est stockée sous une clé non devinable (pas 'apiKey' ou 'key')
- [ ] Aucune donnée médicale dans localStorage

## Risques XSS

- [ ] Pas d'utilisation de innerHTML ou [innerHTML] avec des données utilisateur
- [ ] Pas de DomSanitizer.bypassSecurityTrustHtml() sans justification
- [ ] Les données IndexedDB affichées dans le template passent par Angular binding ({{ }})

---

Synthèse : risques bloquants / importants / mineurs
