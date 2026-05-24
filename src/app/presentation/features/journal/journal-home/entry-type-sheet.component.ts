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
  templateUrl: './entry-type-sheet.component.html',
})
export class EntryTypeSheetComponent {
  private readonly ref = inject(MatBottomSheetRef);
  private readonly router = inject(Router);

  navigate(type: string): void {
    this.ref.dismiss();
    void this.router.navigate(['/journal', type]);
  }
}
