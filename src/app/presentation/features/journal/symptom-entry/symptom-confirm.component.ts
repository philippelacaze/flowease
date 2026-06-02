import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { Router } from '@angular/router';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';
import type { JournalEntry } from '../../../../application/journal/get-journal-day.usecase';

interface ConfirmItem {
  readonly key: string;
  readonly labelFr: string;
  readonly intensity: number;
  readonly category: string;
}

/**
 * Écran de confirmation après enregistrement des symptômes.
 *
 * @remarks
 * Reçoit les données via history.state.savedItems depuis SymptomEntryComponent.
 * Charge le dernier repas du jour via GetJournalDayUseCase pour la corrélation.
 */
@Component({
  selector: 'app-symptom-confirm',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symptom-confirm.component.html',
  styles: [`
    :host { display: block; }

    .confirm-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--card-bg);
      border-bottom: 0.5px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .confirm-title { margin: 0; font-size: 16px; font-weight: 500; flex: 1; }

    .confirm-body { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

    .success-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: var(--fodmap-low-bg);
      border: 0.5px solid var(--fodmap-low-border);
      border-radius: 12px;
    }
    .success-icon { font-size: 24px; }
    .success-title { font-size: 14px; font-weight: 600; color: var(--fodmap-low-text); }
    .success-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }

    .card { background: var(--card-bg); border: 0.5px solid var(--border); border-radius: 14px; overflow: hidden; }
    .card-header {
      padding: 10px 14px 8px;
      border-bottom: 0.5px solid var(--border-sub);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-3);
    }
    .card-body { padding: 12px 14px; }

    .symptom-list { display: flex; flex-direction: column; gap: 10px; }
    .symptom-item { display: flex; flex-direction: column; gap: 4px; }
    .symptom-item-head { display: flex; justify-content: space-between; align-items: baseline; }
    .symptom-item-label { font-size: 13px; font-weight: 500; color: var(--text-1); }
    .symptom-item-value { font-size: 12px; font-weight: 600; color: var(--text-3); }
    .intensity-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .intensity-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .intensity-low    { background: var(--fodmap-low-dot); }
    .intensity-medium { background: var(--fodmap-medium-dot); }
    .intensity-high   { background: var(--fodmap-high-dot); }

    .meal-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .meal-chip {
      padding: 4px 10px;
      border-radius: 20px;
      background: var(--chip);
      border: 0.5px solid var(--chip-border);
      font-size: 12px;
      color: var(--text-2);
    }
    .no-meal { font-size: 13px; color: var(--text-3); font-style: italic; }

    .back-footer { padding: 16px 16px 32px; }
  `],
})
export class SymptomConfirmComponent implements OnInit {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected savedItems: ConfirmItem[] = [];
  protected lastMealItems: string[] = [];
  protected lastMealTime: Date | null = null;
  private journalDate: Date = new Date();

  ngOnInit(): void {
    const state = history.state as { savedItems?: ConfirmItem[]; journalDate?: string };
    this.savedItems = state?.savedItems ?? [];
    if (state?.journalDate) {
      this.journalDate = new Date(state.journalDate);
    }
    void this.loadLastMeal();
  }

  protected intensityClass(intensity: number): string {
    if (intensity <= 3) return 'intensity-low';
    if (intensity <= 6) return 'intensity-medium';
    return 'intensity-high';
  }

  protected back(): void {
    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  private async loadLastMeal(): Promise<void> {
    const entries = await this.getJournalDay.execute(this.journalDate);
    const meals = entries.filter((e): e is Extract<JournalEntry, { kind: 'meal' }> => e.kind === 'meal');
    if (meals.length > 0) {
      const last = meals[meals.length - 1];
      this.lastMealTime = last.data.occurredAt;
      this.lastMealItems = last.data.items.map((i: { name: string }) => i.name);
    }
    this.cdr.markForCheck();
  }
}
