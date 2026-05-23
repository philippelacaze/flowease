import { test, expect } from '@playwright/test';
import { seedIndexedDB } from '../helpers/seed-indexeddb';
import { installSpeechMock } from '../helpers/mock-speech';

// Convention : NullAIAdapter actif (pas de clé API en localStorage — défaut en test)

test.describe('Saisie d\'un repas', () => {

  test('saisie texte → repas visible dans le journal', async ({ page }) => {
    await page.goto('/journal/meal');

    await page.locator('[data-testid="meal-text-input"]').fill('Poulet rôti, riz blanc');
    await page.locator('[data-testid="submit-meal"]').click();

    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  });

  test('saisie vocale → transcription mockée → AI indisponible affiché', async ({ page }) => {
    await installSpeechMock(page);
    await page.goto('/journal/meal');

    await page.getByLabel('Mode vocal').click();
    await page.getByLabel('Démarrer la reconnaissance vocale').click();

    await page.evaluate(() => {
      (window as Record<string, unknown>)['__mockSpeechResult']('riz blanc poulet grillé');
    });

    // NullAIAdapter → ExtractMealFromText retourne [] → ai-unavailable visible
    await expect(page.locator('[data-testid="ai-unavailable"]')).toBeVisible();
  });

  test('bouton photo désactivé si hors-ligne', async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto('/journal/meal');

    await page.getByLabel('Mode photo').click();

    await expect(
      page.getByLabel('Photo désactivée — connexion requise'),
    ).toBeDisabled();
  });

  test('aliments fréquents → tap unique suffit → repas envoyé', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await seedIndexedDB(page);

    await page.goto('/journal/meal');
    await page.getByLabel('Mode aliments fréquents').click();

    await page.getByRole('button', { name: /Riz blanc/ }).click();

    await page.locator('[data-testid="submit-meal"]').click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
  });

  test('heure du repas modifiable → heure affichée dans le journal', async ({ page }) => {
    await page.goto('/journal/meal');

    await page.locator('[data-testid="meal-text-input"]').fill('Soupe de légumes');
    await page.locator('[data-testid="meal-time-input"]').fill('19:45');
    await page.locator('[data-testid="submit-meal"]').click();

    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="meal-entry"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="meal-entry"]').first()).toContainText('19:45');
  });

});
