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

  describe('upsertDaySymptom', () => {
    it('crée une nouvelle entrée si aucune ne correspond pour ce jour', async () => {
      const storage = makeStorageMock();
      storage.getRange.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.upsertDaySymptom({ occurredAt: new Date(), category: 'wellbeing', symptomKey: 'wellbeing_score', intensity: 8 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({
        symptomKey: 'wellbeing_score',
        intensity: 8,
      }));
    });

    it('remplace l\'entrée existante du même symptomKey pour le même jour', async () => {
      const existing = { id: 'wb-1', symptomKey: 'wellbeing_score', intensity: 5, occurredAt: new Date(), createdAt: new Date(), category: 'wellbeing' };
      const storage = makeStorageMock();
      storage.getRange.mockResolvedValue([existing]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.upsertDaySymptom({ occurredAt: new Date(), category: 'wellbeing', symptomKey: 'wellbeing_score', intensity: 9 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ id: 'wb-1', intensity: 9 }));
    });

    it('ne remplace pas une entrée d\'un autre symptomKey le même jour', async () => {
      const other = { id: 'other-1', symptomKey: 'mood', intensity: 7, occurredAt: new Date(), createdAt: new Date(), category: 'wellbeing' };
      const storage = makeStorageMock();
      storage.getRange.mockResolvedValue([other]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.upsertDaySymptom({ occurredAt: new Date(), category: 'wellbeing', symptomKey: 'wellbeing_score', intensity: 6 });
      const savedArg = storage.save.mock.calls[0][1] as { id: string; symptomKey: string };
      expect(savedArg.symptomKey).toBe('wellbeing_score');
      expect(savedArg.id).not.toBe('other-1');
    });
  });

  describe('getAllConfigs', () => {
    it('retourne DEFAULT_CONFIGS si aucune config sauvegardée', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getAllConfigs();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBeDefined();
    });

    it('inclut la config inactive stress mais plus energy (retiré en v4)', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getAllConfigs();
      expect(result.some(c => c.key === 'stress' && !c.active)).toBe(true);
      expect(result.some(c => c.key === 'energy')).toBe(false);
    });

    it('migre les configs legacy sans category vers la catégorie par défaut', async () => {
      const legacy = [
        { id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur', order: 0, custom: false, active: true },
      ];
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(legacy);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getAllConfigs();
      expect(result[0].category).toBe('digestive');
    });

    it('utilise "digestive" pour les clés inconnues (symptômes custom)', async () => {
      const custom = [
        { id: 'custom-1', key: 'mon_symptome_custom', label: 'Custom', order: 0, custom: true, active: true },
      ];
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(custom);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getAllConfigs();
      expect(result[0].category).toBe('digestive');
    });

    it('trie par order', async () => {
      const configs = [
        { id: 'b', key: 'b', label: 'B', order: 1, custom: false, active: true, category: 'systemic' as const },
        { id: 'a', key: 'a', label: 'A', order: 0, custom: false, active: true, category: 'digestive' as const },
      ];
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(configs);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getAllConfigs();
      expect(result[0].key).toBe('a');
      expect(result[1].key).toBe('b');
    });
  });

  describe('saveConfigs', () => {
    it('efface le store puis sauvegarde chaque config', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const configs = [
        { id: 'x', key: 'x', label: 'X', order: 0, custom: false, active: true, category: 'digestive' as const },
      ];
      await svc.saveConfigs(configs);
      expect(storage.clear).toHaveBeenCalledWith('symptom-config');
      expect(storage.save).toHaveBeenCalledWith('symptom-config', configs[0]);
    });
  });

  describe('resetToDefault', () => {
    it('efface le store symptom-config', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.resetToDefault();
      expect(storage.clear).toHaveBeenCalledWith('symptom-config');
    });

    it('après reset, getActiveConfigs retourne la liste par défaut', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      await svc.resetToDefault();
      const result = await svc.getActiveConfigs();
      expect(result.some(c => c.key === 'abdominal_pain')).toBe(true);
    });
  });

  describe('DEFAULT_CONFIGS via getActiveConfigs', () => {
    it('inclut wellbeing_score comme symptôme actif par défaut', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result.some(c => c.key === 'wellbeing_score')).toBe(true);
    });

    it('libelle wellbeing_score "Mal-être" et mood "Anxiété" (échelle uniforme)', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result.find(c => c.key === 'wellbeing_score')?.label).toBe('Mal-être');
      expect(result.find(c => c.key === 'mood')?.label).toBe('Anxiété');
    });

    it('n\'inclut pas energy ni stress dans les configs actives par défaut', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result.some(c => c.key === 'energy')).toBe(false);
      expect(result.some(c => c.key === 'stress')).toBe(false);
    });

    it('inclut les 3 nouveaux symptômes digestifs par défaut', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [SymptomService, { provide: StorageService, useValue: storage }],
      });
      const svc = TestBed.inject(SymptomService);
      const result = await svc.getActiveConfigs();
      expect(result.some(c => c.key === 'belching')).toBe(true);
      expect(result.some(c => c.key === 'early_satiety')).toBe(true);
      expect(result.some(c => c.key === 'postmeal_heaviness')).toBe(true);
    });
  });
});
