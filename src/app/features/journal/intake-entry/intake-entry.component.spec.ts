import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { IntakeEntryComponent } from './intake-entry.component';
import { IntakeService } from '../services/intake.service';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { SheetResult } from './intake-detail-sheet.component';

const mockTreatment: TreatmentEntity = {
  id: 'treat-1',
  name: 'Rifaximine',
  category: 'antibiotic',
  mode: 'oral',
  dosage: '550',
  unit: 'mg',
  frequency: 3,
  reminder: { enabled: true, times: ['08:00', '12:00', '18:00'], soundEnabled: false },
  notes: '',
  active: true,
  startedAt: new Date('2026-05-01'),
  createdAt: new Date('2026-05-01'),
};

type ComponentPrivate = {
  treatmentStates: { treatment: TreatmentEntity; confirmed: boolean; skipped: boolean }[];
  onPointerDown(event: PointerEvent, state: unknown): void;
  onPointerUp(event: PointerEvent, state: unknown): void;
  onPointerCancel(): void;
  openDetail(state: unknown): void;
};

function makeFakePointerEvent(target = { setPointerCapture: vi.fn() }): PointerEvent {
  return { pointerId: 1, target } as unknown as PointerEvent;
}

function makeIntakeMock(treatments: TreatmentEntity[] = [mockTreatment]) {
  return {
    getActiveTreatments: vi.fn().mockResolvedValue(treatments),
    confirm: vi.fn().mockResolvedValue('intake-id'),
    edit: vi.fn().mockResolvedValue(undefined),
    getJournalDay: vi.fn().mockResolvedValue([]),
    getActiveCures: vi.fn().mockResolvedValue([]),
    getAllTreatments: vi.fn().mockResolvedValue([]),
    getSuggestions: vi.fn().mockResolvedValue([]),
  };
}

