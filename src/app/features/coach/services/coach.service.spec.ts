import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';
import { vi } from 'vitest';
import { CoachService } from './coach.service';
import type { StoredCoachSession, SendCoachMessageInput } from './coach.service';
import type { UserProfileEntity } from '../../../core/models/entities/user-profile.entity';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { MealEntity } from '../../../core/models/entities/meal.entity';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { CoachContext } from '../../../core/services/ai.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const mockSession: StoredCoachSession = {
  id: 'session-test-abc',
  contextWindow: '7d',
  messages: [],
  totalTokens: 0,
  startedAt: new Date('2026-05-23T09:00:00'),
};

const mockContext: CoachContext = {
  contextWindow: '7d',
  userConditions: ['sibo_hydrogen'],
  protocol: 'strict',
  activeTreatments: ['Rifaximin'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function* tokenStream(...tokens: string[]): AsyncIterable<string> {
  for (const t of tokens) yield t;
}

async function collectTokens(gen: AsyncGenerator<string>): Promise<string[]> {
  const tokens: string[] = [];
  for await (const t of gen) tokens.push(t);
  return tokens;
}

function makeStorage(overrides: {
  profiles?: UserProfileEntity[];
  treatments?: TreatmentEntity[];
  meals?: MealEntity[];
  symptoms?: SymptomEntity[];
  session?: StoredCoachSession | undefined;
  sessions?: StoredCoachSession[];
} = {}) {
  return {
    get: vi.fn().mockResolvedValue(overrides.session !== undefined ? overrides.session : mockSession),
    getAll: vi.fn().mockImplementation((store: string) => {
      if (store === 'user-profile') return Promise.resolve(overrides.profiles ?? [profileFixture]);
      if (store === 'treatments') return Promise.resolve(overrides.treatments ?? [activeTreatment, inactiveTreatment]);
      if (store === 'coach-sessions') return Promise.resolve(overrides.sessions ?? []);
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

function setup(storage = makeStorage(), ai?: object) {
  TestBed.configureTestingModule({
    providers: [
      CoachService,
      { provide: StorageService, useValue: storage },
      ...(ai ? [{ provide: AiService, useValue: ai }] : [{ provide: AiService, useClass: NullAiService }]),
    ],
  });
  return { service: TestBed.inject(CoachService), storage };
}

// ── buildContext ───────────────────────────────────────────────────────────────

describe('CoachService — buildContext', () => {

  describe('profil et traitements', () => {
    it('inclut les conditions médicales du profil', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('14d');
      expect(ctx.userConditions).toEqual(['sibo_hydrogen', 'gastroparesis']);
    });

    it('inclut le protocole du profil', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('14d');
      expect(ctx.protocol).toBe('strict');
    });

    it('inclut uniquement les traitements actifs', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('14d');
      expect(ctx.activeTreatments).toEqual(['Rifaximin']);
    });

    it('retourne des listes vides quand aucun profil n\'est configuré', async () => {
      const { service } = setup(makeStorage({ profiles: [], treatments: [] }));
      const ctx = await service.buildContext('14d');
      expect(ctx.userConditions).toEqual([]);
      expect(ctx.protocol).toBe('none');
      expect(ctx.activeTreatments).toEqual([]);
    });
  });

  describe('fenêtre de contexte', () => {
    it('inclut healthDataJson pour la fenêtre "today"', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('today');
      expect(ctx.healthDataJson).toBeDefined();
    });

    it('inclut les repas dans healthDataJson pour "7d"', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('7d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toHaveLength(1);
      expect(data.meals[0].type).toBe('lunch');
      expect(data.meals[0].items).toContain('riz 150g');
    });

    it('inclut les symptômes dans healthDataJson pour "14d"', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('14d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.symptoms).toHaveLength(1);
      expect(data.symptoms[0].symptom).toBe('abdominal_pain');
      expect(data.symptoms[0].intensity).toBe(6);
    });

    it('inclut les données pour "30d"', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('30d');
      expect(ctx.healthDataJson).toBeDefined();
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toBeDefined();
      expect(data.symptoms).toBeDefined();
    });

    it('n\'inclut pas healthDataJson pour "profile_only"', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('profile_only');
      expect(ctx.healthDataJson).toBeUndefined();
    });

    it('ne charge pas getRange pour "profile_only"', async () => {
      const storage = makeStorage();
      const { service } = setup(storage);
      await service.buildContext('profile_only');
      expect(storage.getRange).not.toHaveBeenCalled();
    });

    it('conserve la contextWindow dans le résultat', async () => {
      const { service } = setup();
      const ctx = await service.buildContext('7d');
      expect(ctx.contextWindow).toBe('7d');
    });
  });

  describe('données journalières vides', () => {
    it('retourne un healthDataJson avec listes vides si aucune donnée', async () => {
      const { service } = setup(makeStorage({ meals: [], symptoms: [] }));
      const ctx = await service.buildContext('14d');
      const data = JSON.parse(ctx.healthDataJson!);
      expect(data.meals).toEqual([]);
      expect(data.symptoms).toEqual([]);
    });
  });
});

// ── sendMessage ────────────────────────────────────────────────────────────────

