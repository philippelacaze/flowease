import { test, expect } from '@playwright/test';

// Le guard apiKeyGuard protège /coach — une clé API factice est nécessaire pour y accéder.
// addInitScript() l'injecte AVANT le premier rendu Angular, avant que le guard ne s'évalue.

const SETTINGS_STORAGE_KEY = 'flowease_default_window';
const FAKE_API_KEY_ENTRY = ['flowease_api_key', 'test-api-key-playwright'] as const;

test.describe('Coach — contexte par défaut sans modale forcée', () => {
  // Les tests partagent le localStorage → exécution séquentielle obligatoire
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Injecte la clé API avant tout chargement Angular (le guard lit localStorage synchronement)
    await page.addInitScript(([key, value]) => {
      localStorage.setItem(key, value);
    }, FAKE_API_KEY_ENTRY);

    // Charge la page puis réinitialise les préférences Coach en conservant la clé API
    await page.goto('/');
    await page.evaluate(([key, value]) => {
      localStorage.clear();
      localStorage.setItem(key, value); // remet la clé après clear
    }, FAKE_API_KEY_ENTRY);
  });

  test('ouvrir /coach ne déclenche aucun bottom sheet automatique', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    // Le picker ne doit pas s'ouvrir automatiquement
    const bottomSheet = page.locator('mat-bottom-sheet-container');
    await expect(bottomSheet).not.toBeVisible();
  });

  test('le chat est directement utilisable sans action préalable', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    // L'input est accessible dès l'ouverture
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled();
  });

  test('le chip affiche le contexte par défaut (14d si aucun paramètre défini)', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    const chip = page.locator('[data-testid="btn-change-context"]');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText('14 derniers jours');
  });

  test('configurer "7 derniers jours" dans les paramètres → chip affiche "7 derniers jours" sur /coach', async ({ page }) => {
    // Injecter la préférence directement en localStorage
    await page.goto('/');
    await page.evaluate((key) => localStorage.setItem(key, '7d'), SETTINGS_STORAGE_KEY);

    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    const chip = page.locator('[data-testid="btn-change-context"]');
    await expect(chip).toContainText('7 derniers jours');
    // Toujours pas de bottom sheet
    await expect(page.locator('mat-bottom-sheet-container')).not.toBeVisible();
  });

  test('cliquer sur "Modifier" ouvre le bottom sheet', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    const chip = page.locator('[data-testid="btn-change-context"]');
    await chip.click();

    const bottomSheet = page.locator('mat-bottom-sheet-container');
    await expect(bottomSheet).toBeVisible();
  });

  test('le bottom sheet pré-sélectionne la fenêtre active (badge "Actif")', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key) => localStorage.setItem(key, '7d'), SETTINGS_STORAGE_KEY);

    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="btn-change-context"]').click();

    const option7d = page.locator('[data-testid="context-option-7d"]');
    await expect(option7d).toContainText('Actif');
  });

  test('le bottom sheet affiche le badge "Défaut" sur le paramètre des settings', async ({ page }) => {
    await page.goto('/');
    // default = 14d (non défini = fallback '14d'), session active = 14d aussi → les deux badges sur 14d
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="btn-change-context"]').click();

    const option14d = page.locator('[data-testid="context-option-14d"]');
    await expect(option14d).toContainText('Défaut');
  });

  test('fermer le picker sans choisir (Échap) ne change pas le contexte affiché', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    const chip = page.locator('[data-testid="btn-change-context"]');
    const labelBefore = await chip.textContent();

    await chip.click();
    await expect(page.locator('mat-bottom-sheet-container')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('mat-bottom-sheet-container')).not.toBeVisible();

    await expect(chip).toContainText(labelBefore!.trim());
  });

  test('choisir "30 derniers jours" dans le picker met à jour le chip', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="btn-change-context"]').click();
    await page.locator('[data-testid="context-option-30d"]').click();
    await page.waitForLoadState('networkidle');

    const chip = page.locator('[data-testid="btn-change-context"]');
    await expect(chip).toContainText('30 derniers jours');
  });

});
