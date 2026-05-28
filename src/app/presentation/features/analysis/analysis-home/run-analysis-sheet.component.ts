import { Component } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

/**
 * Sheet de sélection de la fenêtre d'analyse IA.
 *
 * @remarks
 * Respecte SRP : collecte uniquement le paramètre "nb de jours" et
 * délègue l'exécution à AnalysisHomeComponent via dismiss().
 * Remplace RunAnalysisDialogComponent (MatDialog → MatBottomSheet).
 *
 * @returns number (jours sélectionnés) ou undefined si annulé
 */
@Component({
  selector: 'app-run-analysis-sheet',
  standalone: true,
  imports: [],
  templateUrl: './run-analysis-sheet.component.html',
  styleUrl: './run-analysis-sheet.component.scss',
})
export class RunAnalysisSheetComponent {
  protected readonly options = [
    { days: 7,  label: '7 jours',  est: '~500 tokens' },
    { days: 14, label: '14 jours', est: '~1 000 tokens' },
    { days: 30, label: '30 jours', est: '~2 500 tokens' },
    { days: 90, label: '90 jours', est: '~7 000 tokens' },
  ] as const;

  constructor(
    private readonly sheetRef: MatBottomSheetRef<RunAnalysisSheetComponent, number | undefined>,
  ) {}

  protected select(days: number): void {
    this.sheetRef.dismiss(days);
  }
}
