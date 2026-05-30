import { test, expect } from '@playwright/test';

// Après soumission des symptômes, l'app navigue vers /journal/symptom/confirm
// avant de revenir au journal via le bouton [data-testid="back-to-journal"].

test.describe('Saisie des symptômes', () => {
  test.describe.configure({ mode: 'serial' });

  test('douleur abdominale → intensité + zone + type → visible dans le journal', async ({ page }) => {
    await page.goto('/journal/symptom');

    // Activer le slider de douleur abdominale (End = intensité 10)
    const painSlider = page
      .locator('[data-testid="symptom-abdominal_pain"]')
      .locator('input[type="range"]')
      .first();
    await painSlider.focus();
    await page.keyboard.press('End');

    // Sélectionner une zone abdominale (carte Épigastre)
    await page.getByRole('button', { name: /Épigastre/ }).first().click();

    // Sélectionner un type de douleur (Crampes)
    await page.getByRole('button', { name: /Crampes/ }).first().click();

    await page.locator('[data-testid="submit-symptoms"]').click();

    // L'app passe par une page de confirmation avant de revenir au journal
    await page.waitForURL('**/journal/symptom/confirm');
    await page.locator('[data-testid="back-to-journal"]').click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="symptom-entry"]').first()).toBeVisible();
  });

  test('Bristol type 4 sélectionné → transit visible dans le journal', async ({ page }) => {
    await page.goto('/journal/symptom');

    // Activer le slider de douleur abdominale pour débloquer la validation
    const painSlider = page
      .locator('[data-testid="symptom-abdominal_pain"]')
      .locator('input[type="range"]')
      .first();
    await painSlider.focus();
    await page.keyboard.press('End');

    // Le sélecteur Bristol est replié par défaut — le déployer d'abord
    await page.locator('[data-testid="bristol-collapsed-btn"]').click();

    // Sélectionner le type Bristol 4 dans la grille déployée
    await page.getByRole('radio', { name: /Type 4/ }).click();

    await page.locator('[data-testid="submit-symptoms"]').click();

    // Page de confirmation avant retour au journal
    await page.waitForURL('**/journal/symptom/confirm');
    await page.locator('[data-testid="back-to-journal"]').click();
    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="symptom-entry"]').first()).toBeVisible();
  });

});
