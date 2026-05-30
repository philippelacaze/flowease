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
