import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IntakeEntryComponent } from './intake-entry.component';
import { GetActiveTreatmentsUseCase } from '../../../../application/journal/get-active-treatments.usecase';
import { ConfirmIntakeUseCase } from '../../../../application/journal/confirm-intake.usecase';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';

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
  detailState: { treatment: TreatmentEntity; confirmed: boolean; skipped: boolean } | null;
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

  beforeEach(async () => {
    vi.useRealTimers();
    mockConfirmIntake = { execute: vi.fn().mockResolvedValue('intake-id') };
    mockGetActiveTreatments = { execute: vi.fn().mockResolvedValue([mockTreatment]) };

    await TestBed.configureTestingModule({
      imports: [IntakeEntryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ConfirmIntakeUseCase, useValue: mockConfirmIntake },
        { provide: GetActiveTreatmentsUseCase, useValue: mockGetActiveTreatments },
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
      comp.onPointerUp(event, state); // avant 500ms → tap court

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

  describe('tap long — panneau détail', () => {
    it('ouvre le panneau détail après 500ms de pression', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(comp.detailState).not.toBeNull();
      expect(comp.detailState!.treatment.id).toBe('treat-1');
    });

    it('le panneau détail est visible dans le DOM après le long press', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      const panel = fixture.debugElement.query(By.css('.detail-panel'));
      expect(panel).not.toBeNull();
    });

    it('n\'appelle pas ConfirmIntakeUseCase si le pointerup survient après le long press', () => {
      vi.useFakeTimers();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];
      const event = makeFakePointerEvent();

      comp.onPointerDown(event, state);
      vi.advanceTimersByTime(500); // long press déclenché → didLongPress = true
      comp.onPointerUp(event, state); // ignoré car didLongPress = true
      vi.useRealTimers();

      // didLongPress = true → quickConfirm n'est pas appelé → execute jamais déclenché
      expect(mockConfirmIntake.execute).not.toHaveBeenCalled();
    });

    it('le panneau détail contient les boutons Pris et Sauté', () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const state = comp.treatmentStates[0];

      comp.openDetail(state);
      fixture.detectChanges();

      const taken = fixture.debugElement.query(By.css('[data-testid="confirm-taken"]'));
      const skipped = fixture.debugElement.query(By.css('[data-testid="confirm-skipped"]'));
      expect(taken).not.toBeNull();
      expect(skipped).not.toBeNull();
    });
  });
});
