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

  // --- Fenêtre de contexte par défaut ---

  describe('getDefaultContextWindow', () => {
    it('retourne "14d" par défaut si aucune valeur n\'est configurée', () => {
      expect(adapter.getDefaultContextWindow()).toBe('14d');
    });

    it('retourne la valeur CoachContextWindow configurée', () => {
      adapter.setDefaultContextWindow('30d');
      expect(adapter.getDefaultContextWindow()).toBe('30d');
    });

    it('retourne "today" correctement', () => {
      adapter.setDefaultContextWindow('today');
      expect(adapter.getDefaultContextWindow()).toBe('today');
    });

    it('retourne "profile_only" correctement', () => {
      adapter.setDefaultContextWindow('profile_only');
      expect(adapter.getDefaultContextWindow()).toBe('profile_only');
    });

    it('migre l\'ancienne valeur "14" vers "14d"', () => {
      localStorage.setItem('flowease_default_window', '14');
      expect(adapter.getDefaultContextWindow()).toBe('14d');
    });

    it('migre l\'ancienne valeur "7" vers "7d"', () => {
      localStorage.setItem('flowease_default_window', '7');
      expect(adapter.getDefaultContextWindow()).toBe('7d');
    });

    it('migre l\'ancienne valeur "30" vers "30d"', () => {
      localStorage.setItem('flowease_default_window', '30');
      expect(adapter.getDefaultContextWindow()).toBe('30d');
    });

    it('migre l\'ancienne valeur "profile" vers "profile_only"', () => {
      localStorage.setItem('flowease_default_window', 'profile');
      expect(adapter.getDefaultContextWindow()).toBe('profile_only');
    });

    it('retourne "14d" comme fallback pour une valeur inconnue', () => {
      localStorage.setItem('flowease_default_window', 'unknown_value');
      expect(adapter.getDefaultContextWindow()).toBe('14d');
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
