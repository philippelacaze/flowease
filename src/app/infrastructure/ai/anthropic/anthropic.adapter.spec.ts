import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from './anthropic.adapter';
import { LocalSettingsAdapter } from '../../storage/local-settings.adapter';

const API_URL = 'https://api.anthropic.com/v1/messages';

function mockResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let httpTesting: HttpTestingController;
  let getApiKey: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getApiKey = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AnthropicAdapter,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalSettingsAdapter, useValue: { getApiKey, hasApiKey: vi.fn() } },
      ],
    });

    adapter = TestBed.inject(AnthropicAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // --- Cas : clé API absente ---

  describe('clé API absente', () => {
    beforeEach(() => {
      getApiKey.mockReturnValue(null);
    });

    it('extractMealFromText retourne null sans effectuer de requête HTTP', async () => {
      const result = await adapter.extractMealFromText('soupe de légumes');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
    });

    it('analyzeMealPhoto retourne null sans effectuer de requête HTTP', async () => {
      const result = await adapter.analyzeMealPhoto('base64', 'image/jpeg');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
    });

    it('tagNote retourne null sans effectuer de requête HTTP', async () => {
      const result = await adapter.tagNote('note test');
      expect(result).toBeNull();
      httpTesting.expectNone(API_URL);
    });
  });

  // --- Cas : header x-api-key présent ---

  describe('header x-api-key', () => {
    it('inclut le header x-api-key dans la requête HTTP', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);

      expect(req.request.headers.get('x-api-key')).toBe('sk-ant-test-key');
      req.flush(mockResponse('[]'));
      await promise;
    });

    it('inclut le header anthropic-version', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);

      expect(req.request.headers.get('anthropic-version')).toBe('2023-06-01');
      req.flush(mockResponse('[]'));
      await promise;
    });
  });

  // --- Cas : erreur réseau ---

  describe('erreur réseau', () => {
    it('extractMealFromText retourne null si le réseau échoue', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.error(new ErrorEvent('network error'));

      const result = await promise;
      expect(result).toBeNull();
    });

    it('tagNote retourne null si le réseau échoue', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.tagNote('note test');
      const req = httpTesting.expectOne(API_URL);
      req.error(new ErrorEvent('network error'));

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  // --- Cas : JSON invalide ---

  describe('JSON invalide dans la réponse', () => {
    it('extractMealFromText retourne un tableau vide si le JSON est invalide', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse('INVALID JSON {{{'));

      const result = await promise;
      expect(result).toEqual([]);
    });

    it('analyzeMealPhoto retourne un tableau vide si le JSON est invalide', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const promise = adapter.analyzeMealPhoto('abc123', 'image/jpeg');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse('pas du JSON'));

      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  // --- Cas nominal ---

  describe('cas nominal', () => {
    it('extractMealFromText retourne les aliments parsés depuis la réponse IA', async () => {
      getApiKey.mockReturnValue('sk-ant-test-key');

      const foodItems = [{ name: 'Riz', fodmap: { level: 'low' }, confirmed: false }];
      const promise = adapter.extractMealFromText('riz blanc');
      const req = httpTesting.expectOne(API_URL);
      req.flush(mockResponse(JSON.stringify(foodItems)));

      const result = await promise;
      expect(result).toEqual(foodItems);
    });
  });
});
