import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GetActiveTreatmentsUseCase } from '../../../../application/journal/get-active-treatments.usecase';
import { ConfirmIntakeUseCase } from '../../../../application/journal/confirm-intake.usecase';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';
import type { IntakeStatus, SkipReason } from '../../../../domain/entities/intake.entity';

interface TreatmentState {
  treatment: TreatmentEntity;
  confirmed: boolean;
  skipped: boolean;
}

/**
 * Page de saisie des prises de traitement.
 *
 * @remarks
 * Tap simple = confirmation rapide (status 'taken').
 * Tap long (>500ms) = ouverture du panneau détail (heure, dose, note, raison de saut).
 * Importe uniquement GetActiveTreatmentsUseCase et ConfirmIntakeUseCase.
 */
@Component({
  selector: 'app-intake-entry',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intake-entry.component.html',
  styleUrl: './intake-entry.component.scss',
})
export class IntakeEntryComponent implements OnInit, OnDestroy {
  private readonly getActiveTreatments = inject(GetActiveTreatmentsUseCase);
  private readonly confirmIntake = inject(ConfirmIntakeUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected treatmentStates: TreatmentState[] = [];
  protected detailState: TreatmentState | null = null;
  protected loading = true;

  protected detailTime = this.nowTime();
  protected detailDose = '';
  protected detailNotes = '';
  protected detailSkipReason: SkipReason | '' = '';

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

  protected openDetail(state: TreatmentState): void {
    this.detailState = state;
    this.detailTime = this.nowTime();
    this.detailDose = '';
    this.detailNotes = '';
    this.detailSkipReason = '';
    this.cdr.markForCheck();
  }

  protected closeDetail(): void {
    this.detailState = null;
    this.cdr.markForCheck();
  }

  protected async confirmFromDetail(status: IntakeStatus): Promise<void> {
    if (!this.detailState) return;
    const state = this.detailState;

    const [hours, minutes] = this.detailTime.split(':').map(Number);
    const confirmedAt = new Date();
    confirmedAt.setHours(hours, minutes, 0, 0);

    await this.confirmIntake.execute({
      treatmentId: state.treatment.id,
      scheduledAt: new Date(),
      confirmedAt,
      status,
      ...(this.detailSkipReason && { skipReason: this.detailSkipReason as SkipReason }),
      ...(this.detailDose.trim() && { actualDose: this.detailDose.trim() }),
      ...(this.detailNotes.trim() && { notes: this.detailNotes.trim() }),
    });

    state.confirmed = status === 'taken';
    state.skipped = status === 'skipped';
    this.closeDetail();
  }

  protected treatmentStatus(state: TreatmentState): string {
    if (state.confirmed) return 'pris';
    if (state.skipped) return 'sauté';
    return 'non confirmé';
  }

  protected goToSettings(): void {
    void this.router.navigate(['/settings', 'treatments']);
  }

  protected back(): void {
    void this.router.navigate(['/journal']);
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

  private nowTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}
