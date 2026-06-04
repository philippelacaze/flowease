import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SymptomService } from './symptom.service';
import { StorageService } from '../../../core/services/storage.service';

function makeStorageMock() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('symptom-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SymptomService', () => {

  describe('add', () => {
    it('persiste un SymptomEntity avec UUID et createdAt', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.add({ occurredAt: new Date(), category: 'digestive', symptomKey: 'bloating', intensity: 5 });
      const saved = storage.save.mock.calls[0][1] as { id: string; createdAt: Date; symptomKey: string };
      expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.symptomKey).toBe('bloating');
    });
  });

  describe('edit', () => {
    it('ne fait rien si le symptôme est introuvable', async () => {
      const storage = makeStorageMock();
      storage.get.mockResolvedValue(undefined);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.edit({ id: 'absent', occurredAt: new Date(), category: 'digestive', symptomKey: 'bloating', intensity: 5 });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('met à jour le symptôme avec editedAt', async () => {
      const existing = { id: 's-1', occurredAt: new Date(), createdAt: new Date(), category: 'digestive', symptomKey: 'nausea', intensity: 3 };
      const storage = makeStorageMock();
      storage.get.mockResolvedValue(existing);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.edit({ id: 's-1', occurredAt: new Date(), category: 'digestive', symptomKey: 'nausea', intensity: 7 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ intensity: 7, editedAt: expect.any(Date) }));
    });
  });

  describe('getActiveConfigs', () => {
    it('retourne la liste par défaut si aucune config sauvegardée', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].key).toBeDefined();
    });

    it('filtre et trie les configs actives', async () => {
      const configs = [
        { id: 'a', key: 'a', label: 'A', order: 2, custom: false, active: true },
        { id: 'b', key: 'b', label: 'B', order: 1, custom: false, active: false },
        { id: 'c', key: 'c', label: 'C', order: 0, custom: false, active: true },
      ];
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(configs);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('c');
    });
  });

  describe('saveWellbeing', () => {
    it('crée une nouvelle entrée wellbeing si aucune n\'existe', async () => {
      const storage = makeStorageMock();
      storage.getRange.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.saveWellbeing({ date: new Date(), score: 8 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({
        symptomKey: 'wellbeing_score',
        intensity: 8,
      }));
    });

    it('met à jour l\'entrée existante si déjà saisie aujourd\'hui', async () => {
      const existing = { id: 'wb-1', symptomKey: 'wellbeing_score', intensity: 5, occurredAt: new Date(), createdAt: new Date(), category: 'wellbeing' };
      const storage = makeStorageMock();
      storage.getRange.mockResolvedValue([existing]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.saveWellbeing({ date: new Date(), score: 9 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ id: 'wb-1', intensity: 9 }));
    });
  });
});
