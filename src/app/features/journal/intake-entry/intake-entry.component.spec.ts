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
