import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
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
    NgFor, NgIf, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="intake-entry">
      <header class="page-header">
        <button mat-icon-button aria-label="Retour au journal" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="page-title">Saisir des prises</h1>
      </header>

      <div *ngIf="loading" class="loading" role="status" aria-live="polite">
        Chargement des traitements…
      </div>

      <div *ngIf="!loading && treatmentStates.length === 0" class="empty-state" role="status">
        <mat-icon aria-hidden="true" class="empty-icon">medication</mat-icon>
        <p>Aucun traitement actif.</p>
        <p class="empty-hint">Configurez vos traitements dans les Paramètres.</p>
        <button
          mat-stroked-button
          aria-label="Aller aux paramètres des traitements"
          (click)="goToSettings()"
        >
          Configurer les traitements
        </button>
      </div>

      <div *ngIf="!loading && treatmentStates.length > 0" class="treatment-list">
        <p class="list-hint" role="status">
          Appui court = pris · Appui long = détail
        </p>

        <div
          *ngFor="let state of treatmentStates"
          class="treatment-card"
          [class.treatment-card--taken]="state.confirmed"
          [class.treatment-card--skipped]="state.skipped"
          [attr.data-testid]="'treatment-' + state.treatment.id"
          role="button"
          [attr.aria-label]="state.treatment.name + ' — ' + treatmentStatus(state)"
          [attr.aria-pressed]="state.confirmed"
          (pointerdown)="onPointerDown($event, state)"
          (pointerup)="onPointerUp($event, state)"
          (pointercancel)="onPointerCancel()"
          (contextmenu)="$event.preventDefault()"
        >
          <div class="treatment-info">
            <span class="treatment-name">{{ state.treatment.name }}</span>
            <span class="treatment-dose">{{ state.treatment.dosage }} {{ state.treatment.unit }}</span>
          </div>
          <div class="treatment-status">
            <mat-icon
              aria-hidden="true"
              class="status-icon"
              [class.status-icon--taken]="state.confirmed"
              [class.status-icon--skipped]="state.skipped"
            >
              {{ state.confirmed ? 'check_circle' : state.skipped ? 'cancel' : 'radio_button_unchecked' }}
            </mat-icon>
          </div>
        </div>

        <!-- Panneau détail (long press) -->
        <div
          *ngIf="detailState"
          class="detail-panel"
          role="dialog"
          [attr.aria-label]="'Détail de la prise — ' + detailState.treatment.name"
        >
          <div class="detail-header">
            <h2 class="detail-title">{{ detailState.treatment.name }}</h2>
            <button mat-icon-button aria-label="Fermer le panneau détail" (click)="closeDetail()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="detail-form">
            <mat-form-field appearance="outline" class="detail-field">
              <mat-label>Heure de prise</mat-label>
              <input
                matInput
                type="time"
                [(ngModel)]="detailTime"
                aria-label="Heure effective de la prise"
                data-testid="detail-time"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="detail-field">
              <mat-label>Dose réelle (optionnel)</mat-label>
              <input
                matInput
                [(ngModel)]="detailDose"
                [placeholder]="detailState.treatment.dosage + ' ' + detailState.treatment.unit"
                aria-label="Dose réelle prise"
                data-testid="detail-dose"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="detail-field">
              <mat-label>Note (optionnel)</mat-label>
              <textarea
                matInput
                [(ngModel)]="detailNotes"
                rows="2"
                aria-label="Note sur la prise"
                data-testid="detail-notes"
              ></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="detail-field">
              <mat-label>Raison de saut (si non pris)</mat-label>
              <mat-select [(ngModel)]="detailSkipReason" aria-label="Raison de saut">
                <mat-option value="">— Aucune —</mat-option>
                <mat-option value="forgot">Oublié</mat-option>
                <mat-option value="side_effects">Effets secondaires</mat-option>
                <mat-option value="unavailable">Non disponible</mat-option>
                <mat-option value="other">Autre</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="detail-actions">
            <button
              mat-raised-button
              color="primary"
              class="detail-btn"
              aria-label="Confirmer la prise"
              data-testid="confirm-taken"
              (click)="confirmFromDetail('taken')"
            >
              <mat-icon aria-hidden="true">check_circle</mat-icon>
              Pris
            </button>
            <button
              mat-stroked-button
              class="detail-btn"
              aria-label="Marquer comme sauté"
              data-testid="confirm-skipped"
              (click)="confirmFromDetail('skipped')"
            >
              <mat-icon aria-hidden="true">cancel</mat-icon>
              Sauté
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && treatmentStates.length > 0" class="submit-row">
        <p class="confirmed-count" role="status" aria-live="polite">
          {{ confirmedCount }} traitement(s) confirmé(s) sur {{ treatmentStates.length }}
        </p>
        <button
          mat-raised-button
          color="primary"
          class="submit-btn"
          [disabled]="confirmedCount === 0"
          aria-label="Retourner au journal"
          data-testid="done-intake"
          (click)="back()"
        >
          <mat-icon aria-hidden="true">check</mat-icon>
          Terminer
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .page-title { margin: 0; font-size: 18px; font-weight: 500; }

    .loading {
      text-align: center;
      padding: 32px;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      gap: 12px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; }
    .empty-hint { font-size: 13px; opacity: 0.7; margin: 0; }

    .treatment-list { padding: 8px 16px; }

    .list-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
      text-align: center;
    }

    .treatment-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      margin-bottom: 8px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
      min-height: 64px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s, background 0.15s;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    .treatment-card:active { background: var(--mat-sys-surface-container-high); }
    .treatment-card--taken  { border-color: #81c784; background: #f1f8e9; }
    .treatment-card--skipped { border-color: var(--mat-sys-error); background: var(--mat-sys-error-container); }

    .treatment-info { display: flex; flex-direction: column; gap: 2px; }
    .treatment-name { font-size: 16px; font-weight: 500; }
    .treatment-dose { font-size: 13px; color: var(--mat-sys-on-surface-variant); }

    .status-icon          { font-size: 28px; width: 28px; height: 28px; color: var(--mat-sys-outline-variant); }
    .status-icon--taken   { color: #2e7d32; }
    .status-icon--skipped { color: var(--mat-sys-error); }

    /* Detail panel */
    .detail-panel {
      margin-top: 16px;
      padding: 16px;
      background: var(--mat-sys-surface-container-highest);
      border-radius: 16px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .detail-title { margin: 0; font-size: 16px; font-weight: 600; }

    .detail-form { display: flex; flex-direction: column; gap: 4px; }
    .detail-field { width: 100%; }

    .detail-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    .detail-btn { width: 100%; }

    .submit-row {
      padding: 12px 16px 24px;
      background: var(--mat-sys-surface);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .confirmed-count {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
      margin: 0 0 8px;
    }
    .submit-btn { width: 100%; }
  `],
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
