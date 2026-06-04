import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { vi } from 'vitest';
import { CoachContextPickerComponent } from './coach-context-picker.component';
import { CoachService } from '../services/coach.service';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

const mockCoach = {
  startSession: vi.fn().mockResolvedValue({ sessionId: 's1', contextWindow: '7d', previousSummary: undefined }),
};
const mockBottomSheetRef = { dismiss: vi.fn() };
const mockSettings = {
  getDefaultContextWindow: vi.fn().mockReturnValue('14d'),
};

async function createComponent(currentWindow = '14d') {
  await TestBed.configureTestingModule({
    imports: [CoachContextPickerComponent, NoopAnimationsModule],
    providers: [
      { provide: CoachService, useValue: mockCoach },
      { provide: MatBottomSheetRef, useValue: mockBottomSheetRef },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: { currentWindow } },
      { provide: LocalSettingsService, useValue: mockSettings },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CoachContextPickerComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('CoachContextPickerComponent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('pré-sélection du contexte actif', () => {
    it('marque le badge "Actif" sur l\'option correspondant à currentWindow', async () => {
      const fixture = await createComponent('7d');
      const option7d = fixture.nativeElement.querySelector('[data-testid="context-option-7d"]');
      expect(option7d.textContent).toContain('Actif');
    });

    it('n\'affiche pas "Actif" sur les options non actives', async () => {
      const fixture = await createComponent('7d');
      const option14d = fixture.nativeElement.querySelector('[data-testid="context-option-14d"]');
      expect(option14d.textContent).not.toContain('Actif');
    });

    it('applique la classe context-option--active sur l\'option active', async () => {
      const fixture = await createComponent('today');
      const optionToday = fixture.nativeElement.querySelector('[data-testid="context-option-today"]');
      expect(optionToday.classList).toContain('context-option--active');
    });
  });

  describe('badge "Défaut" (paramètre settings)', () => {
    it('affiche le badge "Défaut" sur l\'option correspondant au paramètre par défaut', async () => {
      const fixture = await createComponent('7d'); // actif = 7d, défaut settings = 14d
      const option14d = fixture.nativeElement.querySelector('[data-testid="context-option-14d"]');
      expect(option14d.textContent).toContain('Défaut');
    });

    it('une option peut porter à la fois "Actif" et "Défaut" si actif === défaut', async () => {
      const fixture = await createComponent('14d'); // actif = 14d = défaut settings
      const option14d = fixture.nativeElement.querySelector('[data-testid="context-option-14d"]');
      expect(option14d.textContent).toContain('Actif');
      expect(option14d.textContent).toContain('Défaut');
    });

    it('n\'affiche pas "Défaut" sur les autres options', async () => {
      const fixture = await createComponent('14d');
      const option7d = fixture.nativeElement.querySelector('[data-testid="context-option-7d"]');
      expect(option7d.textContent).not.toContain('Défaut');
    });
  });

  describe('sélection d\'une option', () => {
    it('appelle StartCoachSessionUseCase avec la clé sélectionnée', async () => {
      const fixture = await createComponent('14d');
      const option7d = fixture.nativeElement.querySelector('[data-testid="context-option-7d"]');
      option7d.click();
      await fixture.whenStable();
      expect(mockCoach.startSession).toHaveBeenCalledWith('7d');
    });

    it('ferme le bottom sheet avec le résultat de la session', async () => {
      const fixture = await createComponent('14d');
      const option7d = fixture.nativeElement.querySelector('[data-testid="context-option-7d"]');
      option7d.click();
      await fixture.whenStable();
      expect(mockBottomSheetRef.dismiss).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 's1', contextWindow: '7d' }),
      );
    });

    it('n\'appelle pas execute une deuxième fois si loading est en cours', async () => {
      let resolve!: () => void;
      mockCoach.startSession.mockReturnValue(new Promise<void>(r => { resolve = r; }));
      const fixture = await createComponent('14d');

      const option7d = fixture.nativeElement.querySelector('[data-testid="context-option-7d"]');
      option7d.click();
      option7d.click();
      fixture.detectChanges();

      expect(mockCoach.startSession).toHaveBeenCalledTimes(1);
      resolve();
    });
  });

  describe('affichage des options', () => {
    it('affiche les 5 fenêtres de contexte', async () => {
      const fixture = await createComponent();
      const options = fixture.nativeElement.querySelectorAll('.context-option');
      expect(options).toHaveLength(5);
    });

    it('initialise selectedKey depuis MAT_BOTTOM_SHEET_DATA si absent → repli sur défaut', async () => {
      await TestBed.configureTestingModule({
        imports: [CoachContextPickerComponent, NoopAnimationsModule],
        providers: [
          { provide: CoachService, useValue: mockCoach },
          { provide: MatBottomSheetRef, useValue: mockBottomSheetRef },
          { provide: MAT_BOTTOM_SHEET_DATA, useValue: null },
          { provide: LocalSettingsService, useValue: mockSettings },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(CoachContextPickerComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Sans data, selectedKey = defaultKey = '14d'
      const option14d = fixture.nativeElement.querySelector('[data-testid="context-option-14d"]');
      expect(option14d.textContent).toContain('Actif');
    });
  });
});