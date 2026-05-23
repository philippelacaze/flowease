import { describe, it, expect, beforeEach } from 'vitest';
import { LocalSettingsAdapter } from './local-settings.adapter';

describe('LocalSettingsAdapter', () => {
  let adapter: LocalSettingsAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalSettingsAdapter();
  });

  // --- Clé API ---

  describe('getApiKey', () => {
    it('retourne null si aucune clé n\'a été configurée', () => {
      expect(adapter.getApiKey()).toBeNull();
    });

    it('retourne la clé après l\'avoir persistée', () => {
      adapter.setApiKey('sk-ant-test-key');
      expect(adapter.getApiKey()).toBe('sk-ant-test-key');
    });

    it('ne lève jamais d\'exception même si localStorage est vide', () => {
      expect(() => adapter.getApiKey()).not.toThrow();
    });
  });

  describe('hasApiKey', () => {
    it('retourne false si aucune clé n\'est configurée', () => {
      expect(adapter.hasApiKey()).toBe(false);
    });

    it('retourne true après avoir persisté une clé', () => {
      adapter.setApiKey('sk-ant-abc');
      expect(adapter.hasApiKey()).toBe(true);
    });
  });

  describe('clearApiKey', () => {
    it('supprime la clé — getApiKey retourne null ensuite', () => {
      adapter.setApiKey('sk-ant-abc');
      adapter.clearApiKey();
      expect(adapter.getApiKey()).toBeNull();
    });
  });

  // --- Langue ---

  describe('getLanguage', () => {
    it('retourne "fr" par défaut si non configurée', () => {
      expect(adapter.getLanguage()).toBe('fr');
    });

    it('retourne la langue après l\'avoir configurée', () => {
      adapter.setLanguage('en');
      expect(adapter.getLanguage()).toBe('en');
    });
  });

  // --- Thème ---

  describe('getTheme', () => {
    it('retourne "auto" par défaut', () => {
      expect(adapter.getTheme()).toBe('auto');
    });

    it('retourne le thème configuré', () => {
      adapter.setTheme('dark');
      expect(adapter.getTheme()).toBe('dark');
    });
  });

  // --- Fenêtre temporelle par défaut ---

  describe('getDefaultWindow', () => {
    it('retourne 14 par défaut', () => {
      expect(adapter.getDefaultWindow()).toBe(14);
    });

    it('retourne la valeur configurée', () => {
      adapter.setDefaultWindow(30);
      expect(adapter.getDefaultWindow()).toBe(30);
    });
  });

  // --- Date de dernière analyse ---

  describe('getLastAnalysisDate', () => {
    it('retourne null si jamais lancée', () => {
      expect(adapter.getLastAnalysisDate()).toBeNull();
    });

    it('retourne la date persistée', () => {
      const now = new Date('2026-05-23T10:00:00.000Z');
      adapter.setLastAnalysisDate(now);
      const retrieved = adapter.getLastAnalysisDate();
      expect(retrieved?.toISOString()).toBe(now.toISOString());
    });
  });

  // --- Compteur de tokens ---

  describe('getShowTokenCounter', () => {
    it('retourne false par défaut', () => {
      expect(adapter.getShowTokenCounter()).toBe(false);
    });

    it('retourne true après activation', () => {
      adapter.setShowTokenCounter(true);
      expect(adapter.getShowTokenCounter()).toBe(true);
    });
  });
});
