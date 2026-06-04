import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AiService } from './ai.service';
import { LocalSettingsService } from '../../core/services/local-settings.service';
import { ErrorNotificationService } from './error-notification.service';

const API_URL = 'https://api.anthropic.com/v1/messages';

function mockResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('AiService', () => {
  let service: AiService;
  let httpTesting: HttpTestingController;
  let getApiKey: ReturnType<typeof vi.fn>;
  let showWarning: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getApiKey = vi.fn();
    showWarning = vi.fn();
    show = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalSettingsService, useValue: { getApiKey, hasApiKey: vi.fn() } },
        { provide: ErrorNotificationService, useValue: { show, showWarning, showSuccess: vi.fn(), dismiss: vi.fn() } },
      ],
    });

    service = TestBed.inject(AiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('clé API absente', () => {
    beforeEach(() => {
      getApiKey.mockReturnValue(null);
    });

    it('extractMealFromText retourne null, n\'effectue pas de requête HTTP et notifie l\'utilisateur', async () => {
      const result = await service.extractMealFromText('soupe de légumes');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
      expect(showWarning).toHaveBeenCalledWith('Clé API Anthropic non configurée — rendez-vous dans Paramètres');
    });

    it('analyzeMealPhoto retourne null, n\'effectue pas de requête HTTP et notifie l\'utilisateur', async () => {
      const result = await service.analyzeMealPhoto('base64', 'image/jpeg');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
      expect(showWarning).toHaveBeenCalledWith('Clé API Anthropic non configurée — rendez-vous dans Paramètres');
    });

    it('tagNote retourne null, n\'effectue pas de requête HTTP et notifie l\'utilisateur', async () => {
      const result = await service.tagNote('note test');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
      expect(showWarning).toHaveBeenCalledWith('Clé API Anthropic non configurée — rendez-vous dans Paramètres');
    });
  });

  describe('header x-api-key', () => {
    it('inclut le header x-api-key dans la requête HTTP', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);

      expect(req.request.headers.get('x-api-key')).toBe('sk-ant-test-key');
      req.flush(mockResponse('[]'));
      await promise;
    });

    it('inclut le header anthropic-version', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);

      expect(req.request.headers.get('anthropic-version')).toBe('2023-06-01');
      req.flush(mockResponse('[]'));
      await promise;
    });
  });

  describe('erreur réseau', () => {
    it('extractMealFromText retourne null si le réseau échoue', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.error(new ErrorEvent('network error'));

      const result = await promise;
      expect(result).toBeNull();
    });

    it('tagNote retourne null si le réseau échoue', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.tagNote('note test');
      const req = httpTesting.expectOne(API_URL);
      req.error(new ErrorEvent('network error'));

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('JSON invalide dans la réponse', () => {
    it('extractMealFromText retourne null et affiche une erreur si le JSON est invalide', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse('INVALID JSON {{{'));

      const result = await promise;
      expect(result).toBeNull();
      expect(show).toHaveBeenCalledWith('Réponse IA illisible — réessayez');
    });

    it('analyzeMealPhoto retourne null et affiche une erreur si le JSON est invalide', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.analyzeMealPhoto('abc123', 'image/jpeg');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse('pas du JSON'));

      const result = await promise;
      expect(result).toBeNull();
      expect(show).toHaveBeenCalledWith('Réponse IA illisible — réessayez');
    });
  });

  describe('image ne contenant pas de nourriture', () => {
    it('analyzeMealPhoto retourne items vide et affiche le message par défaut si IA retourne un objet sans aliments', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.analyzeMealPhoto('abc123', 'image/jpeg');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(JSON.stringify({ items: [], fodmapAlerts: [] })));

      const result = await promise;
      expect(result?.items).toEqual([]);
      expect(showWarning).toHaveBeenCalledWith('Aucun aliment identifié dans cette image.');
    });

    it('analyzeMealPhoto interprète le format tableau vide hérité et affiche l\'explication de l\'IA', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const aiResponse = '```json\n[]\n```\nCette photo montre une forêt, pas un repas.';
      const promise = service.analyzeMealPhoto('abc123', 'image/jpeg');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(aiResponse));

      const result = await promise;
      expect(result?.items).toEqual([]);
      expect(showWarning).toHaveBeenCalledWith('Cette photo montre une forêt, pas un repas.');
    });
  });

  describe('texte ne décrivant pas un repas', () => {
    it('extractMealFromText retourne items vide et affiche le message par défaut si IA retourne un objet sans aliments', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = service.extractMealFromText('je me sens fatigué aujourd\'hui');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(JSON.stringify({ items: [], fodmapAlerts: [] })));

      const result = await promise;
      expect(result?.items).toEqual([]);
      expect(showWarning).toHaveBeenCalledWith('Aucun aliment identifié dans ce texte.');
    });

    it('extractMealFromText interprète le format tableau vide hérité et affiche l\'explication de l\'IA', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const aiResponse = '```json\n[]\n```\nAucun aliment mentionné dans ce message.';
      const promise = service.extractMealFromText('comment vas-tu ?');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(aiResponse));

      const result = await promise;
      expect(result?.items).toEqual([]);
      expect(showWarning).toHaveBeenCalledWith('Aucun aliment mentionné dans ce message.');
    });
  });

  describe('cas nominal', () => {
    it('extractMealFromText retourne items et aiFodmapFlags parsés depuis la réponse IA', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const foodItems = [{ name: 'Riz', fodmap: { level: 'low' }, confirmed: false }];
      const aiPayload = { items: foodItems, fodmapAlerts: [] };
      const promise = service.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(JSON.stringify(aiPayload)));

      const result = await promise;
      expect(result?.items).toEqual(foodItems);
      expect(result?.aiFodmapFlags).toEqual([]);
    });

    it('extractMealFromText propage les alertes FODMAP retournées par l\'IA', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const foodItems = [{ name: 'Oignon', fodmap: { level: 'high' }, confirmed: false }];
      const alerts = [{ item: 'Oignon', reason: 'Fructanes élevés', severity: 'danger' }];
      const aiPayload = { items: foodItems, fodmapAlerts: alerts };
      const promise = service.extractMealFromText('oignon cru');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(JSON.stringify(aiPayload)));

      const result = await promise;
      expect(result?.aiFodmapFlags).toEqual(alerts);
    });
  });
});
