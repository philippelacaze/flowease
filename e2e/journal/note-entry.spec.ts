import { test, expect } from '@playwright/test';
import { seedIndexedDB } from '../helpers/seed-indexeddb';

test.describe('Saisie d\'une note', () => {

  test('note texte → sauvegardée (sans tags si IA indisponible)', async ({ page }) => {
    await page.goto('/journal/note');

    await page.locator('[data-testid="note-text-input"]').fill(
      'Douleurs légères après le déjeuner, ballonnements modérés.',
    );
    await page.locator('[data-testid="submit-note"]').click();

    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="note-entry"]').first()).toBeVisible();
  });

  test('lier à un repas → repas affiché dans les entrées liées', async ({ page }) => {
    // Prérequis : un repas existe dans le journal du jour
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await seedIndexedDB(page);

    await page.goto('/journal/note');
    await page.locator('[data-testid="note-text-input"]').fill('Observation post-repas');

    // Ouvrir le bottom sheet "Lier à..."
    await page.locator('[data-testid="link-entries-btn"]').click();

    // Sélectionner le repas dans la liste
    await page.getByRole('option', { name: /Repas/ }).first().click();

    // Confirmer la sélection
    await page.getByRole('button', { name: /Confirmer/ }).click();

    // Les entrées liées sont affichées dans le formulaire
    await expect(page.getByLabel('Entrées liées')).toBeVisible();

    // Soumettre la note
    await page.locator('[data-testid="submit-note"]').click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="note-entry"]').first()).toBeVisible();
  });

});
