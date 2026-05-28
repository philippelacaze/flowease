import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SymptomEntryComponent } from './symptom-entry.component';
import { AddSymptomUseCase } from '../../../../application/journal/add-symptom.usecase';

type ComponentPrivate = {
  srcMode: string;
  showAddCustom: boolean;
  newCustomLabel: string;
  customSymptoms: unknown[];
  rows: Array<{ key: string; intensity: number; bristolType: unknown; hasBristol: boolean; category: string; labelFr: string; painZones: unknown[]; painTypes: unknown[] }>;
  avgScore: number;
  avgSeverityClass: string;
  activeCount: number;
  hasAnyRating: boolean;
  addCustomSymptom(): void;
  cancelCustom(): void;
  submit(): Promise<void>;
};

function makeUseCaseMock() {
  return { execute: vi.fn().mockResolvedValue('symptom-id') };
}

async function createComponent(mode?: string) {
  const mock = makeUseCaseMock();
  const routerSpy = { navigate: vi.fn().mockResolvedValue(true) };

  await TestBed.configureTestingModule({
    imports: [SymptomEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: AddSymptomUseCase, useValue: mock },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SymptomEntryComponent);
  if (mode) {
    TestBed.inject(provideRouter as never);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, mock };
}

describe('SymptomEntryComponent', () => {

  describe('initialisation', () => {
    it('démarre avec srcMode = form par défaut', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.srcMode).toBe('form');
    });

    it('affiche le titre "Saisir les symptômes" en mode form', async () => {
      const { fixture } = await createComponent();
      const title = fixture.nativeElement.querySelector('.sym-header-title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('Saisir les symptômes');
    });

    it('n\'affiche pas la bannière vocal en mode form', async () => {
      const { fixture } = await createComponent();
      const banner = fixture.debugElement.query(By.css('.sym-voice-banner'));
      expect(banner).toBeNull();
    });
  });

  describe('symptôme personnalisé', () => {
    it('n\'ajoute pas si le champ est vide', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.showAddCustom = true;
      comp.newCustomLabel = '';
      comp.addCustomSymptom();
      expect(comp.customSymptoms).toHaveLength(0);
    });

    it('ajoute un symptôme personnalisé et réinitialise le champ', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.showAddCustom = true;
      comp.newCustomLabel = 'Crampes';
      comp.addCustomSymptom();
      expect(comp.customSymptoms).toHaveLength(1);
      expect(comp.newCustomLabel).toBe('');
      expect(comp.showAddCustom).toBe(false);
    });

    it('cancelCustom réinitialise le formulaire', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.showAddCustom = true;
      comp.newCustomLabel = 'Crampes';
      comp.cancelCustom();
      expect(comp.showAddCustom).toBe(false);
      expect(comp.newCustomLabel).toBe('');
    });

    it('affiche le bouton data-testid="add-custom-symptom"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="add-custom-symptom"]'));
      expect(btn).not.toBeNull();
    });
  });

  describe('calculs de score', () => {
    it('avgScore retourne 0 quand aucune intensité', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.avgScore).toBe(0);
    });

    it('avgScore calcule la moyenne des intensités > 0', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 4;
      comp.rows[1].intensity = 8;
      expect(comp.avgScore).toBe(6);
    });

    it('avgSeverityClass retourne score-low pour 1-3', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 2;
      expect(comp.avgSeverityClass).toBe('score-low');
    });

    it('avgSeverityClass retourne score-high pour > 6', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 8;
      expect(comp.avgSeverityClass).toBe('score-high');
    });

    it('activeCount compte les lignes avec intensité > 0', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 3;
      comp.rows[2].intensity = 7;
      expect(comp.activeCount).toBe(2);
    });

    it('hasAnyRating est vrai si un symptôme personnalisé a une intensité', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.newCustomLabel = 'Crampes';
      comp.addCustomSymptom();
      (comp.customSymptoms[0] as { intensity: number }).intensity = 5;
      expect(comp.hasAnyRating).toBe(true);
    });
  });

  describe('soumission', () => {
    it('ne soumet pas si aucun rating', async () => {
      const { fixture, mock } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      await comp.submit();
      expect(mock.execute).not.toHaveBeenCalled();
    });

    it('appelle addSymptom.execute pour chaque ligne active', async () => {
      const { fixture, mock } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      comp.rows[1].intensity = 3;
      await comp.submit();
      expect(mock.execute).toHaveBeenCalledTimes(2);
    });

    it('affiche le bouton data-testid="submit-symptoms"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="submit-symptoms"]'));
      expect(btn).not.toBeNull();
    });
  });
});
