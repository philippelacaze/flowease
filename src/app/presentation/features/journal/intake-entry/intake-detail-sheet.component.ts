import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import type { TreatmentEntity } from '../../../../domain/entities/treatment.entity';
import type { IntakeEntity, SkipReason } from '../../../../domain/entities/intake.entity';

interface SheetData {
  readonly treatment: TreatmentEntity;
  readonly confirmed: boolean;
  readonly skipped: boolean;
  readonly editEntry?: IntakeEntity;
}

/**
 * Résultat renvoyé au parent lors du dismiss du bottom sheet.
 *
 * @remarks
 * Exported pour permettre au parent (IntakeEntryComponent) de typer correctement
 * l'abonnement à afterDismissed().
 */
export interface SheetResult {
  readonly action: 'taken' | 'skipped';
  readonly notes?: string;
  readonly skipReason?: SkipReason;
}

/** Options de raison de saut affichées en UI (spec §1.5.3). */
export const SKIP_REASON_OPTIONS: ReadonlyArray<{ value: SkipReason; label: string }> = [
  { value: 'forgot',            label: 'Oubli' },
  { value: 'side_effects',      label: 'Effet secondaire' },
  { value: 'deliberate_choice', label: 'Choix délibéré' },
  { value: 'other',             label: 'Autre' },
];

/**
 * Bottom sheet de confirmation détaillée d'une prise de traitement.
 *
 * @remarks
 * Ouvert par IntakeEntryComponent via MatBottomSheet (long press sur un traitement).
 * Dismiss avec SheetResult pour transmettre l'action, la note et la raison du saut.
 * Le sélecteur de raison n'est visible qu'après un premier tap sur "Sauté".
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
    .sheet-btn--skipped-confirm {
      flex: 1;
      background: var(--fodmap-high-bg);
      color: var(--fodmap-high-text);
      border: 0.5px solid var(--fodmap-high-border);
    }

    .sheet-note { margin: 12px 0; }
    .sheet-note-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-3);
      display: block;
      margin-bottom: 6px;
    }
    .sheet-note-input {
      width: 100%;
      padding: 10px 12px;
      border: 0.5px solid var(--border);
      border-radius: 10px;
      background: var(--input-bg);
      color: var(--text-1);
      font-size: 14px;
      font-family: inherit;
      resize: none;
      box-sizing: border-box;
      min-height: 72px;
    }
    .sheet-note-input::placeholder { color: var(--text-3); }

    .sheet-skip-reason { margin-bottom: 12px; }
    .sheet-skip-reason-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-3);
      display: block;
      margin-bottom: 6px;
    }
    .sheet-skip-reason-select {
      width: 100%;
      padding: 10px 12px;
      border: 0.5px solid var(--border);
      border-radius: 10px;
      background: var(--input-bg);
      color: var(--text-1);
      font-size: 14px;
      font-family: inherit;
      min-height: 44px;
      appearance: auto;
    }
  `],
})
export class IntakeDetailSheetComponent {
  private readonly sheetRef =
    inject<MatBottomSheetRef<IntakeDetailSheetComponent, SheetResult>>(MatBottomSheetRef);
  readonly data: SheetData = inject(MAT_BOTTOM_SHEET_DATA);

  protected readonly skipReasonOptions = SKIP_REASON_OPTIONS;

  protected detailTime = this.data.editEntry
    ? this.toTimeString(this.data.editEntry.confirmedAt)
    : this.nowTime();
  protected detailDose = this.data.editEntry?.actualDose ?? '';
  protected detailNote = this.data.editEntry?.notes ?? '';
  protected selectedSkipReason: SkipReason | '' = this.data.editEntry?.skipReason ?? '';
  protected showSkipReason = this.data.editEntry?.status === 'skipped';

  protected confirmTaken(): void {
    this.sheetRef.dismiss({
      action: 'taken',
      ...(this.detailNote.trim() && { notes: this.detailNote.trim() }),
    });
  }

  protected initiateSkip(): void {
    if (!this.showSkipReason) {
      this.showSkipReason = true;
      return;
    }
    this.sheetRef.dismiss({
      action: 'skipped',
      ...(this.detailNote.trim() && { notes: this.detailNote.trim() }),
      ...(this.selectedSkipReason && { skipReason: this.selectedSkipReason }),
    });
  }

  private nowTime(): string {
    return this.toTimeString(new Date());
  }

  private toTimeString(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