describe('CoachService — sendMessage', () => {
  const mockInput: SendCoachMessageInput = {
    sessionId: mockSession.id,
    userMessage: 'Quels aliments éviter avec le SIBO ?',
    history: [],
    context: mockContext,
  };

  describe('nominal — AiService disponible et session existante', () => {
    let mockStorage: ReturnType<typeof makeStorage>;
    const mockAi = { sendMessage: vi.fn(), summarizeSession: vi.fn() };

    beforeEach(() => {
      mockStorage = makeStorage();
      vi.clearAllMocks();
      mockAi.sendMessage.mockReturnValue(tokenStream('Bonjour', ' !', ' Évitez les FODMAPs.'));

      TestBed.configureTestingModule({
        providers: [
          CoachService,
          { provide: AiService, useValue: mockAi },
          { provide: StorageService, useValue: mockStorage },
        ],
      });
    });

    it('yield les tokens de la réponse un par un', async () => {
      const service = TestBed.inject(CoachService);
      const tokens = await collectTokens(service.sendMessage(mockInput));
      expect(tokens).toEqual(['Bonjour', ' !', ' Évitez les FODMAPs.']);
    });

    it('transmet le message utilisateur au service IA', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      expect(mockAi.sendMessage).toHaveBeenCalledWith(
        mockInput.userMessage,
        mockInput.history,
        mockInput.context,
      );
    });

    it('persiste le message utilisateur avant le streaming', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      const firstSave = mockStorage.save.mock.calls[0];
      expect(firstSave[0]).toBe('coach-sessions');
      const savedSession = firstSave[1] as StoredCoachSession;
      expect(savedSession.messages.some(m => m.role === 'user' && m.content === mockInput.userMessage)).toBe(true);
    });

    it('persiste la réponse complète de l\'assistant après le streaming', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.messages.some(m => m.role === 'assistant' && m.content === 'Bonjour ! Évitez les FODMAPs.')).toBe(true);
    });

    it('met à jour le compteur de tokens de la session', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('mode dégradé — NullAiService injecté', () => {
    let mockStorage: ReturnType<typeof makeStorage>;

    beforeEach(() => {
      mockStorage = makeStorage();

      TestBed.configureTestingModule({
        providers: [
          CoachService,
          { provide: AiService, useClass: NullAiService },
          { provide: StorageService, useValue: mockStorage },
        ],
      });
    });

    it('ne yield aucun token sans lever d\'exception', async () => {
      const service = TestBed.inject(CoachService);
      const tokens = await collectTokens(service.sendMessage(mockInput));
      expect(tokens).toEqual([]);
    });

    it('persiste quand même le message utilisateur', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      expect(mockStorage.save).toHaveBeenCalledWith(
        'coach-sessions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: mockInput.userMessage }),
          ]),
        }),
      );
    });

    it('persiste un message assistant avec contenu vide', async () => {
      const service = TestBed.inject(CoachService);
      await collectTokens(service.sendMessage(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.messages.some(m => m.role === 'assistant' && m.content === '')).toBe(true);
    });
  });

  describe('session introuvable', () => {
    it('termine sans erreur quand la session est introuvable', async () => {
      const storage = makeStorage({ session: undefined });
      setup(storage);
      const service = TestBed.inject(CoachService);
      const tokens = await collectTokens(service.sendMessage(mockInput));
      expect(tokens).toEqual([]);
    });
  });
});

// ── startSession ──────────────────────────────────────────────────────────────

describe('CoachService — startSession', () => {
  it('crée et persiste une nouvelle session', async () => {
    const storage = makeStorage({ sessions: [] });
    setup(storage);
    const service = TestBed.inject(CoachService);
    const result = await service.startSession('14d');
    expect(result.sessionId).toBeDefined();
    expect(result.contextWindow).toBe('14d');
    expect(storage.save).toHaveBeenCalledWith('coach-sessions', expect.objectContaining({ contextWindow: '14d', messages: [] }));
  });

  it('retourne le résumé de la session précédente si disponible', async () => {
    const sessionWithSummary: StoredCoachSession = {
      ...mockSession,
      summary: { content: 'Résumé session précédente', generatedAt: new Date(), tokenCount: 10 },
    };
    const storage = makeStorage({ sessions: [sessionWithSummary] });
    setup(storage);
    const service = TestBed.inject(CoachService);
    const result = await service.startSession('7d');
    expect(result.previousSummary).toBe('Résumé session précédente');
  });

  it('retourne undefined pour previousSummary si aucune session avec résumé', async () => {
    const storage = makeStorage({ sessions: [] });
    setup(storage);
    const service = TestBed.inject(CoachService);
    const result = await service.startSession('today');
    expect(result.previousSummary).toBeUndefined();
  });
});

// ── getHistory / deleteAllHistory ─────────────────────────────────────────────

describe('CoachService — getHistory', () => {
  it('retourne les sessions triées par date décroissante', async () => {
    const older: StoredCoachSession = { ...mockSession, id: 's1', startedAt: new Date('2026-04-01') };
    const newer: StoredCoachSession = { ...mockSession, id: 's2', startedAt: new Date('2026-05-01') };
    const storage = makeStorage({ sessions: [older, newer] });
    setup(storage);
    const service = TestBed.inject(CoachService);
    const sessions = await service.getHistory();
    expect(sessions[0].id).toBe('s2');
    expect(sessions[1].id).toBe('s1');
  });

  it('retourne un tableau vide si aucune session', async () => {
    const storage = makeStorage({ sessions: [] });
    setup(storage);
    const service = TestBed.inject(CoachService);
    const sessions = await service.getHistory();
    expect(sessions).toEqual([]);
  });
});

describe('CoachService — deleteAllHistory', () => {
  it('appelle clear sur le store coach-sessions', async () => {
    const storage = makeStorage();
    setup(storage);
    const service = TestBed.inject(CoachService);
    await service.deleteAllHistory();
    expect(storage.clear).toHaveBeenCalledWith('coach-sessions');
  });
});
