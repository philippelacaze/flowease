import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SymptomConfirmComponent } from './symptom-confirm.component';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';

const savedItems = [
  { key: 'bloating',  labelFr: 'Ballonnements', intensity: 7, category: 'digestive' },
  { key: 'fatigue',   labelFr: 'Fatigue',       intensity: 5, category: 'systemic'  },
];

function makeUseCaseMock(meals: unknown[] = []) {
  return { execute: vi.fn().mockResolvedValue(meals) };
}

async function createComponent(stateItems = savedItems, meals: unknown[] = [], journalDateIso?: string) {
  const mock = makeUseCaseMock(meals);

  const state: Record<string, unknown> = { savedItems: stateItems };
  if (journalDateIso) state['journalDate'] = journalDateIso;

  // Simuler history.state
  Object.defineProperty(window, 'history', {
    value: { ...window.history, state },
    configurable: true,
  });

  await TestBed.configureTestingModule({
    imports: [SymptomConfirmComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: GetJournalDayUseCase, useValue: mock },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SymptomConfirmComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mock };
}

describe('SymptomConfirmComponent', () => {

  describe('affichage', () => {
    it('affiche autant de lignes de symptômes que d\'items reçus', async () => {
      const { fixture } = await createComponent();
      const items = fixture.debugElement.queryAll(By.css('.symptom-item'));
      expect(items).toHaveLength(savedItems.length);
    });

    it('affiche le nom de chaque symptôme', async () => {
      const { fixture } = await createComponent();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Ballonnements');
      expect(text).toContain('Fatigue');
    });

    it('affiche le bouton data-testid="back-to-journal"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="back-to-journal"]'));
      expect(btn).not.toBeNull();
    });
  });

  describe('corrélation repas', () => {
    it('affiche "Aucun repas" quand le journal est vide', async () => {
      const { fixture } = await createComponent(savedItems, []);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Aucun repas');
    });

    it('charge les entrées du jour avec la date du jour par défaut', async () => {
      const { mock } = await createComponent(savedItems, []);
      expect(mock.execute).toHaveBeenCalledOnce();
      const callArg = mock.execute.mock.calls[0][0] as Date;
      expect(callArg.toDateString()).toBe(new Date().toDateString());
    });

    it('charge les entrées du jour sélectionné quand journalDate est dans le state', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const { mock } = await createComponent(savedItems, [], yesterday.toISOString());
      expect(mock.execute).toHaveBeenCalledOnce();
      const callArg = mock.execute.mock.calls[0][0] as Date;
      expect(callArg.toDateString()).toBe(yesterday.toDateString());
    });
  });

  describe('retour au journal', () => {
    it('back() navigue vers /journal en conservant journalDate dans le state', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const { fixture } = await createComponent(savedItems, [], yesterday.toISOString());
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { back(): void }).back();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: yesterday.toISOString() }) }),
      );
    });

    it('back() navigue vers /journal avec la date du jour si journalDate absent du state', async () => {
      const { fixture } = await createComponent();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { back(): void }).back();

      const callState = (navigateSpy.mock.calls[0][1] as { state: { journalDate: string } }).state;
      expect(new Date(callState.journalDate).toDateString()).toBe(new Date().toDateString());
    });
  });

  describe('gestion des items vides', () => {
    it('n\'affiche pas la section récapitulatif si aucun item', async () => {
      const { fixture } = await createComponent([]);
      const items = fixture.debugElement.queryAll(By.css('.symptom-item'));
      expect(items).toHaveLength(0);
    });
  });
});
