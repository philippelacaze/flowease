import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SendCoachMessageUseCase } from './send-coach-message.usecase';
import { COACH_PORT, STORAGE_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { CoachContext } from '../../domain/repositories/ai/coach.port';
import type { StoredCoachSession } from './coach-session.types';

const mockContext: CoachContext = {
  contextWindow: '7d',
  userConditions: ['sibo_hydrogen'],
  protocol: 'strict',
  activeTreatments: ['Rifaximin'],
};

const mockSession: StoredCoachSession = {
  id: 'session-test-abc',
  contextWindow: '7d',
  messages: [],
  totalTokens: 0,
  startedAt: new Date('2026-05-23T09:00:00'),
};

const mockInput = {
  sessionId: mockSession.id,
  userMessage: 'Quels aliments éviter avec le SIBO ?',
  history: [],
  context: mockContext,
};

async function* tokenStream(...tokens: string[]): AsyncIterable<string> {
  for (const t of tokens) yield t;
}

async function collectTokens(gen: AsyncGenerator<string>): Promise<string[]> {
  const tokens: string[] = [];
  for await (const t of gen) tokens.push(t);
  return tokens;
}

function makeStorageMock(sessionToReturn: StoredCoachSession | undefined = mockSession) {
  return {
    get: vi.fn().mockResolvedValue(sessionToReturn),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(mockSession.id),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SendCoachMessageUseCase', () => {

  describe('nominal — port IA disponible et session existante', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;
    const mockCoachPort = { sendMessage: vi.fn(), summarizeSession: vi.fn() };

    beforeEach(() => {
      mockStorage = makeStorageMock();
      vi.clearAllMocks();
      mockCoachPort.sendMessage.mockReturnValue(tokenStream('Bonjour', ' !', ' Évitez les FODMAPs.'));

      TestBed.configureTestingModule({
        providers: [
          SendCoachMessageUseCase,
          { provide: COACH_PORT, useValue: mockCoachPort },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('yield les tokens de la réponse un par un', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      const tokens = await collectTokens(useCase.execute(mockInput));
      expect(tokens).toEqual(['Bonjour', ' !', ' Évitez les FODMAPs.']);
    });

    it('transmet le message utilisateur au port Coach', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
      expect(mockCoachPort.sendMessage).toHaveBeenCalledWith(
        mockInput.userMessage,
        mockInput.history,
        mockInput.context,
      );
    });

    it('persiste le message utilisateur avant le streaming', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
      const firstSave = mockStorage.save.mock.calls[0];
      expect(firstSave[0]).toBe('coach-sessions');
      const savedSession = firstSave[1] as StoredCoachSession;
      expect(savedSession.messages.some(m => m.role === 'user' && m.content === mockInput.userMessage)).toBe(true);
    });

    it('persiste la réponse complète de l\'assistant après le streaming', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.messages.some(m => m.role === 'assistant' && m.content === 'Bonjour ! Évitez les FODMAPs.')).toBe(true);
    });

    it('met à jour le compteur de tokens de la session', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();

      TestBed.configureTestingModule({
        providers: [
          SendCoachMessageUseCase,
          { provide: COACH_PORT, useClass: NullAIAdapter },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne yield aucun token sans lever d\'exception', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      const tokens = await collectTokens(useCase.execute(mockInput));
      expect(tokens).toEqual([]);
    });

    it('persiste quand même le message utilisateur', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
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
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      await collectTokens(useCase.execute(mockInput));
      const lastSave = mockStorage.save.mock.calls.at(-1);
      const finalSession = lastSave![1] as StoredCoachSession;
      expect(finalSession.messages.some(m => m.role === 'assistant' && m.content === '')).toBe(true);
    });
  });

  describe('session introuvable', () => {
    beforeEach(() => {
      const emptyStorage = makeStorageMock(undefined);
      // sendMessage doit retourner un AsyncIterable<string> valide (contrat CoachPort)
      const mockCoachPort = { sendMessage: vi.fn(async function* () {}), summarizeSession: vi.fn() };

      TestBed.configureTestingModule({
        providers: [
          SendCoachMessageUseCase,
          { provide: COACH_PORT, useValue: mockCoachPort },
          { provide: STORAGE_PORT, useValue: emptyStorage },
        ],
      });
    });

    it('termine sans erreur quand la session est introuvable', async () => {
      const useCase = TestBed.inject(SendCoachMessageUseCase);
      const tokens = await collectTokens(useCase.execute(mockInput));
      expect(tokens).toEqual([]);
    });
  });
});
