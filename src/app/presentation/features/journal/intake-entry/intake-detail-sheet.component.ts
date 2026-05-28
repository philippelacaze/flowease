import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';

interface SheetData {
  readonly treatment: TreatmentEntity;
  readonly confirmed: boolean;
  readonly skipped: boolean;
}

/**
 * Bottom sheet de confirmation détaillée d'une prise de traitement.
 *
 * @remarks
 * Ouvert par IntakeEntryComponent via MatBottomSheet (long press sur un traitement).
 * Dismiss avec 'taken' | 'skipped' pour déclencher la confirmation dans le parent.
 */
@Component({
  selector: 'app-intake-detail-sheet',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './intake-detail-sheet.component.html',
  styles: [`
    :host { display: block; padding: 20px 16px 32px; }

    .sheet-name { font-size: 17px; font-weight: 600; color: var(--text-1); }
    .sheet-meta { font-size: 13px; color: var(--text-3); margin-top: 3px; }

    .sheet-tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 16px 0;
    }
    .sheet-tile {
      background: var(--surface-var);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sheet-tile-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-3);
    }
    .sheet-tile-input {
      background: none;
      border: none;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-1);
      width: 100%;
      padding: 0;
      font-family: inherit;
      outline: none;
    }

    .sheet-actions { display: flex; gap: 10px; }
    .sheet-btn {
      padding: 14px;
      border-radius: 12px;
      border: none;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      min-height: 44px;
    }
    .sheet-btn--taken   { flex: 2; background: var(--teal); color: #fff; }
    .sheet-btn--skipped {
      flex: 1;
      background: var(--surface-var);
      color: var(--text-2);
      border: 0.5px solid var(--border);
    }
  `],
})
export class IntakeDetailSheetComponent {
  private readonly sheetRef =
    inject<MatBottomSheetRef<IntakeDetailSheetComponent, 'taken' | 'skipped'>>(MatBottomSheetRef);
  readonly data: SheetData = inject(MAT_BOTTOM_SHEET_DATA);

  protected detailTime = this.nowTime();
  protected detailDose = '';

  protected confirm(action: 'taken' | 'skipped'): void {
    this.sheetRef.dismiss(action);
  }

  private nowTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}
