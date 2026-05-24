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
  templateUrl: './run-analysis-dialog.component.html',
  styleUrl: './run-analysis-dialog.component.scss',
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
