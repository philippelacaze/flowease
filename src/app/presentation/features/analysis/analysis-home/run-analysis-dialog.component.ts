import { Component, Inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface RunAnalysisDialogData {
  readonly defaultWindow: number;
}

/**
 * Dialogue de confirmation avant le lancement d'une analyse IA.
 *
 * @remarks
 * Respecte SRP : collecte les paramètres et délègue l'exécution à AnalysisHomeComponent.
 * Affiche une estimation de consommation tokens pour orienter le choix utilisateur.
 * Retourne le nombre de jours sélectionné, ou undefined si annulé.
 */
@Component({
  selector: 'app-run-analysis-dialog',
  standalone: true,
  imports: [
    NgFor,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Lancer une analyse IA</h2>

    <mat-dialog-content>
      <p class="hint">
        Claude analysera vos données pour identifier corrélations et patterns de santé.
      </p>

      <mat-form-field appearance="outline" class="window-field">
        <mat-label>Fenêtre d'analyse</mat-label>
        <mat-select
          [(ngModel)]="selectedWindow"
          aria-label="Fenêtre d'analyse en jours"
          data-testid="analysis-window-select"
        >
          <mat-option *ngFor="let opt of windowOptions" [value]="opt.days">
            {{ opt.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <p class="token-hint">
        <span class="token-label">Estimation&nbsp;:</span>
        {{ currentOption?.estimate }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button
        mat-button
        (click)="cancel()"
        aria-label="Annuler l'analyse"
      >
        Annuler
      </button>
      <button
        mat-flat-button
        color="primary"
        (click)="confirm()"
        aria-label="Confirmer et lancer l'analyse"
        data-testid="confirm-run-analysis"
      >
        Analyser
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .hint {
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 20px;
    }
    .window-field { width: 100%; }
    .token-hint {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: 4px 0 0;
    }
    .token-label { font-weight: 500; }
  `],
})
export class RunAnalysisDialogComponent {
  protected selectedWindow: number;

  protected readonly windowOptions = [
    { days: 7,  label: '7 jours',  estimate: '~500 tokens' },
    { days: 14, label: '14 jours', estimate: '~1 000 tokens' },
    { days: 30, label: '30 jours', estimate: '~2 500 tokens' },
    { days: 90, label: '90 jours', estimate: '~7 000 tokens' },
  ] as const;

  protected get currentOption() {
    return this.windowOptions.find(o => o.days === this.selectedWindow);
  }

  constructor(
    private readonly dialogRef: MatDialogRef<RunAnalysisDialogComponent, number | undefined>,
    @Inject(MAT_DIALOG_DATA) data: RunAnalysisDialogData,
  ) {
    this.selectedWindow = data.defaultWindow ?? 14;
  }

  protected confirm(): void {
    this.dialogRef.close(this.selectedWindow);
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