describe('IntakeEntryComponent', () => {
  let fixture: ComponentFixture<IntakeEntryComponent>;
  let mockIntake: ReturnType<typeof makeIntakeMock>;
  let mockAfterDismissed: { subscribe: ReturnType<typeof vi.fn> };
  let mockBottomSheet: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useRealTimers();
    mockIntake = makeIntakeMock();
    mockAfterDismissed = { subscribe: vi.fn() };
    mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => mockAfterDismissed }) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: mockIntake },
        { provide: MatBottomSheet, useValue: mockBottomSheet },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntakeEntryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('tap simple — confirmation rapide', () => {
    it('appelle IntakeService.confirm avec status taken après un tap court', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.treatmentStates).toHaveLength(1);

      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      comp.onPointerUp(event, state);

      await fixture.whenStable();

      expect(mockIntake.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ treatmentId: 'treat-1', status: 'taken' }),
      );
    });

    it('marque le traitement comme confirmé après un tap court', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      comp.onPointerUp(event, state);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(comp.treatmentStates[0].confirmed).toBe(true);
    });

    it('n\'appelle pas confirm si le traitement est déjà confirmé', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      state.confirmed = true;
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      comp.onPointerUp(event, state);

      await fixture.whenStable();

      expect(mockIntake.confirm).not.toHaveBeenCalled();
    });
  });

  describe('tap long — bottom sheet détail', () => {
    it('ouvre la bottom sheet après 500ms de pression', () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500);
      vi.useRealTimers();

      expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    });

    it('appelle confirm avec "taken" quand la sheet dismiss avec { action: "taken" }', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.openDetail(comp.treatmentStates[0]);

      const callback = mockAfterDismissed.subscribe.mock.calls[0][0] as (
        result: SheetResult | undefined,
      ) => void;
      callback({ action: 'taken' });
      await fixture.whenStable();

      expect(mockIntake.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ treatmentId: 'treat-1', status: 'taken' }),
      );
    });

    it('appelle confirm avec "skipped" et skipReason quand la sheet dismiss avec les données complètes', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.openDetail(comp.treatmentStates[0]);

      const callback = mockAfterDismissed.subscribe.mock.calls[0][0] as (
        result: SheetResult | undefined,
      ) => void;
      callback({ action: 'skipped', skipReason: 'forgot', notes: 'Oubli matinal' });
      await fixture.whenStable();

      expect(mockIntake.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ treatmentId: 'treat-1', status: 'skipped', skipReason: 'forgot', notes: 'Oubli matinal' }),
      );
    });

    it('n\'appelle pas confirm si le pointerup survient après le long press', () => {
      vi.useFakeTimers();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500);
      comp.onPointerUp(event, state);
      vi.useRealTimers();

      expect(mockIntake.confirm).not.toHaveBeenCalled();
    });

    it('n\'ouvre pas la bottom sheet avant 500ms', () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(499);
      vi.useRealTimers();

      expect(mockBottomSheet.open).not.toHaveBeenCalled();
    });
  });

  describe('affichage des cartes', () => {
    it('affiche une carte par traitement', async () => {
      const cards = fixture.debugElement.queryAll(By.css('.treatment-card'));
      expect(cards).toHaveLength(1);
    });

    it('affiche le bouton data-testid="done-intake"', () => {
      const btn = fixture.debugElement.query(By.css('[data-testid="done-intake"]'));
      expect(btn).not.toBeNull();
    });
  });

  describe('prise ponctuelle — médicament hors traitement', () => {
    type AdHocPrivate = {
      adHocName: string;
      adHocDose: string;
      adHocTime: string;
      adHocAdded: { id: string; name: string; dose: string; time: string }[];
      addAdHoc(): Promise<void>;
    };

    it('affiche le formulaire de prise ponctuelle', () => {
      const form = fixture.debugElement.query(By.css('[data-testid="adhoc-form"]'));
      expect(form).not.toBeNull();
    });

    it('appelle confirm avec medicationName et sans treatmentId', async () => {
      const comp = fixture.componentInstance as unknown as AdHocPrivate;
      comp.adHocName = 'Spasfon';
      comp.adHocDose = '2 cp';
      comp.adHocTime = '14:30';

      await comp.addAdHoc();

      expect(mockIntake.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ medicationName: 'Spasfon', actualDose: '2 cp', status: 'taken' }),
      );
      const arg = mockIntake.confirm.mock.calls[0][0] as { treatmentId?: string; confirmedAt: Date };
      expect(arg.treatmentId).toBeUndefined();
      expect(arg.confirmedAt.getHours()).toBe(14);
      expect(arg.confirmedAt.getMinutes()).toBe(30);
    });

    it('ajoute la prise à la liste et réinitialise le champ nom', async () => {
      const comp = fixture.componentInstance as unknown as AdHocPrivate;
      comp.adHocName = 'Doliprane';
      await comp.addAdHoc();

      expect(comp.adHocAdded).toHaveLength(1);
      expect(comp.adHocAdded[0].name).toBe('Doliprane');
      expect(comp.adHocName).toBe('');
    });

    it('n\'appelle pas confirm si le nom est vide', async () => {
      const comp = fixture.componentInstance as unknown as AdHocPrivate;
      comp.adHocName = '   ';
      await comp.addAdHoc();
      expect(mockIntake.confirm).not.toHaveBeenCalled();
    });
  });
});

