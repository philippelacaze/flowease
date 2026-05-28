import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GetJournalDayUseCase, JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import type { FoodItemVO } from '../../../../domain/entities/meal.entity';

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
  imports: [DatePipe, MatButtonModule, MatIconModule, OfflineBannerComponent, FoodChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-home.component.html',
  styleUrl: './journal-home.component.scss',
})
export class JournalHomeComponent implements OnInit, OnDestroy {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentDate = new Date();
  protected entries: JournalEntry[] = [];
  protected loading = true;
  protected readonly isRecording = signal(false);

  protected showWellbeing = false;
  protected wellbeingScore: number | null = null;
  protected wellbeingTime = '';
  protected readonly wellbeingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

  protected navigate(route: string, mode?: string): void {
    void this.router.navigate([route], mode ? { queryParams: { mode } } : {});
  }

  protected setWellbeing(n: number): void {
    this.wellbeingScore = n;
    this.wellbeingTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    this.showWellbeing = false;
    this.cdr.markForCheck();
  }

  protected hasFodmapHigh(items: ReadonlyArray<FoodItemVO>): boolean {
    return items.some(item => item.fodmap?.level === 'high');
  }

  protected startSymptomVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/symptom'], { queryParams: { mode: 'voice' } }).catch(() => undefined);
  }

  protected startIntakeVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/intake'], { queryParams: { mode: 'voice' } }).catch(() => undefined);
  }

  protected startNoteVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/note'], { queryParams: { mode: 'voice' } }).catch(() => undefined);
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

    if (!SpeechRecognitionCtor) {
      // Fallback : naviguer directement en mode saisie vocale manuelle
      void this.router.navigate(['/journal/meal'], { queryParams: { mode: 'voice' } }).catch(() => undefined);
      return;
    }

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
      // Passer queryParams + state pour que meal-entry démarre l'analyse immédiatement
      void this.router.navigate(['/journal/meal'], {
        queryParams: { mode: 'voice' },
        state: { transcript },
      }).catch(() => undefined);
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
    this.cdr.markForCheck();
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
