import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SymptomEntryComponent } from './symptom-entry.component';
import { SymptomService } from '../services/symptom.service';
import type { ActiveSymptomConfig } from '../services/symptom.service';

type StoolRow = {
  key: string; intensity: number; bristolType: unknown; hasBristol: boolean;
  category: string; labelFr: string; painZones: unknown[]; painTypes: unknown[];
  stoolBlood: boolean; stoolMucus: boolean; stoolFrequency: number;
};

type ComponentPrivate = {
  srcMode: string;
  showAddCustom: boolean;
  newCustomLabel: string;
  customSymptoms: unknown[];
  rows: StoolRow[];
  avgScore: number;
  avgSeverityClass: string;
  activeCount: number;
  hasAnyRating: boolean;
  showBloodAlert: boolean;
  addCustomSymptom(): void;
  cancelCustom(): void;
  submit(): Promise<void>;
};

const MOCK_ACTIVE_SYMPTOMS: ActiveSymptomConfig[] = [
  { id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur abdominale', order: 0,  custom: false },
  { id: 'bloating',       key: 'bloating',       label: 'Ballonnements',      order: 1,  custom: false },
  { id: 'nausea',         key: 'nausea',         label: 'Nausées',            order: 2,  custom: false },
  { id: 'fatigue',        key: 'fatigue',        label: 'Fatigue',            order: 3,  custom: false },
];

const MOCK_WITH_TRANSIT: ActiveSymptomConfig[] = [
  ...MOCK_ACTIVE_SYMPTOMS,
  { id: 'transit', key: 'transit', label: 'Transit', order: 4, custom: false },
];

function makeSymptomServiceMock(configs: ActiveSymptomConfig[] = MOCK_ACTIVE_SYMPTOMS) {
  return {
    add: vi.fn().mockResolvedValue('symptom-id'),
    edit: vi.fn().mockResolvedValue(undefined),
    getActiveConfigs: vi.fn().mockResolvedValue(configs),
    saveWellbeing: vi.fn().mockResolvedValue('wb-id'),
  };
}

async function createComponent(mode?: string) {
  const mockService = makeSymptomServiceMock();

  await TestBed.configureTestingModule({
    imports: [SymptomEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: SymptomService, useValue: mockService },
    ],
  }).compileComponents();

  if (mode) {
    history.replaceState({ mode }, '');
  }

  const fixture = TestBed.createComponent(SymptomEntryComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, mockService };
}

async function createComponentWithTransit() {
  const mockService = makeSymptomServiceMock(MOCK_WITH_TRANSIT);

  await TestBed.configureTestingModule({
    imports: [SymptomEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: SymptomService, useValue: mockService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SymptomEntryComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, mockService };
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
      const { fixture, mockService } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      await comp.submit();
      expect(mockService.add).not.toHaveBeenCalled();
    });

    it('appelle symptoms.add pour chaque ligne active', async () => {
      const { fixture, mockService } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      comp.rows[1].intensity = 3;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledTimes(2);
    });

    it('affiche le bouton data-testid="submit-symptoms"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="submit-symptoms"]'));
      expect(btn).not.toBeNull();
    });
  });

  describe('date du journal sélectionnée', () => {
    afterEach(() => history.replaceState({}, ''));

    function twoDaysAgo(): Date {
      const d = new Date();
      d.setDate(d.getDate() - 2);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    it('occurredAt utilise avant-hier quand journalDate = avant-hier', async () => {
      const ref = twoDaysAgo();
      history.replaceState({ journalDate: ref.toISOString() }, '');
      const { fixture, mockService } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      await comp.submit();
      const callArg = mockService.add.mock.calls[0][0] as { occurredAt: Date };
      expect(callArg.occurredAt.getFullYear()).toBe(ref.getFullYear());
      expect(callArg.occurredAt.getMonth()).toBe(ref.getMonth());
      expect(callArg.occurredAt.getDate()).toBe(ref.getDate());
    });

    it('isRetrospective est vrai quand journalDate est antérieure à aujourd\'hui', async () => {
      history.replaceState({ journalDate: twoDaysAgo().toISOString() }, '');
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(true);
    });

    it('isRetrospective est faux par défaut (journalDate = aujourd\'hui)', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(false);
    });

    it('affiche data-testid="retrospective-banner" quand journalDate est antérieure', async () => {
      history.replaceState({ journalDate: twoDaysAgo().toISOString() }, '');
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).not.toBeNull();
    });

    it('n\'affiche pas data-testid="retrospective-banner" pour le jour courant', async () => {
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).toBeNull();
    });

    it('submit navigue vers /journal/symptom/confirm avec journalDate dans le state', async () => {
      const ref = twoDaysAgo();
      history.replaceState({ journalDate: ref.toISOString() }, '');
      const { fixture } = await createComponent();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      await comp.submit();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal/symptom/confirm'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
      );
    });

    it('back() navigue vers /journal en conservant journalDate dans le state', async () => {
      const ref = twoDaysAgo();
      history.replaceState({ journalDate: ref.toISOString() }, '');
      const { fixture } = await createComponent();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { back(): void }).back();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
      );
    });
  });

  describe('transit — blood / mucus / frequency', () => {
    it('initialise stoolBlood, stoolMucus, stoolFrequency à false/0 sur la ligne transit', async () => {
      const { fixture } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const transit = comp.rows.find(r => r.key === 'transit')!;
      expect(transit.stoolBlood).toBe(false);
      expect(transit.stoolMucus).toBe(false);
      expect(transit.stoolFrequency).toBe(0);
    });

    it('showBloodAlert est faux par défaut', async () => {
      const { fixture } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.showBloodAlert).toBe(false);
    });

    it('showBloodAlert passe à vrai quand stoolBlood = true', async () => {
      const { fixture } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'transit')!.stoolBlood = true;
      expect(comp.showBloodAlert).toBe(true);
    });

    it('affiche la bannière d\'alerte sang quand showBloodAlert est vrai', async () => {
      const { fixture } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'transit')!.stoolBlood = true;
      fixture.detectChanges();
      const alert = fixture.debugElement.query(By.css('[data-testid="blood-alert"]'));
      expect(alert).not.toBeNull();
    });

    it('hasAnyRating est vrai quand seul stoolBlood est coché', async () => {
      const { fixture } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'transit')!.stoolBlood = true;
      expect(comp.hasAnyRating).toBe(true);
    });

    it('soumet avec blood et frequency dans stool quand renseignés', async () => {
      const { fixture, mockService } = await createComponentWithTransit();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const transit = comp.rows.find(r => r.key === 'transit')!;
      transit.stoolBlood = true;
      transit.stoolMucus = true;
      transit.stoolFrequency = 3;
      await comp.submit();
      const callArg = mockService.add.mock.calls[0][0] as { stool: { blood: boolean; mucus: boolean; frequency: number } };
      expect(callArg.stool.blood).toBe(true);
      expect(callArg.stool.mucus).toBe(true);
      expect(callArg.stool.frequency).toBe(3);
    });
  });
});
