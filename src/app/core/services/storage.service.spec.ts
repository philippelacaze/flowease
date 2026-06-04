import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storage.service';
import { STORES } from './indexeddb.schema';

describe('StorageService', () => {
  let adapter: StorageService;

  beforeEach(async () => {
    adapter = new StorageService();
    await adapter.init();
  });

  // --- save + get ---

  describe('save et get', () => {
    it('persiste une entité et la retrouve par son identifiant', async () => {
      const meal = { id: 'meal-001', name: 'Riz blanc', occurredAt: new Date().toISOString() };
      await adapter.save(STORES.MEALS, meal);
      const retrieved = await adapter.get<typeof meal>(STORES.MEALS, 'meal-001');
      expect(retrieved).toEqual(meal);
    });

    it('retourne undefined pour un identifiant inconnu', async () => {
      const result = await adapter.get(STORES.MEALS, 'inexistant');
      expect(result).toBeUndefined();
    });

    it('met à jour une entité existante via save (upsert)', async () => {
      const entity = { id: 'note-001', content: 'initial' };
      await adapter.save(STORES.NOTES, entity);
      await adapter.save(STORES.NOTES, { id: 'note-001', content: 'modifié' });
      const result = await adapter.get<typeof entity>(STORES.NOTES, 'note-001');
      expect(result?.content).toBe('modifié');
    });
  });

  // --- getAll ---

  describe('getAll', () => {
    it('retourne toutes les entités d\'un store', async () => {
      await adapter.save(STORES.NOTES, { id: 'n1', content: 'note 1' });
      await adapter.save(STORES.NOTES, { id: 'n2', content: 'note 2' });
      const all = await adapter.getAll(STORES.NOTES);
      const ids = all.map((n: { id: string }) => n.id);
      expect(ids).toContain('n1');
      expect(ids).toContain('n2');
    });

    it('retourne un tableau vide si le store est vide', async () => {
      const result = await adapter.getAll(STORES.REPORTS);
      expect(result).toEqual([]);
    });
  });

  // --- getRange par index de date ---

  describe('getRange', () => {
    it('retourne les entités dont l\'index occurredAt est dans la plage', async () => {
      const day1 = '2026-05-01T10:00:00.000Z';
      const day2 = '2026-05-15T10:00:00.000Z';
      const day3 = '2026-05-30T10:00:00.000Z';

      await adapter.save(STORES.MEALS, { id: 'm1', occurredAt: day1 });
      await adapter.save(STORES.MEALS, { id: 'm2', occurredAt: day2 });
      await adapter.save(STORES.MEALS, { id: 'm3', occurredAt: day3 });

      const results = await adapter.getRange<{ id: string; occurredAt: string }>(
        STORES.MEALS,
        'occurredAt',
        '2026-05-05T00:00:00.000Z',
        '2026-05-20T23:59:59.999Z',
      );

      const ids = results.map((r) => r.id);
      expect(ids).toContain('m2');
      expect(ids).not.toContain('m1');
      expect(ids).not.toContain('m3');
    });
  });

  // --- delete ---

  describe('delete', () => {
    it('supprime une entité existante', async () => {
      await adapter.save(STORES.NOTES, { id: 'del-1', content: 'à supprimer' });
      await adapter.delete(STORES.NOTES, 'del-1');
      const result = await adapter.get(STORES.NOTES, 'del-1');
      expect(result).toBeUndefined();
    });
  });

  // --- clear ---

  describe('clear', () => {
    it('vide intégralement un store', async () => {
      await adapter.save(STORES.INSIGHTS, { id: 'i1' });
      await adapter.save(STORES.INSIGHTS, { id: 'i2' });
      await adapter.clear(STORES.INSIGHTS);
      const all = await adapter.getAll(STORES.INSIGHTS);
      expect(all).toEqual([]);
    });
  });

  // --- migration schéma ---

  describe('migration schéma', () => {
    it('crée tous les stores attendus lors de l\'initialisation', async () => {
      const expectedStores = Object.values(STORES);
      for (const store of expectedStores) {
        await expect(adapter.getAll(store)).resolves.toBeDefined();
      }
    });
  });
});
