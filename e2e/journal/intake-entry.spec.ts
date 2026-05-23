import { test, expect } from '@playwright/test';
import { seedIndexedDB, SEED_TREATMENT_ID } from '../helpers/seed-indexeddb';

test.describe('Saisie des prises de traitement', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await seedIndexedDB(page);
    await page.goto('/journal/intake');
  });

  test('tap simple → statut "pris" visible', async ({ page }) => {
    const card = page.locator(`[data-testid="treatment-${SEED_TREATMENT_ID}"]`);
    await expect(card).toBeVisible();

    // Tap court via l'API mobile de Playwright (déclenche pointer events < 500ms)
    await card.tap();

    await expect(card).toHaveClass(/treatment-card--taken/);
  });

  test('tap long → panneau détail → note ajoutée → prise confirmée', async ({ page }) => {
    const card = page.locator(`[data-testid="treatment-${SEED_TREATMENT_ID}"]`);
    await expect(card).toBeVisible();

    // Tap long : pointerdown maintenu plus de 500ms
    const box = await card.boundingBox();
    if (!box) throw new Error('Carte traitement introuvable');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    // Le panneau détail doit apparaître
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Ajouter une note dans le panneau
    await page.locator('[data-testid="detail-notes"]').fill('Prise après le repas');

    // Confirmer la prise
    await page.locator('[data-testid="confirm-taken"]').click();

    // Le panneau est fermé et la carte montre "pris"
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(card).toHaveClass(/treatment-card--taken/);
  });

});
