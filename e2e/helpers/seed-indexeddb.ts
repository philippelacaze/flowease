import type { Page } from '@playwright/test';

export const SEED_TREATMENT_ID = 'seed-treatment-001';
export const SEED_MEAL_FREQUENT_ID = 'seed-meal-frequent-001';
export const SEED_MEAL_LINKABLE_ID = 'seed-meal-linkable-001';

/**
 * Pré-remplit IndexedDB avec des traitements actifs et des repas historiques.
 * Doit être appelée après page.goto() pour que le schéma soit déjà initialisé.
 */
export async function seedIndexedDB(page: Page): Promise<void> {
  await page.evaluate(
    ({ treatmentId, mealFreqId, mealLinkId }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('flowease-db');

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['treatments', 'meals'], 'readwrite');

          tx.objectStore('treatments').put({
            id: treatmentId,
            name: 'Rifaximine 550mg',
            category: 'antibiotic',
            mode: 'oral',
            dosage: '550',
            unit: 'mg',
            frequency: 2,
            reminder: { enabled: false, times: [], soundEnabled: false },
            notes: '',
            active: true,
            startedAt: new Date(),
            createdAt: new Date(),
          });

          const now = new Date();

          tx.objectStore('meals').put({
            id: mealFreqId,
            occurredAt: now,
            createdAt: now,
            type: 'lunch',
            inputMode: 'recurring',
            items: [
              { name: 'Riz blanc', fodmap: { level: 'low' }, confirmed: true },
              { name: 'Poulet grillé', fodmap: { level: 'low' }, confirmed: true },
            ],
          });

          tx.objectStore('meals').put({
            id: mealLinkId,
            occurredAt: now,
            createdAt: now,
            type: 'breakfast',
            inputMode: 'text',
            items: [
              { name: 'Pain de riz', fodmap: { level: 'low' }, confirmed: true },
            ],
          });

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
      });
    },
    {
      treatmentId: SEED_TREATMENT_ID,
      mealFreqId: SEED_MEAL_FREQUENT_ID,
      mealLinkId: SEED_MEAL_LINKABLE_ID,
    },
  );
}
