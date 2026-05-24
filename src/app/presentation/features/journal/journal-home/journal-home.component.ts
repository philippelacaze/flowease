import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { GetJournalDayUseCase, JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

const QUICK_ACTIONS = [
  { label: 'Repas',      icon: 'restaurant',      route: '/journal/meal',    testid: 'action-meal'    },
  { label: 'Symptômes',  icon: 'health_and_safety',route: '/journal/symptom', testid: 'action-symptom' },
  { label: 'Prises',     icon: 'medication',       route: '/journal/intake',  testid: 'action-intake'  },
  { label: 'Note',       icon: 'edit_note',        route: '/journal/note',    testid: 'action-note'    },
] as const;

/**
 * Page d'accueil du journal — accès direct aux 4 saisies + journal détaillé du jour.
 *
 * @remarks
 * Respecte SRP : navigation et affichage uniquement.
 * Les 4 boutons d'action remplacent le FAB + bottom sheet pour réduire le nombre de clics.
 * La liste des entrées affiche le détail complet (aliments, intensité, texte).
 * Locale fr-FR enregistrée dans app.config.ts — DatePipe produit des dates en français.
 */
@Component({
  selector: 'app-journal-home',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, MatButtonModule, MatIconModule, MatRippleModule, OfflineBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-offline-banner />

    <div class="journal-home">

      <!-- En-tête navigation jour -->
      <header class="journal-header">
        <button mat-icon-button aria-label="Jour précédent" data-testid="prev-day" (click)="prevDay()">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <h1 class="journal-title">{{ currentDate | date:'EEEE d MMMM' }}</h1>
        <button mat-icon-button [disabled]="isToday" aria-label="Jour suivant" data-testid="next-day" (click)="nextDay()">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </header>

      <!-- Accès rapide aux 4 saisies -->
      <section class="quick-actions" aria-label="Nouvelle saisie">
        <button
          *ngFor="let a of quickActions"
          class="action-btn"
          matRipple
          [attr.aria-label]="'Saisir ' + a.label"
          [attr.data-testid]="a.testid"
          (click)="navigate(a.route)">
          <mat-icon class="action-icon" aria-hidden="true">{{ a.icon }}</mat-icon>
          <span class="action-label">{{ a.label }}</span>
        </button>
      </section>

      <!-- Journal du jour -->
      <div *ngIf="loading" class="loading" role="status" aria-live="polite">Chargement…</div>

      <div *ngIf="!loading" class="journal-entries">

        <ng-container *ngIf="entries.length > 0; else emptyState">

          <!-- Repas -->
          <section *ngIf="meals.length > 0" class="entry-section" aria-label="Repas du jour">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">restaurant</mat-icon>Repas
            </h2>
            <div *ngFor="let e of meals" class="entry-card" data-testid="meal-entry">
              <div class="entry-head">
                <span class="entry-label">{{ mealLabel(e.data.type) }}</span>
                <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
              </div>
              <ul class="food-list" aria-label="Aliments">
                <li *ngFor="let item of e.data.items" class="food-item">
                  <span class="food-name">{{ item.name }}</span>
                  <span *ngIf="item.quantity" class="food-qty">{{ item.quantity }}</span>
                  <span class="fodmap-dot fodmap-{{ item.fodmap?.level }}" [attr.aria-label]="'FODMAP ' + (item.fodmap?.level ?? 'inconnu')"></span>
                </li>
              </ul>
            </div>
          </section>

          <!-- Symptômes -->
          <section *ngIf="symptoms.length > 0" class="entry-section" aria-label="Symptômes du jour">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">health_and_safety</mat-icon>Symptômes
            </h2>
            <div *ngFor="let e of symptoms" class="entry-card" data-testid="symptom-entry">
              <div class="entry-head">
                <span class="entry-label">{{ e.data.symptomKey }}</span>
                <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
              </div>
              <div class="intensity-row" [attr.aria-label]="'Intensité ' + e.data.intensity + ' sur 10'">
                <div class="intensity-bar">
                  <div class="intensity-fill" [style.width.%]="e.data.intensity * 10"
                       [class.intensity-low]="e.data.intensity <= 3"
                       [class.intensity-mid]="e.data.intensity > 3 && e.data.intensity <= 6"
                       [class.intensity-high]="e.data.intensity > 6">
                  </div>
                </div>
                <span class="intensity-value">{{ e.data.intensity }}/10</span>
              </div>
              <p *ngIf="e.data.notes" class="entry-notes">{{ e.data.notes }}</p>
            </div>
          </section>

          <!-- Prises -->
          <section *ngIf="intakes.length > 0" class="entry-section" aria-label="Prises du jour">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">medication</mat-icon>Prises
            </h2>
            <div *ngFor="let e of intakes" class="entry-card" data-testid="intake-entry">
              <div class="entry-head">
                <span class="entry-label">{{ e.data.treatmentId }}</span>
                <span class="entry-time">{{ e.data.confirmedAt | date:'HH:mm' }}</span>
              </div>
              <span class="status-badge"
                    [class.status-taken]="e.data.status === 'taken'"
                    [class.status-skipped]="e.data.status === 'skipped'">
                <mat-icon aria-hidden="true">{{ e.data.status === 'taken' ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ e.data.status === 'taken' ? 'Pris' : 'Sauté' }}
              </span>
            </div>
          </section>

          <!-- Notes -->
          <section *ngIf="notes.length > 0" class="entry-section" aria-label="Notes du jour">
            <h2 class="section-title">
              <mat-icon aria-hidden="true">edit_note</mat-icon>Notes
            </h2>
            <div *ngFor="let e of notes" class="entry-card" data-testid="note-entry">
              <div class="entry-head">
                <span class="entry-time">{{ e.data.occurredAt | date:'HH:mm' }}</span>
              </div>
              <p class="note-content">{{ e.data.content }}</p>
              <div *ngIf="e.data.tags.length > 0" class="note-tags">
                <span *ngFor="let tag of e.data.tags" class="note-tag">#{{ tag }}</span>
              </div>
            </div>
          </section>

        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state" role="status">
            <mat-icon aria-hidden="true" class="empty-icon">today</mat-icon>
            <p>Aucune entrée pour ce jour.</p>
            <p class="empty-hint">Utilisez les boutons ci-dessus pour commencer.</p>
          </div>
        </ng-template>

      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; }

    /* ── Header ─────────────────────────────────── */
    .journal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 4px 4px 4px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .journal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      text-transform: capitalize;
      text-align: center;
      flex: 1;
    }

    /* ── Accès rapide ────────────────────────────── */
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 12px 12px 4px;
    }
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 72px;
      padding: 10px;
      background: var(--mat-sys-surface-container);
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .action-btn:active { background: var(--mat-sys-surface-container-high); }
    .action-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-primary);
    }
    .action-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    /* ── Journal ─────────────────────────────────── */
    .loading {
      text-align: center;
      padding: 32px;
      color: var(--mat-sys-on-surface-variant);
    }

    .journal-entries { padding: 8px 12px 24px; }

    .entry-section { margin-bottom: 20px; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--mat-sys-primary);
      margin: 0 0 8px;
    }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .entry-card {
      padding: 10px 12px;
      margin-bottom: 8px;
      background: var(--mat-sys-surface-container);
      border-radius: 12px;
    }

    .entry-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .entry-label { font-size: 14px; font-weight: 600; }
    .entry-time  { font-size: 12px; color: var(--mat-sys-on-surface-variant); white-space: nowrap; flex-shrink: 0; }

    /* Repas — liste d'aliments */
    .food-list  { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
    .food-item  { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .food-name  { flex: 1; }
    .food-qty   { font-size: 12px; color: var(--mat-sys-on-surface-variant); }
    .fodmap-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .fodmap-dot.fodmap-low     { background: #4caf50; }
    .fodmap-dot.fodmap-medium  { background: #ff9800; }
    .fodmap-dot.fodmap-high    { background: #f44336; }
    .fodmap-dot.fodmap-unknown { background: var(--mat-sys-outline); }

    /* Symptômes — barre d'intensité */
    .intensity-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .intensity-bar {
      flex: 1;
      height: 6px;
      background: var(--mat-sys-outline-variant);
      border-radius: 3px;
      overflow: hidden;
    }
    .intensity-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .intensity-low  { background: #4caf50; }
    .intensity-mid  { background: #ff9800; }
    .intensity-high { background: #f44336; }
    .intensity-value { font-size: 12px; font-weight: 600; white-space: nowrap; color: var(--mat-sys-on-surface-variant); }

    .entry-notes { margin: 6px 0 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); font-style: italic; }

    /* Prises — badge statut */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
    }
    .status-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-taken   { color: #2e7d32; }
    .status-skipped { color: var(--mat-sys-error); }

    /* Notes — texte complet */
    .note-content { margin: 0 0 6px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .note-tags    { display: flex; flex-wrap: wrap; gap: 4px; }
    .note-tag     { font-size: 12px; color: var(--mat-sys-primary); }

    /* État vide */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px;
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
      gap: 6px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.35; }
    .empty-hint { font-size: 13px; opacity: 0.7; margin: 0; }
  `],
})
export class JournalHomeComponent implements OnInit {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly quickActions = QUICK_ACTIONS;
  protected currentDate = new Date();
  protected entries: JournalEntry[] = [];
  protected loading = true;

  protected get meals() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'meal' }> => e.kind === 'meal');
  }
  protected get symptoms() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'symptom' }> => e.kind === 'symptom');
  }
  protected get intakes() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'intake' }> => e.kind === 'intake');
  }
  protected get notes() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'note' }> => e.kind === 'note');
  }

  protected get isToday(): boolean {
    return this.currentDate.toDateString() === new Date().toDateString();
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

  protected navigate(route: string): void {
    void this.router.navigate([route]);
  }

  protected mealLabel(type: string): string {
    return MEAL_LABELS[type] ?? type;
  }

  private async loadEntries(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    this.entries = await this.getJournalDay.execute(this.currentDate);
    this.loading = false;
    this.cdr.markForCheck();
  }
}
