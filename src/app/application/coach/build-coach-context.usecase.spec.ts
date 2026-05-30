import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BuildCoachContextUseCase } from './build-coach-context.usecase';
import { STORAGE_PORT } from '../tokens';
import type { UserProfileEntity } from '../../domain/entities/user-profile.entity';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';

const profileFixture: UserProfileEntity = {
  id: 'profile-1',
  firstName: 'Alice',
  conditions: ['sibo_hydrogen', 'gastroparesis'],
  protocol: 'strict',
  language: 'fr',
  theme: 'auto',
  showTokenCounter: false,
  defaultCoachContext: '14d',
  updatedAt: new Date('2026-05-01'),
};

const activeTreatment: TreatmentEntity = {
  id: 'tr-1', name: 'Rifaximin', category: 'antibiotic', mode: 'oral',
  dosage: '550', unit: 'mg', frequency: 3,
  reminder: { enabled: true, times: ['08:00', '14:00', '20:00'], soundEnabled: false },
  notes: '', active: true, startedAt: new Date('2026-04-01'), createdAt: new Date('2026-04-01'),
};
const inactiveTreatment: TreatmentEntity = {
  ...activeTreatment, id: 'tr-2', name: 'Probiotique', active: false,
};

const mealFixture: MealEntity = {
  id: 'meal-1',
  occurredAt: new Date(),
  createdAt: new Date(),
  type: 'lunch',
  inputMode: 'text',
  items: [{ name: 'riz', quantity: '150', unit: 'g', fodmap: { level: 'low' }, confirmed: true }],
};
const symptomFixture: SymptomEntity = {
  id: 'sym-1', occurredAt: new Date(), createdAt: new Date(),
  category: 'digestive', symptomKey: 'abdominal_pain', intensity: 6,
};

function makeStorage(overrides: {
  profiles?: UserProfileEntity[];
  treatments?: TreatmentEntity[];
  meals?: MealEntity[];
  symptoms?: SymptomEntity[];
} = {}) {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockImplementation((store: string) => {
      if (store === 'user-profile') return Promise.resolve(overrides.profiles ?? [profileFixture]);
      if (store === 'treatments') return Promise.resolve(overrides.treatments ?? [activeTreatment, inactiveTreatment]);
      return Promise.resolve([]);
    }),
    getRange: vi.fn().mockImplementation((store: string) => {
      if (store === 'meals') return Promise.resolve(overrides.meals ?? [mealFixture]);
      if (store === 'symptoms') return Promise.resolve(overrides.symptoms ?? [symptomFixture]);
      return Promise.resolve([]);
    }),
    save: vi.fn().mockResolvedValue(''),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function setup(storage = makeStorage()) {
  TestBed.configureTestingModule({
    providers: [
      BuildCoachContextUseCase,
      { provide: STORAGE_PORT, useValue: storage },
    ],
  });
  return { useCase: TestBed.inject(BuildCoachContextUseCase), storage };
}

describe('BuildCoachContextUseCase', () => {

  describe('profil et traitements', () => {
    it('inclut les conditions médicales du profil', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('14d');
      expect(ctx.userConditions).toEqual(['sibo_hydrogen', 'gastroparesis']);
    });

    it('inclut le protocole du profil', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('14d');
      expect(ctx.protocol).toBe('strict');
    });

    it('inclut uniquement les traitements actifs', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('14d');
      expect(ctx.activeTreatments).toEqual(['Rifaximin']);
    });

    it('retourne des listes vides quand aucun profil n\'est configuré', async () => {
      const { useCase } = setup(makeStorage({ profiles: [], treatments: [] }));
      const ctx = await useCase.execute('14d');
      expect(ctx.userConditions).toEqual([]);
      expect(ctx.protocol).toBe('none');
      expect(ctx.activeTreatments).toEqual([]);
    });
  });

  describe('fenêtre de contexte', () => {
    it('inclut healthDataJson pour la fenêtre "today"', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('today');
      expect(ctx.healthDataJson).toBeDefined();
    });

    it('inclut les repas dans healthDataJson pour "7d"', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('7d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toHaveLength(1);
      expect(data.meals[0].type).toBe('lunch');
      expect(data.meals[0].items).toContain('riz 150g');
    });

    it('inclut les symptômes dans healthDataJson pour "14d"', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('14d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.symptoms).toHaveLength(1);
      expect(data.symptoms[0].symptom).toBe('abdominal_pain');
      expect(data.symptoms[0].intensity).toBe(6);
    });

    it('inclut les données pour "30d"', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('30d');
      expect(ctx.healthDataJson).toBeDefined();
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toBeDefined();
      expect(data.symptoms).toBeDefined();
    });

    it('n\'inclut pas healthDataJson pour "profile_only"', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('profile_only');
      expect(ctx.healthDataJson).toBeUndefined();
    });

    it('ne charge pas getRange pour "profile_only"', async () => {
      const storage = makeStorage();
      const { useCase } = setup(storage);
      await useCase.execute('profile_only');
      expect(storage.getRange).not.toHaveBeenCalled();
    });

    it('conserve la contextWindow dans le résultat', async () => {
      const { useCase } = setup();
      const ctx = await useCase.execute('7d');
      expect(ctx.contextWindow).toBe('7d');
    });
  });

  describe('données journalières vides', () => {
    it('retourne un healthDataJson avec listes vides si aucune donnée', async () => {
      const { useCase } = setup(makeStorage({ meals: [], symptoms: [] }));
      const ctx = await useCase.execute('14d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toEqual([]);
      expect(data.symptoms).toEqual([]);
    });
  });
});
