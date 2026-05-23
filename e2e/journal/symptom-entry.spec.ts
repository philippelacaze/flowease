import { test, expect } from '@playwright/test';

test.describe('Saisie des symptômes', () => {

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

    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="symptom-entry"]').first()).toBeVisible();
  });

  test('Bristol type 4 sélectionné → transit visible dans le journal', async ({ page }) => {
    await page.goto('/journal/symptom');

    // Sélectionner le type Bristol 4
    await page
      .getByRole('radio', { name: /Type 4/ })
      .click();

    await page.locator('[data-testid="submit-symptoms"]').click();

    await page.waitForURL('**/journal');
    await expect(page.locator('[data-testid="symptom-entry"]').first()).toBeVisible();
  });

});
