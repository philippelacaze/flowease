import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SymptomEntryComponent } from './symptom-entry.component';
import { SymptomService } from '../services/symptom.service';
import type { ActiveSymptomConfig } from '../services/symptom.service';

type SymptomRowPartial = {
  key: string; intensity: number; bristolType: unknown; hasBristol: boolean;
  hasGas: boolean;
  hasYesNo: boolean;
  hasSleepHours: boolean; sleepHours: number | null;
  hasDelay: boolean; postmealDelay: number | null;
  invertedScale: boolean;
  category: string; labelFr: string; painZones: unknown[]; painTypes: unknown[];
  stoolBlood: boolean; stoolMucus: boolean; stoolFrequency: number;
};

type ComponentPrivate = {
  srcMode: string;
  rows: SymptomRowPartial[];
  activeCount: number;
  hasAnyRating: boolean;
  showBloodAlert: boolean;
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

const MOCK_WITH_WELLBEING: ActiveSymptomConfig[] = [
  ...MOCK_ACTIVE_SYMPTOMS,
  { id: 'wellbeing_score', key: 'wellbeing_score', label: 'Mal-être', order: 5, custom: false },
  { id: 'mood',            key: 'mood',            label: 'Anxiété',  order: 6, custom: false },
];

const MOCK_WITH_GAS: ActiveSymptomConfig[] = [
  { id: 'gas',      key: 'gas',      label: 'Flatulences', order: 0, custom: false },
  { id: 'belching', key: 'belching', label: 'Éructations', order: 1, custom: false },
];

const MOCK_WITH_JOINT_PAIN: ActiveSymptomConfig[] = [
  { id: 'joint_pain', key: 'joint_pain', label: 'Douleurs articulaires', order: 0, custom: false },
];

const MOCK_WITH_SLEEP: ActiveSymptomConfig[] = [
  { id: 'sleep_quality', key: 'sleep_quality', label: 'Qualité du sommeil', order: 0, custom: false },
];

const MOCK_WITH_POSTMEAL: ActiveSymptomConfig[] = [
  { id: 'postmeal_heaviness', key: 'postmeal_heaviness', label: 'Lourdeur post-repas', order: 0, custom: false },
];

const MOCK_WITH_EARLY_SATIETY: ActiveSymptomConfig[] = [
  { id: 'early_satiety', key: 'early_satiety', label: 'Plénitude précoce', order: 0, custom: false },
];

function makeSymptomServiceMock(configs: ActiveSymptomConfig[] = MOCK_ACTIVE_SYMPTOMS) {
  return {
    add: vi.fn().mockResolvedValue('symptom-id'),
    edit: vi.fn().mockResolvedValue(undefined),
    upsertDaySymptom: vi.fn().mockResolvedValue('upsert-id'),
    getActiveConfigs: vi.fn().mockResolvedValue(configs),
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

async function createComponentWithWellbeing() {
  const mockService = makeSymptomServiceMock(MOCK_WITH_WELLBEING);
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

async function createComponentWith(configs: ActiveSymptomConfig[]) {
  const mockService = makeSymptomServiceMock(configs);
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

  describe('comptage des entrées actives', () => {
    it('activeCount compte les lignes avec intensité > 0', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 3;
      comp.rows[2].intensity = 7;
      expect(comp.activeCount).toBe(2);
    });
  });

  describe('Bloc C — bien-être', () => {
    it('wellbeingRows contient wellbeing_score quand actif dans la config', async () => {
      const { fixture } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as { wellbeingRows: SymptomRowPartial[] };
      expect(comp.wellbeingRows.some(r => r.key === 'wellbeing_score')).toBe(true);
    });

    it('wellbeingRows contient mood quand actif dans la config', async () => {
      const { fixture } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as { wellbeingRows: SymptomRowPartial[] };
      expect(comp.wellbeingRows.some(r => r.key === 'mood')).toBe(true);
    });

    it('submit appelle upsertDaySymptom pour wellbeing_score', async () => {
      const { fixture, mockService } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const wbRow = comp.rows.find(r => r.key === 'wellbeing_score')!;
      wbRow.intensity = 8;
      await comp.submit();
      expect(mockService.upsertDaySymptom).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'wellbeing_score', intensity: 8 }),
      );
      expect(mockService.add).not.toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'wellbeing_score' }),
      );
    });

    it('submit appelle add (pas upsertDaySymptom) pour les autres symptômes', async () => {
      const { fixture, mockService } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5; // abdominal_pain
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'abdominal_pain' }),
      );
      expect(mockService.upsertDaySymptom).not.toHaveBeenCalled();
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

  describe('gaz — flatulences et éructations (§1.4.2 Bloc A)', () => {
    it('hasAnyRating est vrai quand intensity > 0 pour gas', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'gas')!.intensity = 5;
      expect(comp.hasAnyRating).toBe(true);
    });

    it('hasAnyRating est faux si intensity = 0 pour les deux lignes gaz', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.hasAnyRating).toBe(false);
    });

    it('hasAnyRating est vrai quand intensity > 0 pour belching', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'belching')!.intensity = 3;
      expect(comp.hasAnyRating).toBe(true);
    });

    it('submit envoie l\'intensity pour flatulences', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'gas')!.intensity = 7;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'gas', intensity: 7 }),
      );
    });

    it('submit envoie l\'intensity pour éructations', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'belching')!.intensity = 4;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'belching', intensity: 4 }),
      );
    });

    it('submit n\'envoie pas de champ gas pour flatulences', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_GAS);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows.find(r => r.key === 'gas')!.intensity = 6;
      await comp.submit();
      const callArg = mockService.add.mock.calls[0][0] as { gas?: unknown };
      expect(callArg.gas).toBeUndefined();
    });
  });

  describe('douleurs articulaires — slider standard (§1.4.2 Bloc B)', () => {
    it('hasAnyRating est faux si intensity = 0', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_JOINT_PAIN);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.hasAnyRating).toBe(false);
    });

    it('hasAnyRating est vrai si intensity > 0', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_JOINT_PAIN);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 4;
      expect(comp.hasAnyRating).toBe(true);
    });

    it('submit envoie l\'intensity pour joint_pain', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_JOINT_PAIN);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 6;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'joint_pain', intensity: 6 }),
      );
    });

    it('submit n\'appelle pas add si intensity = 0', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_JOINT_PAIN);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      await comp.submit();
      expect(mockService.add).not.toHaveBeenCalled();
    });
  });

  describe('troubles du sommeil — heures dormies (§1.4.2 Bloc B)', () => {
    it('input sleep-hours est rendu pour sleep_quality', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_SLEEP);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('[data-testid="sleep-hours-sleep_quality"]');
      expect(input).not.toBeNull();
    });

    it('submit envoie sleepHours dans l\'entrée sleep_quality', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_SLEEP);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 7;
      comp.rows[0].sleepHours = 6.5;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'sleep_quality', sleepHours: 6.5 }),
      );
    });
  });

  describe('lourdeur post-repas — délai (§1.4.2 Bloc A)', () => {
    it('input délai est rendu quand intensity > 0', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_POSTMEAL);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('[data-testid="postmeal-delay-postmeal_heaviness"]');
      expect(input).not.toBeNull();
    });

    it('input délai est masqué quand intensity = 0', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_POSTMEAL);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('[data-testid="postmeal-delay-postmeal_heaviness"]');
      expect(input).toBeNull();
    });

    it('submit envoie le délai dans notes', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_POSTMEAL);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 5;
      comp.rows[0].postmealDelay = 1.5;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'postmeal_heaviness', notes: '1.5h après repas' }),
      );
    });

    it('submit sans délai renseigné n\'envoie pas notes', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_POSTMEAL);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 4;
      comp.rows[0].postmealDelay = null;
      await comp.submit();
      const callArg = mockService.add.mock.calls[0][0] as { notes?: string };
      expect(callArg.notes).toBeUndefined();
    });
  });

  describe('plénitude précoce — marqueur gastroparésie (§1.4.2 Bloc A)', () => {
    it('early_satiety apparaît dans les rows digestifs', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_EARLY_SATIETY);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.rows.some(r => r.key === 'early_satiety')).toBe(true);
      expect(comp.rows.find(r => r.key === 'early_satiety')?.category).toBe('digestive');
    });

    it('early_satiety utilise un slider standard (pas de mode gaz ni yesno)', async () => {
      const { fixture } = await createComponentWith(MOCK_WITH_EARLY_SATIETY);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const row = comp.rows.find(r => r.key === 'early_satiety')!;
      expect(row.hasGas).toBe(false);
      expect(row.hasYesNo).toBe(false);
      expect(row.hasBristol).toBe(false);
    });

    it('submit envoie intensity pour early_satiety', async () => {
      const { fixture, mockService } = await createComponentWith(MOCK_WITH_EARLY_SATIETY);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.rows[0].intensity = 6;
      await comp.submit();
      expect(mockService.add).toHaveBeenCalledWith(
        expect.objectContaining({ symptomKey: 'early_satiety', intensity: 6 }),
      );
    });
  });

  describe('note libre du jour — Bloc C (§1.4.2)', () => {
    it('le textarea wellbeing-note est rendu dans la section bien-être', async () => {
      const { fixture } = await createComponentWithWellbeing();
      fixture.detectChanges();
      const ta = fixture.nativeElement.querySelector('[data-testid="wellbeing-note"]');
      expect(ta).not.toBeNull();
    });

    it('submit attache la note à l\'entrée wellbeing_score via upsertDaySymptom', async () => {
      const { fixture, mockService } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as ComponentPrivate & { wellbeingNote: string };
      comp.rows.find(r => r.key === 'wellbeing_score')!.intensity = 8;
      comp.wellbeingNote = 'Bonne journée malgré les ballonnements';
      await comp.submit();
      expect(mockService.upsertDaySymptom).toHaveBeenCalledWith(
        expect.objectContaining({
          symptomKey: 'wellbeing_score',
          notes: 'Bonne journée malgré les ballonnements',
        }),
      );
    });

    it('submit n\'envoie pas notes si wellbeingNote est vide', async () => {
      const { fixture, mockService } = await createComponentWithWellbeing();
      const comp = fixture.componentInstance as unknown as ComponentPrivate & { wellbeingNote: string };
      comp.rows.find(r => r.key === 'wellbeing_score')!.intensity = 7;
      comp.wellbeingNote = '';
      await comp.submit();
      const callArg = mockService.upsertDaySymptom.mock.calls[0][0] as { notes?: string };
      expect(callArg.notes).toBeUndefined();
    });
  });
});
