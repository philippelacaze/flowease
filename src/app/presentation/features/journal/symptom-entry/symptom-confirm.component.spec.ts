import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
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

async function createComponent(stateItems = savedItems, meals: unknown[] = []) {
  const mock = makeUseCaseMock(meals);

  // Simuler history.state
  Object.defineProperty(window, 'history', {
    value: { ...window.history, state: { savedItems: stateItems } },
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

    it('charge les entrées du jour avec la date du jour', async () => {
      const { mock } = await createComponent(savedItems, []);
      expect(mock.execute).toHaveBeenCalledOnce();
      const callArg = mock.execute.mock.calls[0][0] as Date;
      expect(callArg.toDateString()).toBe(new Date().toDateString());
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