describe('IntakeEntryComponent — date du journal', () => {
  let fixture: ComponentFixture<IntakeEntryComponent>;
  let mockIntake: ReturnType<typeof makeIntakeMock>;

  function yesterday(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  beforeEach(async () => {
    vi.useRealTimers();
    history.replaceState({ journalDate: yesterday().toISOString() }, '');
    mockIntake = makeIntakeMock();
    const mockAfterDismissed = { subscribe: vi.fn() };
    const mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => mockAfterDismissed }) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: mockIntake },
        { provide: MatBottomSheet, useValue: mockBottomSheet },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntakeEntryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState({}, '');
  });

  it('confirmedAt a le bon jour quand journalDate = hier (tap court)', async () => {
    const ref = yesterday();
    const comp = fixture.componentInstance as unknown as ComponentPrivate;
    const state = comp.treatmentStates[0];
    const event = makeFakePointerEvent();
    comp.onPointerDown(event, state);
    comp.onPointerUp(event, state);
    await fixture.whenStable();
    const callArg = mockIntake.confirm.mock.calls[0][0] as { confirmedAt: Date };
    expect(callArg.confirmedAt.getFullYear()).toBe(ref.getFullYear());
    expect(callArg.confirmedAt.getMonth()).toBe(ref.getMonth());
    expect(callArg.confirmedAt.getDate()).toBe(ref.getDate());
  });

  it('scheduledAt a le bon jour quand journalDate = hier (tap court)', async () => {
    const ref = yesterday();
    const comp = fixture.componentInstance as unknown as ComponentPrivate;
    const state = comp.treatmentStates[0];
    const event = makeFakePointerEvent();
    comp.onPointerDown(event, state);
    comp.onPointerUp(event, state);
    await fixture.whenStable();
    const callArg = mockIntake.confirm.mock.calls[0][0] as { scheduledAt: Date };
    expect(callArg.scheduledAt.getFullYear()).toBe(ref.getFullYear());
    expect(callArg.scheduledAt.getMonth()).toBe(ref.getMonth());
    expect(callArg.scheduledAt.getDate()).toBe(ref.getDate());
  });

  it('isRetrospective est vrai quand journalDate est antérieure à aujourd\'hui', () => {
    const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
    expect(comp.isRetrospective).toBe(true);
  });

  it('affiche data-testid="retrospective-banner" quand journalDate est antérieure', () => {
    fixture.detectChanges();
    const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
    expect(banner).not.toBeNull();
  });

  it('back() navigue vers /journal en conservant journalDate dans le state', async () => {
    const ref = yesterday();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    (fixture.componentInstance as unknown as { back(): void }).back();

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/journal'],
      expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
    );
  });
});

describe('IntakeEntryComponent — mode édition (depuis le journal)', () => {
  function setHistory(editEntry: unknown): void {
    history.replaceState({ editEntry, journalDate: new Date().toISOString() }, '');
  }

  async function setup(mockIntake: ReturnType<typeof makeIntakeMock>) {
    const mockAfterDismissed = { subscribe: vi.fn() };
    const mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => mockAfterDismissed }) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: mockIntake },
        { provide: MatBottomSheet, useValue: mockBottomSheet },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IntakeEntryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, mockBottomSheet };
  }

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState({}, '');
  });

  it('prise rattachée à un traitement : n\'affiche que ce traitement et ouvre la feuille de détail', async () => {
    setHistory({ id: 'intake-1', treatmentId: 'treat-1', scheduledAt: new Date(), confirmedAt: new Date(), createdAt: new Date(), status: 'taken' });
    const mockIntake = makeIntakeMock([]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment]);
    const { fixture, mockBottomSheet } = await setup(mockIntake);

    const cards = fixture.debugElement.queryAll(By.css('.treatment-card'));
    expect(cards).toHaveLength(1);
    expect(cards[0].nativeElement.getAttribute('data-testid')).toBe('treatment-treat-1');
    expect(mockBottomSheet.open).toHaveBeenCalledOnce();
  });

  it('n\'affiche ni le formulaire ponctuel ni le bouton Terminer en édition d\'un traitement', async () => {
    setHistory({ id: 'intake-1', treatmentId: 'treat-1', scheduledAt: new Date(), confirmedAt: new Date(), createdAt: new Date(), status: 'taken' });
    const mockIntake = makeIntakeMock([]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment]);
    const { fixture } = await setup(mockIntake);

    expect(fixture.debugElement.query(By.css('[data-testid="adhoc-form"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="done-intake"]'))).toBeNull();
  });

  it('ne charge pas la liste complète des traitements actifs en édition', async () => {
    setHistory({ id: 'intake-1', treatmentId: 'treat-1', scheduledAt: new Date(), confirmedAt: new Date(), createdAt: new Date(), status: 'taken' });
    const mockIntake = makeIntakeMock([mockTreatment]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment]);
    await setup(mockIntake);

    expect(mockIntake.getActiveTreatments).not.toHaveBeenCalled();
  });

  it('prise ponctuelle : affiche uniquement le formulaire pré-rempli, aucun traitement', async () => {
    setHistory({ id: 'adhoc-1', medicationName: 'Spasfon', actualDose: '2 cp', scheduledAt: new Date(), confirmedAt: new Date(), createdAt: new Date(), status: 'taken' });
    const mockIntake = makeIntakeMock([mockTreatment]);
    const { fixture, mockBottomSheet } = await setup(mockIntake);

    expect(fixture.debugElement.queryAll(By.css('.treatment-card'))).toHaveLength(0);
    const form = fixture.debugElement.query(By.css('[data-testid="adhoc-form"]'));
    expect(form).not.toBeNull();
    const nameInput = fixture.debugElement.query(By.css('[data-testid="adhoc-name"]')).nativeElement as HTMLInputElement;
    expect(nameInput.value).toBe('Spasfon');
    expect(mockBottomSheet.open).not.toHaveBeenCalled();
  });
});

