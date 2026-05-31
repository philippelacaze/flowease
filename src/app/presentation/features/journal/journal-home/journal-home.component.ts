import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GetJournalDayUseCase, JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import { GetActiveCuresUseCase, CureProgressVO } from '../../../../application/journal/get-active-cures.usecase';
import { SaveWellbeingScoreUseCase } from '../../../../application/journal/save-wellbeing-score.usecase';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import { CureProgressComponent } from '../cure-progress/cure-progress.component';
import type { FoodItemVO, MealEntity } from '../../../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../../../domain/entities/symptom.entity';
import type { IntakeEntity } from '../../../../domain/entities/intake.entity';
import type { NoteEntity } from '../../../../domain/entities/note.entity';

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
  imports: [DatePipe, MatButtonModule, MatIconModule, OfflineBannerComponent, FoodChipComponent, CureProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-home.component.html',
  styleUrl: './journal-home.component.scss',
})
export class JournalHomeComponent implements OnInit {
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly getActiveCures = inject(GetActiveCuresUseCase);
  private readonly saveWellbeingScore = inject(SaveWellbeingScoreUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentDate = new Date();
  protected entries: JournalEntry[] = [];
  protected activeCures: CureProgressVO[] = [];
  protected loading = true;

  protected showWellbeing = false;
  protected wellbeingScore: number | null = null;
  protected wellbeingTime = '';
  protected readonly wellbeingOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  protected get meals() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'meal' }> => e.kind === 'meal');
  }
  protected get symptoms() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'symptom' }> =>
        e.kind === 'symptom' && e.data.category !== 'wellbeing',
    );
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
    void this.loadActiveCures();
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
    void this.saveWellbeingScore.execute({ date: this.currentDate, score: n });
  }

  protected hasFodmapHigh(items: ReadonlyArray<FoodItemVO>): boolean {
    return items.some(item => item.fodmap?.level === 'high');
  }

  protected editMeal(data: MealEntity): void {
    void this.router.navigate(['/journal/meal'], { state: { editEntry: data } }).catch(() => undefined);
  }

  protected editSymptom(data: SymptomEntity): void {
    void this.router.navigate(['/journal/symptom'], { state: { editEntry: data } }).catch(() => undefined);
  }

  protected editIntake(data: IntakeEntity): void {
    void this.router.navigate(['/journal/intake'], { state: { editEntry: data } }).catch(() => undefined);
  }

  protected editNote(data: NoteEntity): void {
    void this.router.navigate(['/journal/note'], { state: { editEntry: data } }).catch(() => undefined);
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
    void this.router.navigate(['/journal/meal'], { queryParams: { mode: 'voice' } }).catch(() => undefined);
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
      void this.router.navigate(['/journal/meal'], {
        queryParams: { mode: 'photo' },
        state: { photo: { base64, mediaType } },
      });
    };
    reader.readAsDataURL(file);

    // reset so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  private async loadEntries(): Promise<void> {
    this.loading = true;
    this.wellbeingScore = null;
    this.showWellbeing = false;
    this.cdr.markForCheck();
    this.entries = await this.getJournalDay.execute(this.currentDate);
    this.prefillWellbeing();
    this.loading = false;
    this.cdr.markForCheck();
  }

  private prefillWellbeing(): void {
    const entry = this.entries.find(
      (e): e is Extract<JournalEntry, { kind: 'symptom' }> =>
        e.kind === 'symptom' && e.data.symptomKey === 'wellbeing_score',
    );
    if (!entry) return;
    this.wellbeingScore = entry.data.intensity;
    this.wellbeingTime = new Date(entry.data.occurredAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async loadActiveCures(): Promise<void> {
    this.activeCures = await this.getActiveCures.execute();
    this.cdr.markForCheck();
  }
}
