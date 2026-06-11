import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDB, deleteDB, type IDBPDatabase } from 'idb';
import { StorageService } from './storage.service';
import { DB_NAME, STORES, upgradeSchema } from './indexeddb.schema';

/**
 * Migration v4 : uniformisation de l'échelle des symptômes "wellbeing".
 *
 * Avant la v4, wellbeing_score/mood/energy étaient saisis sur une échelle
 * inversée (10 = très bon). La v4 bascule tout sur 0 = absent → 10 = intense,
 * en convertissant les valeurs historiques via `10 - intensity`.
 */
describe('Migration IndexedDB v4 — échelle wellbeing uniformisée', () => {
  let adapter: StorageService | null = null;

  beforeEach(async () => {
    await deleteDB(DB_NAME);
    // Recrée la base en v3 (la migration v4 est ignorée car oldVersion < 1)
    // puis seed des entrées sur l'ancienne échelle inversée.
    const db = await openDB(DB_NAME, 3, {
      upgrade(database, oldVersion, _newVersion, tx) {
        void upgradeSchema(database, oldVersion, tx);
      },
    });
    const occurredAt = new Date('2026-05-10T08:00:00.000Z');
    await db.put(STORES.SYMPTOMS, { id: 'wb', symptomKey: 'wellbeing_score', intensity: 8, occurredAt, category: 'wellbeing' });
    await db.put(STORES.SYMPTOMS, { id: 'mo', symptomKey: 'mood', intensity: 3, occurredAt, category: 'wellbeing' });
    await db.put(STORES.SYMPTOMS, { id: 'en', symptomKey: 'energy', intensity: 10, occurredAt, category: 'wellbeing' });
    await db.put(STORES.SYMPTOMS, { id: 'ab', symptomKey: 'abdominal_pain', intensity: 6, occurredAt, category: 'digestive' });
    db.close();
  });

  afterEach(() => {
    // Ferme la connexion v4 pour ne pas bloquer le deleteDB du test suivant.
    (adapter as unknown as { db: IDBPDatabase | null })?.db?.close();
    adapter = null;
  });

  it('inverse intensity (10 − v) pour wellbeing_score, mood et energy', async () => {
    adapter = new StorageService();
    await adapter.init();
    const wb = await adapter.get<{ id: string; intensity: number }>(STORES.SYMPTOMS, 'wb');
    const mo = await adapter.get<{ id: string; intensity: number }>(STORES.SYMPTOMS, 'mo');
    const en = await adapter.get<{ id: string; intensity: number }>(STORES.SYMPTOMS, 'en');
    expect(wb?.intensity).toBe(2);
    expect(mo?.intensity).toBe(7);
    expect(en?.intensity).toBe(0);
  });

  it('laisse intactes les intensités des autres symptômes', async () => {
    adapter = new StorageService();
    await adapter.init();
    const ab = await adapter.get<{ id: string; intensity: number }>(STORES.SYMPTOMS, 'ab');
    expect(ab?.intensity).toBe(6);
  });
});
