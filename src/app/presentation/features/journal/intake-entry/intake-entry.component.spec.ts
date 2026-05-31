import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { IntakeEntryComponent } from './intake-entry.component';
import { GetActiveTreatmentsUseCase } from '../../../../application/journal/get-active-treatments.usecase';
import { ConfirmIntakeUseCase } from '../../../../application/journal/confirm-intake.usecase';
import { EditIntakeUseCase } from '../../../../application/journal/edit-intake.usecase';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';
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

describe('IntakeEntryComponent', () => {
  let fixture: ComponentFixture<IntakeEntryComponent>;
  let mockConfirmIntake: { execute: ReturnType<typeof vi.fn> };
  let mockGetActiveTreatments: { execute: ReturnType<typeof vi.fn> };
  let mockAfterDismissed: { subscribe: ReturnType<typeof vi.fn> };
  let mockBottomSheet: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useRealTimers();
    mockConfirmIntake = { execute: vi.fn().mockResolvedValue('intake-id') };
    mockGetActiveTreatments = { execute: vi.fn().mockResolvedValue([mockTreatment]) };
    mockAfterDismissed = { subscribe: vi.fn() };
    mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => mockAfterDismissed }) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ConfirmIntakeUseCase, useValue: mockConfirmIntake },
        { provide: EditIntakeUseCase, useValue: { execute: vi.fn().mockResolvedValue(undefined) } },
        { provide: GetActiveTreatmentsUseCase, useValue: mockGetActiveTreatments },
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
    it('appelle ConfirmIntakeUseCase avec status taken après un tap court', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.treatmentStates).toHaveLength(1);

      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      comp.onPointerUp(event, state);

      await fixture.whenStable();

      expect(mockConfirmIntake.execute).toHaveBeenCalledWith(
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

    it('n\'appelle pas ConfirmIntakeUseCase si le traitement est déjà confirmé', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      state.confirmed = true;
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      comp.onPointerUp(event, state);

      await fixture.whenStable();

      expect(mockConfirmIntake.execute).not.toHaveBeenCalled();
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

    it('appelle ConfirmIntakeUseCase avec "taken" quand la sheet dismiss avec { action: "taken" }', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.openDetail(comp.treatmentStates[0]);

      const callback = mockAfterDismissed.subscribe.mock.calls[0][0] as (
        result: SheetResult | undefined,
      ) => void;
      callback({ action: 'taken' });
      await fixture.whenStable();

      expect(mockConfirmIntake.execute).toHaveBeenCalledWith(
        expect.objectContaining({ treatmentId: 'treat-1', status: 'taken' }),
      );
    });

    it('appelle ConfirmIntakeUseCase avec "skipped" et skipReason quand la sheet dismiss avec les données complètes', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.openDetail(comp.treatmentStates[0]);

      const callback = mockAfterDismissed.subscribe.mock.calls[0][0] as (
        result: SheetResult | undefined,
      ) => void;
      callback({ action: 'skipped', skipReason: 'forgot', notes: 'Oubli matinal' });
      await fixture.whenStable();

      expect(mockConfirmIntake.execute).toHaveBeenCalledWith(
        expect.objectContaining({ treatmentId: 'treat-1', status: 'skipped', skipReason: 'forgot', notes: 'Oubli matinal' }),
      );
    });

    it('n\'appelle pas ConfirmIntakeUseCase si le pointerup survient après le long press', () => {
      vi.useFakeTimers();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500);
      comp.onPointerUp(event, state);
      vi.useRealTimers();

      expect(mockConfirmIntake.execute).not.toHaveBeenCalled();
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
