import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GetAllTreatmentsUseCase } from './get-all-treatments.usecase';
import { STORAGE_PORT } from '../tokens';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';

const makeTreatment = (id: string, name: string, active: boolean): TreatmentEntity => ({
  id,
  name,
  category: 'antibiotic',
  mode: 'oral',
  dosage: '550',
  unit: 'mg',
  frequency: 2,
  reminder: { enabled: false, times: [], soundEnabled: false },
  notes: '',
  active,
  startedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
});

describe('GetAllTreatmentsUseCase', () => {
  let mockStorage: { getAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStorage = { getAll: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        GetAllTreatmentsUseCase,
        { provide: STORAGE_PORT, useValue: mockStorage },
      ],
    });
  });

  it('retourne tous les traitements y compris les inactifs', async () => {
    mockStorage.getAll.mockResolvedValue([
      makeTreatment('t1', 'Rifaximine', true),
      makeTreatment('t2', 'Métronidazole', false),
    ]);
    const useCase = TestBed.inject(GetAllTreatmentsUseCase);
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });

  it('ne filtre pas les traitements inactifs', async () => {
    mockStorage.getAll.mockResolvedValue([
      makeTreatment('t1', 'Rifaximine', false),
    ]);
    const useCase = TestBed.inject(GetAllTreatmentsUseCase);
    const result = await useCase.execute();
    expect(result[0].active).toBe(false);
  });

  it('trie les résultats par nom', async () => {
    mockStorage.getAll.mockResolvedValue([
      makeTreatment('t1', 'Zinc', true),
      makeTreatment('t2', 'Berbérine', true),
      makeTreatment('t3', 'Magnésium', false),
    ]);
    const useCase = TestBed.inject(GetAllTreatmentsUseCase);
    const result = await useCase.execute();
    expect(result.map(t => t.name)).toEqual(['Berbérine', 'Magnésium', 'Zinc']);
  });

  it('retourne un tableau vide si aucun traitement', async () => {
    mockStorage.getAll.mockResolvedValue([]);
    const useCase = TestBed.inject(GetAllTreatmentsUseCase);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});
