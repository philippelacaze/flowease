import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MealService } from './meal.service';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';
import type { MealAnalysisResult } from '../../../core/services/ai.service';
import type { FoodItemVO } from '../../../core/models/entities/meal.entity';

const mockResult: MealAnalysisResult = {
  items: [{ name: 'Riz', fodmap: { level: 'low' }, confirmed: false }],
  aiFodmapFlags: [],
};

function makeStorageMock() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('meal-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('MealService', () => {

  describe('add', () => {
    it('persiste un MealEntity et retourne son id', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.add({
        occurredAt: new Date(), type: 'lunch', inputMode: 'text', items: [],
      });
      expect(storage.save).toHaveBeenCalledWith('meals', expect.objectContaining({ type: 'lunch' }));
      expect(typeof result).toBe('string');
    });

    it('génère un UUID et un createdAt', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      await svc.add({ occurredAt: new Date(), type: 'breakfast', inputMode: 'text', items: [] });
      const saved = storage.save.mock.calls[0][1] as { id: string; createdAt: Date };
      expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(saved.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('edit', () => {
    it('ne fait rien si l\'entrée est introuvable', async () => {
      const storage = makeStorageMock();
      storage.get.mockResolvedValue(undefined);
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      await svc.edit({ id: 'absent', occurredAt: new Date(), type: 'lunch', inputMode: 'text', items: [] });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('met à jour l\'entrée existante avec editedAt', async () => {
      const existing = { id: 'meal-1', occurredAt: new Date(), createdAt: new Date(), type: 'lunch', inputMode: 'text', items: [] };
      const storage = makeStorageMock();
      storage.get.mockResolvedValue(existing);
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      await svc.edit({ id: 'meal-1', occurredAt: new Date(), type: 'dinner', inputMode: 'text', items: [] });
      expect(storage.save).toHaveBeenCalledWith('meals', expect.objectContaining({ type: 'dinner', editedAt: expect.any(Date) }));
    });
  });

  describe('analyzePhoto', () => {
    it('retourne un résultat vide si AiService indisponible', async () => {
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.analyzePhoto({ base64Image: '', mediaType: 'image/jpeg' });
      expect(result.items).toEqual([]);
    });

    it('retourne le résultat IA si AiService disponible', async () => {
      const mockAi = { analyzeMealPhoto: vi.fn().mockResolvedValue(mockResult) };
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: AiService, useValue: mockAi },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.analyzePhoto({ base64Image: 'abc', mediaType: 'image/jpeg' });
      expect(result.items).toHaveLength(1);
    });

    it('marque analyzed:true les aliments issus de l\'analyse photo', async () => {
      const mockAi = { analyzeMealPhoto: vi.fn().mockResolvedValue(mockResult) };
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: AiService, useValue: mockAi },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.analyzePhoto({ base64Image: 'abc', mediaType: 'image/jpeg' });
      expect(result.items[0].analyzed).toBe(true);
    });
  });

  describe('extractFromText — flag analyzed', () => {
    it('marque analyzed:true même un aliment resté de niveau FODMAP inconnu', async () => {
      const unknownItem: MealAnalysisResult = {
        items: [{ name: 'Aliment exotique', fodmap: { level: 'unknown' }, confirmed: false }],
        aiFodmapFlags: [],
      };
      const mockAi = { extractMealFromText: vi.fn().mockResolvedValue(unknownItem) };
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: AiService, useValue: mockAi },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.extractFromText('aliment exotique');
      expect(result.items[0].fodmap.level).toBe('unknown');
      expect(result.items[0].analyzed).toBe(true);
    });

    it('retourne un résultat vide (sans crash) si AiService indisponible', async () => {
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.extractFromText('riz');
      expect(result.items).toEqual([]);
    });
  });

  describe('getFrequent', () => {
    it('retourne [] si aucun repas', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.getFrequent();
      expect(result).toEqual([]);
    });

    it('retourne les aliments confirmés triés par fréquence', async () => {
      const item: FoodItemVO = { name: 'Riz', fodmap: { level: 'low' }, confirmed: true };
      const meals = [
        { id: 'm1', items: [item, item] },
        { id: 'm2', items: [item] },
      ];
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(meals);
      TestBed.configureTestingModule({
        providers: [
          MealService,
          { provide: StorageService, useValue: storage },
          { provide: AiService, useClass: NullAiService },
        ],
      });
      const svc = TestBed.inject(MealService);
      const result = await svc.getFrequent();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Riz');
    });
  });
});
