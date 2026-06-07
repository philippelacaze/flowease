import { test, expect } from '@playwright/test';
import { seedIndexedDB } from '../helpers/seed-indexeddb';
import { installSpeechMock } from '../helpers/mock-speech';

// Convention : NullAIAdapter actif (pas de clé API en localStorage — défaut en test)
// Mode de saisie sélectionné via query param ?mode=voice|photo (défaut = text)

test.describe('Saisie d\'un repas', () => {
  test.describe.configure({ mode: 'serial' });

  test('saisie texte → repas visible dans le journal', async ({ page }) => {
    await page.goto('/journal/meal');

    await page.locator('[data-testid="add-item-input"]').fill('Poulet rôti, riz blanc');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();
    await page.locator('[data-testid="submit-meal"]').click();

    // Après soumission, l'app affiche une confirmation avant de revenir au journal
    await page.getByRole('button', { name: /Retour au journal/ }).click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  });

  test('saisie vocale → transcription mockée → AI indisponible affiché', async ({ page }) => {
    await installSpeechMock(page);
    // Le mode vocal est activé via query param (bouton "Dicter" sur la home navigue ici)
    await page.goto('/journal/meal?mode=voice');

    // autoStart=true démarre la reconnaissance automatiquement — attendre qu'elle soit active
    await expect(page.getByRole('button', { name: /Arrêter la reconnaissance/ })).toBeVisible();

    await page.evaluate(() => {
      (window as Record<string, unknown>)['__mockSpeechResult']('riz blanc poulet grillé');
    });

    // NullAIAdapter → ExtractMealFromText retourne [] → ai-unavailable visible
    await expect(page.locator('[data-testid="ai-unavailable"]')).toBeVisible();
  });

  test('bouton photo désactivé si hors-ligne', async ({ page }) => {
    // isOffline = getter qui lit navigator.onLine synchronement au moment du rendu (OnPush).
    // On force navigator.onLine = false via initScript AVANT qu'Angular charge le composant.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', {
        get: () => false,
        configurable: true,
      });
    });
    await page.goto('/journal/meal?mode=photo');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByLabel('Photo désactivée — connexion requise'),
    ).toBeDisabled();
  });

  test('aliments fréquents → tap unique suffit → repas envoyé', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await seedIndexedDB(page);

    // Les aliments récents sont affichés directement en mode texte — pas de sélecteur de mode
    await page.goto('/journal/meal');
    await page.getByRole('button', { name: 'Riz blanc' }).click();

    await page.locator('[data-testid="submit-meal"]').click();
    await page.getByRole('button', { name: /Retour au journal/ }).click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  });

  test('heure du repas modifiable → heure affichée dans le journal', async ({ page }) => {
    await page.goto('/journal/meal');

    await page.locator('[data-testid="add-item-input"]').fill('Soupe de légumes');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();
    await page.getByLabel('Heure du repas').fill('19:45');
    await page.locator('[data-testid="submit-meal"]').click();
    await page.getByRole('button', { name: /Retour au journal/ }).click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="meal-entry"]').first()).toContainText('19:45');
  });

});

// Avec une clé API configurée + l'API Anthropic mockée : on teste le bouton unique
// « Analyse IA » qui se mue en « Enregistrer le repas » une fois tous les aliments analysés.
const FAKE_API_KEY_ENTRY = ['flowease_api_key', 'test-api-key-playwright'] as const;

/** Réponse Anthropic mockée : un aliment analysé au niveau FODMAP donné (+ alerte si élevé). */
function mockAnthropicMealResponse(name: string, level: 'low' | 'medium' | 'high' | 'unknown' = 'high') {
  const body = {
    items: [
      { name, quantity: '100g', fodmap: { level }, confirmed: false },
    ],
    fodmapAlerts: level === 'high'
      ? [{ item: name, reason: 'Riche en fructanes, risque de fermentation (SIBO)', severity: 'danger' }]
      : [],
  };
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(body) }] }),
  };
}

test.describe('Saisie d\'un repas — bouton unique Analyse IA', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Clé API injectée avant le chargement Angular → l'analyse IA devient disponible
    await page.addInitScript(([key, value]) => {
      localStorage.setItem(key, value);
    }, FAKE_API_KEY_ENTRY);
  });

  test('aliment non analysé → seul le bouton "Analyse IA" est présent', async ({ page }) => {
    await page.goto('/journal/meal');

    await page.locator('[data-testid="add-item-input"]').fill('Brocoli');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();

    // Un seul bouton : Analyse IA — pas d'Enregistrer tant qu'un aliment n'est pas analysé
    await expect(page.locator('[data-testid="analyze-meal"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-meal"]')).toHaveCount(0);
  });

  test('Analyse IA → couleur/alerte visibles → bouton devient "Enregistrer le repas"', async ({ page }) => {
    await page.route('https://api.anthropic.com/v1/messages', (route) =>
      route.fulfill(mockAnthropicMealResponse('Brocoli')),
    );

    await page.goto('/journal/meal');
    await page.locator('[data-testid="add-item-input"]').fill('Brocoli');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();

    await page.locator('[data-testid="analyze-meal"]').click();

    // L'aliment est désormais analysé : chip coloré (FODMAP élevé) + alerte visible
    await expect(page.locator('.food-chip--high')).toBeVisible();
    await expect(page.locator('[data-testid="fodmap-alert"]')).toBeVisible();

    // Tous les aliments analysés → le bouton se mue en Enregistrer
    await expect(page.locator('[data-testid="submit-meal"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyze-meal"]')).toHaveCount(0);
  });

  test('aliment analysé mais resté de niveau inconnu → bouton Enregistrer (flag analyzed)', async ({ page }) => {
    await page.route('https://api.anthropic.com/v1/messages', (route) =>
      route.fulfill(mockAnthropicMealResponse('Aliment exotique', 'unknown')),
    );

    await page.goto('/journal/meal');
    await page.locator('[data-testid="add-item-input"]').fill('Aliment exotique');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();

    await page.locator('[data-testid="analyze-meal"]').click();

    // Le chip reste gris (unknown) mais l'aliment est marqué analysé → plus de bouton Analyse IA
    await expect(page.locator('.food-chip--unknown')).toBeVisible();
    await expect(page.locator('[data-testid="submit-meal"]')).toBeVisible();
    await expect(page.locator('[data-testid="analyze-meal"]')).toHaveCount(0);
  });

  test('flux complet : Analyse IA puis Enregistrer → repas visible dans le journal', async ({ page }) => {
    await page.route('https://api.anthropic.com/v1/messages', (route) =>
      route.fulfill(mockAnthropicMealResponse('Brocoli')),
    );

    await page.goto('/journal/meal');
    await page.locator('[data-testid="add-item-input"]').fill('Brocoli');
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();

    await page.locator('[data-testid="analyze-meal"]').click();
    await page.locator('[data-testid="submit-meal"]').click();

    await page.getByRole('button', { name: /Retour au journal/ }).click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  });
});
