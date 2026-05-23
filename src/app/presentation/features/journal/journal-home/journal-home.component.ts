import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { NgFor, NgIf, DatePipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { GetJournalDayUseCase, JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';
import { EntryTypeSheetComponent } from './entry-type-sheet.component';

/**
 * Page d'accueil du journal : liste des entrées du jour groupées par type.
 *
 * @remarks
 * Respecte le principe OCP : les composants enfants gèrent leur propre rendu.
 * Appelle GetJournalDayUseCase pour charger les entrées du jour sélectionné.
 * Navigation jour par jour via chevrons. FAB + bottom sheet pour créer une entrée.
 */
@Component({
  selector: 'app-journal-home',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, SlicePipe,
    MatButtonModule, MatIconModule,
    OfflineBannerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-offline-banner />

    <div class="journal-home">
      <header class="journal-header">
        <div class="header-row">
          <button
            mat-icon-button
            aria-label="Jour précédent"
            data-testid="prev-day"
            (click)="prevDay()"
          >
            <mat-icon>chevron_left</mat-icon>
          </button>

          <h1 class="journal-title">
            {{ currentDate | date:'EEEE d MMMM' }}
          </h1>

          <button
            mat-icon-button
            [disabled]="isToday"
            aria-label="Jour suivant"
            data-testid="next-day"
            (click)="nextDay()"
          >
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </header>

      <div *ngIf="loading" class="loading" role="status" aria-live="polite">
        Chargement…
      </div>

      <div *ngIf="!loading" class="journal-entries">
        <ng-container *ngIf="entries.length > 0; else emptyState">
          <!-- Repas -->
          <section *ngIf="meals.length > 0" class="entry-section" aria-label="Repas">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">restaurant</mat-icon>
              Repas
            </h2>
            <div
              *ngFor="let e of meals"
              class="entry-card"
              data-testid="meal-entry"
            >
              <div class="entry-main">
                <span class="entry-label">{{ mealTypeLabel(e.data.type) }}</span>
                <span class="entry-sub">{{ e.data.items.length }} aliment(s)</span>
              </div>
              <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
            </div>
          </section>

          <!-- Symptômes -->
          <section *ngIf="symptoms.length > 0" class="entry-section" aria-label="Symptômes">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">health_and_safety</mat-icon>
              Symptômes
            </h2>
            <div
              *ngFor="let e of symptoms"
              class="entry-card"
              data-testid="symptom-entry"
            >
              <div class="entry-main">
                <span class="entry-label">{{ e.data.symptomKey }}</span>
                <span class="entry-sub">Intensité {{ e.data.intensity }}/10</span>
              </div>
              <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
            </div>
          </section>

          <!-- Prises -->
          <section *ngIf="intakes.length > 0" class="entry-section" aria-label="Prises de traitement">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">medication</mat-icon>
              Prises
            </h2>
            <div
              *ngFor="let e of intakes"
              class="entry-card"
              data-testid="intake-entry"
            >
              <div class="entry-main">
                <span class="entry-label">{{ e.data.treatmentId }}</span>
                <span
                  class="entry-sub"
                  [class.status-taken]="e.data.status === 'taken'"
                  [class.status-skipped]="e.data.status === 'skipped'"
                >
                  {{ e.data.status === 'taken' ? 'Pris' : 'Sauté' }}
                </span>
              </div>
              <span class="entry-time">{{ e.data.confirmedAt | date:'HH:mm' }}</span>
            </div>
          </section>

          <!-- Notes -->
          <section *ngIf="notes.length > 0" class="entry-section" aria-label="Notes">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">edit_note</mat-icon>
              Notes
            </h2>
            <div
              *ngFor="let e of notes"
              class="entry-card"
              data-testid="note-entry"
            >
              <div class="entry-main">
                <span class="entry-label">
                  {{ e.data.content | slice:0:60 }}{{ e.data.content.length > 60 ? '…' : '' }}
                </span>
                <span *ngIf="e.data.tags.length > 0" class="entry-sub">
                  {{ e.data.tags.join(', ') }}
                </span>
              </div>
              <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
            </div>
          </section>
        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state" role="status">
            <mat-icon aria-hidden="true" class="empty-icon">edit_note</mat-icon>
            <p>Aucune entrée pour ce jour.</p>
            <p class="empty-hint">Appuyez sur + pour commencer.</p>
          </div>
        </ng-template>
      </div>
    </div>

    <button
      mat-fab
      color="primary"
      class="journal-fab"
      aria-label="Ajouter une entrée au journal"
      data-testid="add-entry-fab"
      (click)="openEntrySheet()"
    >
      <mat-icon>add</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; position: relative; }

    .journal-home { flex: 1; padding-bottom: 96px; }

    .journal-header {
      padding: 8px 8px 8px 4px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }

    .journal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      text-transform: capitalize;
      flex: 1;
      text-align: center;
    }

    .loading {
      text-align: center;
      padding: 32px;
      color: var(--mat-sys-on-surface-variant);
    }

    .journal-entries { padding: 8px 16px; }

    .entry-section { margin-bottom: 16px; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--mat-sys-primary);
      margin: 0 0 8px;
    }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .entry-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      margin-bottom: 6px;
      background: var(--mat-sys-surface-container);
      border-radius: 10px;
      min-height: 44px;
    }

    .entry-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .entry-label { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .entry-sub   { font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    .status-taken   { color: #2e7d32; font-weight: 600; }
    .status-skipped { color: var(--mat-sys-error); font-weight: 600; }

    .entry-time {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
      gap: 8px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; }
    .empty-hint { font-size: 13px; opacity: 0.7; margin: 0; }

    .journal-fab {
      position: fixed;
      bottom: 88px;
      right: 16px;
      z-index: 20;
    }
  `],
})
export class JournalHomeComponent implements OnInit {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentDate = new Date();
  protected entries: JournalEntry[] = [];
  protected loading = true;

  protected get meals() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'meal' }> => e.kind === 'meal',
    );
  }
  protected get symptoms() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'symptom' }> => e.kind === 'symptom',
    );
  }
  protected get intakes() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'intake' }> => e.kind === 'intake',
    );
  }
  protected get notes() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'note' }> => e.kind === 'note',
    );
  }

  protected get isToday(): boolean {
    const today = new Date();
    return this.currentDate.toDateString() === today.toDateString();
  }

  ngOnInit(): void {
    void this.loadEntries();
  }

  protected prevDay(): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 1);
    this.currentDate = d;
    void this.loadEntries();
  }

  protected nextDay(): void {
    if (this.isToday) return;
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 1);
    this.currentDate = d;
    void this.loadEntries();
  }

  protected openEntrySheet(): void {
    this.bottomSheet.open(EntryTypeSheetComponent);
  }

  protected mealTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
      snack: 'Collation',
    };
    return labels[type] ?? type;
  }

  private async loadEntries(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    this.entries = await this.getJournalDay.execute(this.currentDate);
    this.loading = false;
    this.cdr.markForCheck();
  }
}
