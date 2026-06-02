import { test, expect } from '@playwright/test';
import { seedIndexedDB, SEED_TREATMENT_ID } from '../helpers/seed-indexeddb';

/**
 * Vérifie que chaque type d'entrée est sauvegardé sur la date sélectionnée dans
 * le journal, et non sur la date du jour si une date antérieure est affichée.
 *
 * Flux générique :
 *   /journal (aujourd'hui) → prev-day → ouvrir formulaire (journalDate = hier)
 *   → saisir → retour /journal (aujourd'hui) → vérifier absent
 *   → prev-day → vérifier présent
 */
test.describe('Entrées créées sur la date sélectionnée', () => {
  test.describe.configure({ mode: 'serial' });

  // ─── Repas ────────────────────────────────────────────────────────────────

  test('repas saisi sur date antérieure → visible hier, absent aujourd\'hui', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="prev-day"]').click();

    await page.locator('[data-testid="qc-meal-text"]').click();
    await page.waitForURL(/\/journal\/meal/);

    const uniqueFood = 'Quinoa-rétrospectif';
    await page.locator('[data-testid="add-item-input"]').fill(uniqueFood);
    await page.getByRole('button', { name: 'Ajouter l\'aliment' }).click();
    await page.locator('[data-testid="submit-meal"]').click();
    await page.getByRole('button', { name: /Retour au journal/ }).click();
    await page.waitForURL('**/journal');

    // Aujourd'hui : l'entrée ne doit PAS apparaître
    await expect(
      page.locator('[data-testid="meal-entry"]').filter({ hasText: uniqueFood }),
    ).toHaveCount(0);

    // Hier : l'entrée DOIT apparaître
    await page.locator('[data-testid="prev-day"]').click();
    await expect(
      page.locator('[data-testid="meal-entry"]').filter({ hasText: uniqueFood }),
    ).toBeVisible();
  });

  // ─── Symptôme ─────────────────────────────────────────────────────────────

  test('symptôme saisi sur date antérieure → visible dans le journal d\'hier', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="prev-day"]').click();

    await page.locator('[data-testid="qc-symptom-form"]').click();
    await page.waitForURL(/\/journal\/symptom(?!\/confirm)/);

    const painSlider = page
      .locator('[data-testid="symptom-abdominal_pain"]')
      .locator('input[type="range"]')
      .first();
    await painSlider.focus();
    await page.keyboard.press('End');

    await page.locator('[data-testid="submit-symptoms"]').click();
    await page.waitForURL('**/journal/symptom/confirm');
    await page.locator('[data-testid="back-to-journal"]').click();
    await page.waitForURL('**/journal');

    // Naviguer à hier et vérifier la présence du symptôme
    await page.locator('[data-testid="prev-day"]').click();
    await expect(page.locator('[data-testid="symptom-entry"]').first()).toBeVisible();
  });

  // ─── Prise ────────────────────────────────────────────────────────────────

  test('prise confirmée sur date antérieure → visible dans le journal d\'hier', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await seedIndexedDB(page);

    await page.locator('[data-testid="prev-day"]').click();

    await page.locator('[data-testid="qc-intake-validate"]').click();
    await page.waitForURL('**/journal/intake');

    const card = page.locator(`[data-testid="treatment-${SEED_TREATMENT_ID}"]`);
    await expect(card).toBeVisible();
    await card.tap();
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    await page.locator('[data-testid="done-intake"]').click();
    await page.waitForURL('**/journal');

    // Naviguer à hier et vérifier la présence de la prise
    await page.locator('[data-testid="prev-day"]').click();
    await expect(page.locator('[data-testid="intake-entry"]').first()).toBeVisible();
  });

  // ─── Note ─────────────────────────────────────────────────────────────────

  test('note saisie sur date antérieure → visible hier, absente aujourd\'hui', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="prev-day"]').click();

    await page.locator('[data-testid="qc-note-text"]').click();
    await page.waitForURL('**/journal/note');

    const uniqueContent = 'Note-rétrospective-e2e';
    await page.locator('[data-testid="note-text-input"]').fill(uniqueContent);
    await page.locator('[data-testid="submit-note"]').click();
    await page.waitForURL('**/journal');

    // tagNote est appelé de façon asynchrone après la sauvegarde — il peut
    // échouer (pas de clé API en test) et faire apparaître la bannière d'erreur
    // qui couvre l'en-tête. On la ferme si elle est visible avant de continuer.
    await page
      .locator('[data-testid="error-banner"]')
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => page.getByRole('button', { name: 'Fermer le message' }).click())
      .catch(() => undefined);

    // Aujourd'hui : la note ne doit PAS apparaître
    await expect(
      page.locator('[data-testid="note-entry"]').filter({ hasText: uniqueContent }),
    ).toHaveCount(0);

    // Hier : la note DOIT apparaître
    await page.locator('[data-testid="prev-day"]').click();
    await expect(
      page.locator('[data-testid="note-entry"]').filter({ hasText: uniqueContent }),
    ).toBeVisible();
  });

  // ─── Bandeau rétrospectif ─────────────────────────────────────────────────

  test('bandeau "Saisie pour le…" visible quand une date antérieure est sélectionnée', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="prev-day"]').click();

    await page.locator('[data-testid="qc-meal-text"]').click();
    await page.waitForURL(/\/journal\/meal/);

    const banner = page.locator('[data-testid="retrospective-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('pour le');
  });

  test('pas de bandeau rétrospectif pour le jour courant', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Pas de prev-day — on reste sur aujourd'hui
    await page.locator('[data-testid="qc-meal-text"]').click();
    await page.waitForURL(/\/journal\/meal/);

    await expect(page.locator('[data-testid="retrospective-banner"]')).not.toBeVisible();
  });
});
