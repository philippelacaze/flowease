import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { GetActiveTreatmentsUseCase } from '../../../../application/journal/get-active-treatments.usecase';
import { ConfirmIntakeUseCase } from '../../../../application/journal/confirm-intake.usecase';
import { IntakeDetailSheetComponent } from './intake-detail-sheet.component';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';
import type { IntakeStatus } from '../../../../domain/entities/intake.entity';

interface TreatmentState {
  readonly treatment: TreatmentEntity;
  confirmed: boolean;
  skipped: boolean;
}

/**
 * Page de saisie des prises de traitement.
 *
 * @remarks
 * Tap simple = confirmation rapide (status 'taken').
 * Tap long (>500ms) = ouverture d'un MatBottomSheet (IntakeDetailSheetComponent).
 * Importe uniquement GetActiveTreatmentsUseCase et ConfirmIntakeUseCase.
 */
@Component({
  selector: 'app-intake-entry',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intake-entry.component.html',
  styleUrl: './intake-entry.component.scss',
})
export class IntakeEntryComponent implements OnInit, OnDestroy {
  private readonly getActiveTreatments = inject(GetActiveTreatmentsUseCase);
  private readonly confirmIntake = inject(ConfirmIntakeUseCase);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected treatmentStates: TreatmentState[] = [];
  protected loading = true;

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private didLongPress = false;

  protected get confirmedCount(): number {
    return this.treatmentStates.filter(s => s.confirmed || s.skipped).length;
  }

  ngOnInit(): void {
    void this.loadTreatments();
  }

  ngOnDestroy(): void {
    this.clearLongPressTimer();
  }

  protected onPointerDown(event: PointerEvent, state: TreatmentState): void {
    (event.target as Element).setPointerCapture(event.pointerId);
    this.didLongPress = false;
    this.longPressTimer = setTimeout(() => {
      this.didLongPress = true;
      this.openDetail(state);
    }, 500);
  }

  protected onPointerUp(event: PointerEvent, state: TreatmentState): void {
    this.clearLongPressTimer();
    if (!this.didLongPress) {
      void this.quickConfirm(state);
    }
  }

  protected onPointerCancel(): void {
    this.clearLongPressTimer();
  }

  protected onKeyActivate(event: Event, state: TreatmentState): void {
    event.preventDefault();
    void this.quickConfirm(state);
  }

  protected openDetail(state: TreatmentState): void {
    const ref = this.bottomSheet.open(IntakeDetailSheetComponent, { data: state });
    ref.afterDismissed().subscribe((action: 'taken' | 'skipped' | undefined) => {
      if (action) void this.confirmFromDetail(state, action);
      this.cdr.markForCheck();
    });
  }

  protected cardBg(state: TreatmentState): string {
    if (state.confirmed) return 'var(--fodmap-low-bg)';
    if (state.skipped) return 'var(--fodmap-high-bg)';
    return 'var(--card-bg)';
  }

  protected cardBorder(state: TreatmentState): string {
    if (state.confirmed) return 'var(--fodmap-low-border)';
    if (state.skipped) return 'var(--fodmap-high-border)';
    return 'var(--border)';
  }

  protected treatmentStatus(state: TreatmentState): string {
    if (state.confirmed) return 'pris';
    if (state.skipped) return 'sauté';
    return 'non confirmé';
  }

  protected goToSettings(): void {
    void this.router.navigate(['/settings', 'treatments']).catch(() => undefined);
  }

  protected back(): void {
    void this.router.navigate(['/journal']).catch(() => undefined);
  }

  private async quickConfirm(state: TreatmentState): Promise<void> {
    if (state.confirmed || state.skipped) return;

    await this.confirmIntake.execute({
      treatmentId: state.treatment.id,
      scheduledAt: new Date(),
      confirmedAt: new Date(),
      status: 'taken',
    });

    state.confirmed = true;
    this.cdr.markForCheck();
  }

  private async confirmFromDetail(state: TreatmentState, action: IntakeStatus): Promise<void> {
    await this.confirmIntake.execute({
      treatmentId: state.treatment.id,
      scheduledAt: new Date(),
      confirmedAt: new Date(),
      status: action,
    });

    state.confirmed = action === 'taken';
    state.skipped = action === 'skipped';
    this.cdr.markForCheck();
  }

  private async loadTreatments(): Promise<void> {
    const treatments = await this.getActiveTreatments.execute();
    this.treatmentStates = treatments.map(t => ({
      treatment: t,
      confirmed: false,
      skipped: false,
    }));
    this.loading = false;
    this.cdr.markForCheck();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
