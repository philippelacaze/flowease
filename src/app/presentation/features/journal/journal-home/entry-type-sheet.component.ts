import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

/**
 * Contenu du bottom sheet pour choisir le type d'entrée à créer.
 *
 * @remarks
 * Composant autonome ouvert par JournalHomeComponent via MatBottomSheet.
 * Principe SRP : délègue la navigation à Router et se ferme immédiatement.
 */
@Component({
  selector: 'app-entry-type-sheet',
  standalone: true,
  imports: [MatListModule, MatIconModule],
  template: `
    <mat-nav-list aria-label="Choisir le type d'entrée à créer">
      <a mat-list-item (click)="navigate('meal')" data-testid="sheet-meal">
        <mat-icon matListItemIcon aria-hidden="true">restaurant</mat-icon>
        <span matListItemTitle>Repas</span>
      </a>
      <a mat-list-item (click)="navigate('symptom')" data-testid="sheet-symptom">
        <mat-icon matListItemIcon aria-hidden="true">health_and_safety</mat-icon>
        <span matListItemTitle>Symptômes</span>
      </a>
      <a mat-list-item (click)="navigate('intake')" data-testid="sheet-intake">
        <mat-icon matListItemIcon aria-hidden="true">medication</mat-icon>
        <span matListItemTitle>Prises</span>
      </a>
      <a mat-list-item (click)="navigate('note')" data-testid="sheet-note">
        <mat-icon matListItemIcon aria-hidden="true">edit_note</mat-icon>
        <span matListItemTitle>Note</span>
      </a>
    </mat-nav-list>
  `,
})
export class EntryTypeSheetComponent {
  private readonly ref = inject(MatBottomSheetRef);
  private readonly router = inject(Router);

  navigate(type: string): void {
    this.ref.dismiss();
    void this.router.navigate(['/journal', type]);
  }
}
