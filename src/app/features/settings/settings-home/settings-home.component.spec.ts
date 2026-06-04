import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { vi } from 'vitest';
import { SettingsHomeComponent } from './settings-home.component';

const mockSettings = (hasKey: boolean) => ({
  hasApiKey: vi.fn().mockReturnValue(hasKey),
  getLastAnalysisDate: vi.fn().mockReturnValue(null),
  getLanguage: vi.fn().mockReturnValue('fr'),
  getShowTokenCounter: vi.fn().mockReturnValue(false),
  getTheme: vi.fn().mockReturnValue('auto'),
  setTheme: vi.fn(),
  setLastAnalysisDate: vi.fn(),
});

async function createComponent(hasKey = false) {
  await TestBed.configureTestingModule({
    imports: [SettingsHomeComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: LocalSettingsService, useValue: mockSettings(hasKey) },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SettingsHomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('SettingsHomeComponent', () => {
  describe('banner API key', () => {
    it('affiche le banner "non configurée" quand hasApiKey retourne false', async () => {
      const fixture = await createComponent(false);
      expect(fixture.nativeElement.querySelector('[data-testid="api-banner-warn"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="api-banner-ok"]')).toBeNull();
    });

    it('affiche le banner "configurée" quand hasApiKey retourne true', async () => {
      const fixture = await createComponent(true);
      expect(fixture.nativeElement.querySelector('[data-testid="api-banner-ok"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="api-banner-warn"]')).toBeNull();
    });
  });

  describe('liste de navigation', () => {
    it('affiche 7 entrées', async () => {
      const fixture = await createComponent();
      const items = fixture.nativeElement.querySelectorAll('.settings-item');
      expect(items).toHaveLength(7);
    });

    it('affiche le lien vers le profil', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="settings-profile"]')).not.toBeNull();
    });

    it('affiche le lien vers la clé API', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="settings-api-key"]')).not.toBeNull();
    });

    it('affiche le lien vers les traitements', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="settings-treatments"]')).not.toBeNull();
    });

    it('affiche le lien vers À propos', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="settings-about"]')).not.toBeNull();
    });

    it('affiche un emoji pour chaque item', async () => {
      const fixture = await createComponent();
      const icons = fixture.nativeElement.querySelectorAll('.settings-item-icon');
      icons.forEach((icon: Element) => {
        expect(icon.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it('la dernière entrée a la classe settings-item--last', async () => {
      const fixture = await createComponent();
      const items = fixture.nativeElement.querySelectorAll('.settings-item');
      expect(items[items.length - 1].classList).toContain('settings-item--last');
    });
  });

  describe('footer', () => {
    it('affiche le footer avec la version', async () => {
      const fixture = await createComponent();
      const footer = fixture.nativeElement.querySelector('.settings-footer');
      expect(footer?.textContent).toContain('FlowEase');
    });
  });
});