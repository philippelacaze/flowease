import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
  signal,
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

/**
 * Page d'accueil du journal — navigation rapide vers les 4 saisies + journal détaillé du jour.
 *
 * @remarks
 * Respecte SRP : navigation et affichage uniquement.
 * La carte Repas expose micro (vocal) et appareil photo (vision) pour pré-remplir meal-entry.
 * La carte Symptômes navigue directement vers /journal/symptom.
 * Prises et Note sont en grille 2 colonnes.
 * SpeechRecognition est instancié inline — pas d'injection de service pour cette API Web native.
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

      <!-- Accès rapide aux saisies -->
      <section class="quick-actions" aria-label="Nouvelle saisie">

        <!-- Repas — pleine largeur avec micro + appareil photo -->
        <div class="action-card action-card--full" matRipple
             role="button" tabindex="0"
             aria-label="Saisir un repas"
             data-testid="action-meal"
             (click)="navigate('/journal/meal')"
             (keydown.enter)="navigate('/journal/meal')"
             (keydown.space)="navigate('/journal/meal')">
          <div class="action-card-main">
            <mat-icon class="action-icon" aria-hidden="true">restaurant</mat-icon>
            <span class="action-label">Repas</span>
          </div>
          <div class="action-card-shortcuts">
            <button mat-icon-button
                    aria-label="Dicter un repas"
                    data-testid="action-meal-mic"
                    [class.recording]="isRecording()"
                    (click)="startVoice($event)">
              <mat-icon>{{ isRecording() ? 'stop' : 'mic' }}</mat-icon>
            </button>
            <button mat-icon-button
                    aria-label="Photographier un repas"
                    data-testid="action-meal-camera"
                    (click)="openCamera($event)">
              <mat-icon>photo_camera</mat-icon>
            </button>
          </div>
        </div>
        <input #photoInput type="file" accept="image/*" capture="environment"
               class="hidden-input"
               aria-hidden="true"
               (change)="onPhotoChosen($event)" />

        <!-- Symptômes — pleine largeur -->
        <div class="action-card action-card--full" matRipple
             role="button" tabindex="0"
             aria-label="Saisir un symptôme"
             data-testid="action-symptom"
             (click)="navigate('/journal/symptom')"
             (keydown.enter)="navigate('/journal/symptom')"
             (keydown.space)="navigate('/journal/symptom')">
          <div class="action-card-main">
            <mat-icon class="action-icon" aria-hidden="true">health_and_safety</mat-icon>
            <span class="action-label">Symptômes</span>
          </div>
        </div>

        <!-- Prises + Note — grille 2 colonnes -->
        <div class="action-card action-card--half" matRipple
             role="button" tabindex="0"
             aria-label="Saisir une prise"
             data-testid="action-intake"
             (click)="navigate('/journal/intake')"
             (keydown.enter)="navigate('/journal/intake')"
             (keydown.space)="navigate('/journal/intake')">
          <mat-icon class="action-icon" aria-hidden="true">medication</mat-icon>
          <span class="action-label">Prises</span>
        </div>

        <div class="action-card action-card--half" matRipple
             role="button" tabindex="0"
             aria-label="Saisir une note"
             data-testid="action-note"
             (click)="navigate('/journal/note')"
             (keydown.enter)="navigate('/journal/note')"
             (keydown.space)="navigate('/journal/note')">
          <mat-icon class="action-icon" aria-hidden="true">edit_note</mat-icon>
          <span class="action-label">Note</span>
        </div>

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
      padding: 4px;
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

    .action-card {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 64px;
      padding: 10px 12px;
      background: var(--mat-sys-surface-container);
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: background 0.15s;
      outline: none;
      user-select: none;
    }
    .action-card:active { background: var(--mat-sys-surface-container-high); }
    .action-card:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    .action-card--full {
      grid-column: 1 / -1;
      justify-content: space-between;
    }
    .action-card--half {
      flex-direction: column;
      justify-content: center;
      min-height: 72px;
    }

    .action-card-main {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .action-card-shortcuts {
      display: flex;
      align-items: center;
      gap: 0;
      flex-shrink: 0;
    }

    .action-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-primary);
      flex-shrink: 0;
    }
    .action-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    button.recording mat-icon { color: var(--mat-sys-error); }

    .hidden-input { display: none; }

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
export class JournalHomeComponent implements OnInit, OnDestroy {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentDate = new Date();
  protected entries: JournalEntry[] = [];
  protected loading = true;
  protected readonly isRecording = signal(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

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

  ngOnDestroy(): void {
    this.stopRecognition();
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

  protected startVoice(event: Event): void {
    event.stopPropagation();

    if (this.isRecording()) {
      this.stopRecognition();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionCtor = w['SpeechRecognition'] ?? w['webkitSpeechRecognition'];

    if (!SpeechRecognitionCtor) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionCtor();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => {
      const transcript: string = ev.results[0]?.[0]?.transcript ?? '';
      this.isRecording.set(false);
      this.recognition = null;
      void this.router.navigate(['/journal/meal'], { state: { transcript } });
    };

    rec.onerror = () => {
      this.isRecording.set(false);
      this.recognition = null;
      this.cdr.markForCheck();
    };

    rec.onend = () => {
      this.isRecording.set(false);
      this.recognition = null;
      this.cdr.markForCheck();
    };

    this.recognition = rec;
    this.isRecording.set(true);
    rec.start();
  }

  protected openCamera(event: Event): void {
    event.stopPropagation();
    const input = document.querySelector<HTMLInputElement>('input[type="file"][accept="image/*"]');
    input?.click();
  }

  protected onPhotoChosen(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      void this.router.navigate(['/journal/meal'], { state: { photo: { base64, mediaType } } });
    };
    reader.readAsDataURL(file);

    // reset so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  private stopRecognition(): void {
    this.recognition?.stop();
    this.recognition = null;
    this.isRecording.set(false);
  }

  private async loadEntries(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    this.entries = await this.getJournalDay.execute(this.currentDate);
    this.loading = false;
    this.cdr.markForCheck();
  }
}
