# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journal\meal-entry.spec.ts >> Saisie d'un repas >> aliments fréquents → tap unique suffit → repas envoyé
- Location: e2e\journal\meal-entry.spec.ts:45:7

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: locator.click: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Riz blanc/ })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - main [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - button "Retour au journal" [ref=e9] [cursor=pointer]:
          - img [ref=e10]: arrow_back
        - heading "Saisir un repas" [level=1] [ref=e13]
      - generic [ref=e14]:
        - radiogroup "Mode de saisie du repas" [ref=e15]:
          - radio "Mode texte" [ref=e16] [cursor=pointer]:
            - img [ref=e19]: edit
          - radio "Mode vocal" [ref=e20] [cursor=pointer]:
            - img [ref=e23]: mic
          - radio "Mode photo" [ref=e24] [cursor=pointer]:
            - img [ref=e27]: camera_alt
          - radio "Mode aliments fréquents" [checked] [active] [ref=e28] [cursor=pointer]:
            - img [ref=e32]: history
        - generic [ref=e33]: Récurrents — aliments fréquents de l'historique
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e38] [cursor=pointer]:
            - generic [ref=e39]: Type de repas
            - combobox "Type de repas" [ref=e41]:
              - generic [ref=e42]:
                - generic [ref=e44]: Déjeuner
                - img [ref=e47]
          - generic [ref=e52]:
            - generic [ref=e53]: Heure
            - textbox "Heure du repas" [ref=e55]: 15:05
        - list "Aliments fréquents" [ref=e58]:
          - listitem "Riz blanc" [ref=e59] [cursor=pointer]
          - listitem "Poulet grillé" [ref=e60] [cursor=pointer]
          - listitem "Pain de riz" [ref=e61] [cursor=pointer]
        - generic [ref=e62]:
          - generic [ref=e65]:
            - generic [ref=e66]: Ajouter un aliment
            - textbox "Nom de l'aliment à ajouter" [ref=e68]:
              - /placeholder: Nom de l'aliment
          - button "Ajouter l'aliment" [disabled]:
            - img: add_circle
      - generic [ref=e70]:
        - button "Valider et enregistrer le repas" [disabled]:
          - img: check
          - generic: Valider le repas
  - navigation "Navigation principale" [ref=e72]:
    - link "Journal" [ref=e73] [cursor=pointer]:
      - /url: /journal
      - img [ref=e74]: menu_book
      - generic [ref=e75]: Journal
    - link "Analyse" [ref=e76] [cursor=pointer]:
      - /url: /analysis
      - img [ref=e77]: bar_chart
      - generic [ref=e78]: Analyse
    - link "Rapport" [ref=e79] [cursor=pointer]:
      - /url: /report
      - img [ref=e80]: description
      - generic [ref=e81]: Rapport
    - link "Coach" [ref=e82] [cursor=pointer]:
      - /url: /coach
      - img [ref=e83]: chat
      - generic [ref=e84]: Coach
    - link "Paramètres" [ref=e85] [cursor=pointer]:
      - /url: /settings
      - img [ref=e86]: settings
      - generic [ref=e87]: Paramètres
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedIndexedDB } from '../helpers/seed-indexeddb';
  3  | import { installSpeechMock } from '../helpers/mock-speech';
  4  | 
  5  | // Convention : NullAIAdapter actif (pas de clé API en localStorage — défaut en test)
  6  | 
  7  | test.describe('Saisie d\'un repas', () => {
  8  | 
  9  |   test('saisie texte → repas visible dans le journal', async ({ page }) => {
  10 |     await page.goto('/journal/meal');
  11 | 
  12 |     await page.locator('[data-testid="meal-text-input"]').fill('Poulet rôti, riz blanc');
  13 |     await page.locator('[data-testid="submit-meal"]').click();
  14 | 
  15 |     await page.waitForURL('**/journal');
  16 |     await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  17 |   });
  18 | 
  19 |   test('saisie vocale → transcription mockée → AI indisponible affiché', async ({ page }) => {
  20 |     await installSpeechMock(page);
  21 |     await page.goto('/journal/meal');
  22 | 
  23 |     await page.getByLabel('Mode vocal').click();
  24 |     await page.getByLabel('Démarrer la reconnaissance vocale').click();
  25 | 
  26 |     await page.evaluate(() => {
  27 |       (window as Record<string, unknown>)['__mockSpeechResult']('riz blanc poulet grillé');
  28 |     });
  29 | 
  30 |     // NullAIAdapter → ExtractMealFromText retourne [] → ai-unavailable visible
  31 |     await expect(page.locator('[data-testid="ai-unavailable"]')).toBeVisible();
  32 |   });
  33 | 
  34 |   test('bouton photo désactivé si hors-ligne', async ({ page, context }) => {
  35 |     await context.setOffline(true);
  36 |     await page.goto('/journal/meal');
  37 | 
  38 |     await page.getByLabel('Mode photo').click();
  39 | 
  40 |     await expect(
  41 |       page.getByLabel('Photo désactivée — connexion requise'),
  42 |     ).toBeDisabled();
  43 |   });
  44 | 
  45 |   test('aliments fréquents → tap unique suffit → repas envoyé', async ({ page }) => {
  46 |     await page.goto('/journal');
  47 |     await page.waitForLoadState('networkidle');
  48 |     await seedIndexedDB(page);
  49 | 
  50 |     await page.goto('/journal/meal');
  51 |     await page.getByLabel('Mode aliments fréquents').click();
  52 | 
> 53 |     await page.getByRole('button', { name: /Riz blanc/ }).click();
     |                                                           ^ Error: locator.click: Test timeout of 20000ms exceeded.
  54 | 
  55 |     await page.locator('[data-testid="submit-meal"]').click();
  56 |     await page.waitForURL('**/journal');
  57 |     await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  58 |   });
  59 | 
  60 |   test('heure du repas modifiable → heure affichée dans le journal', async ({ page }) => {
  61 |     await page.goto('/journal/meal');
  62 | 
  63 |     await page.locator('[data-testid="meal-text-input"]').fill('Soupe de légumes');
  64 |     await page.locator('[data-testid="meal-time-input"]').fill('19:45');
  65 |     await page.locator('[data-testid="submit-meal"]').click();
  66 | 
  67 |     await page.waitForURL('**/journal');
  68 |     await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  69 |     await expect(page.locator('[data-testid="meal-entry"]').first()).toContainText('19:45');
  70 |   });
  71 | 
  72 | });
  73 | 
```