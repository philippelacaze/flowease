import { test, expect } from '@playwright/test';
import { seedIndexedDB, SEED_TREATMENT_ID } from '../helpers/seed-indexeddb';

test.describe('Saisie des prises de traitement', () => {
  test.describe.configure({ mode: 'serial' });

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

    // L'état "pris" est signalé via aria-pressed (pas via classe CSS sur le card)
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('tap long → panneau détail → note + prise confirmée', async ({ page }) => {
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

    // Le champ note est visible et peut être rempli
    const noteField = page.locator('[data-testid="detail-note"]');
    await expect(noteField).toBeVisible();
    await noteField.fill('Pris avec repas léger');

    // Confirmer la prise
    await page.getByRole('button', { name: /Confirmer la prise/ }).click();

    // Le panneau est fermé et la carte montre "pris"
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('tap long → sauté avec raison → statut sauté visible', async ({ page }) => {
    const card = page.locator(`[data-testid="treatment-${SEED_TREATMENT_ID}"]`);
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    if (!box) throw new Error('Carte traitement introuvable');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Premier tap "Sauté" révèle le sélecteur de raison
    await page.locator('[data-testid="confirm-skipped"]').click();
    await expect(page.locator('[data-testid="skip-reason-select"]')).toBeVisible();

    // Sélectionner une raison
    await page.locator('[data-testid="skip-reason-select"]').selectOption('forgot');

    // Deuxième tap "Confirmer le saut" ferme le panneau
    await page.locator('[data-testid="confirm-skipped"]').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

});