describe('IntakeEntryComponent — mode édition de groupe (depuis le journal)', () => {
  const t = new Date('2026-06-13T08:00:00');

  function makeEntry(id: string, treatmentId: string) {
    return { id, treatmentId, scheduledAt: t, confirmedAt: t, createdAt: t, status: 'taken' };
  }

  function setHistory(editEntries: unknown[]): void {
    history.replaceState({ editEntries, journalDate: new Date().toISOString() }, '');
  }

  async function setup(mockIntake: ReturnType<typeof makeIntakeMock>) {
    const subscribe = vi.fn();
    const mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => ({ subscribe }) }) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: IntakeService, useValue: mockIntake },
        { provide: MatBottomSheet, useValue: mockBottomSheet },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(IntakeEntryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, mockBottomSheet, subscribe };
  }

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState({}, '');
  });

  it('ouvre une feuille de modification par prise du groupe et persiste chacune via edit', async () => {
    const treat2: TreatmentEntity = { ...mockTreatment, id: 'treat-2', name: 'Iberogast' };
    setHistory([makeEntry('i1', 'treat-1'), makeEntry('i2', 'treat-2')]);
    const mockIntake = makeIntakeMock([]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment, treat2]);
    const { fixture, mockBottomSheet, subscribe } = await setup(mockIntake);

    // 1re prise : la feuille est ouverte, on confirme
    expect(mockBottomSheet.open).toHaveBeenCalledTimes(1);
    const cb1 = subscribe.mock.calls[0][0] as (r: SheetResult | undefined) => void;
    cb1({ action: 'taken' });
    await fixture.whenStable();
    expect(mockIntake.edit).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1', status: 'taken' }));

    // 2e prise : la feuille suivante s'ouvre automatiquement, on saute
    expect(mockBottomSheet.open).toHaveBeenCalledTimes(2);
    const cb2 = subscribe.mock.calls[1][0] as (r: SheetResult | undefined) => void;
    cb2({ action: 'skipped', skipReason: 'forgot' });
    await fixture.whenStable();
    expect(mockIntake.edit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i2', status: 'skipped', skipReason: 'forgot' }),
    );
  });

  it('revient au journal après la dernière prise du groupe', async () => {
    setHistory([makeEntry('i1', 'treat-1')]);
    const mockIntake = makeIntakeMock([]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment]);
    const { fixture, subscribe } = await setup(mockIntake);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const cb = subscribe.mock.calls[0][0] as (r: SheetResult | undefined) => void;
    cb({ action: 'taken' });
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/journal'], expect.anything());
  });

  it('n\'affiche ni le formulaire ponctuel ni le bouton Terminer en édition de groupe', async () => {
    setHistory([makeEntry('i1', 'treat-1'), makeEntry('i2', 'treat-2')]);
    const mockIntake = makeIntakeMock([]);
    mockIntake.getAllTreatments.mockResolvedValue([mockTreatment]);
    const { fixture } = await setup(mockIntake);

    expect(fixture.debugElement.query(By.css('[data-testid="adhoc-form"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="done-intake"]'))).toBeNull();
  });
});
