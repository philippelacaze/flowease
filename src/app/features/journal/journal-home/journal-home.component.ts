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
import { IntakeService, JournalEntry, CureProgressVO } from '../services/intake.service';
import { NoteService } from '../services/note.service';
import { SymptomService } from '../services/symptom.service';

import { SettingsService } from '../../settings/services/settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import type { CoachSuggestionVO } from '../../../core/models/entities/coach-suggestion.vo';
import { OfflineBannerComponent } from '../../../shared/components/offline-banner/offline-banner.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import { CureProgressComponent } from '../cure-progress/cure-progress.component';
import type { FoodItemVO, MealEntity } from '../../../core/models/entities/meal.entity';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { IntakeEntity } from '../../../core/models/entities/intake.entity';
import type { NoteEntity } from '../../../core/models/entities/note.entity';

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
              private readonly intake = inject(IntakeService);
  private readonly notesSvc = inject(NoteService);
  private readonly symptomSvc = inject(SymptomService);
  private readonly settingsService = inject(SettingsService);
  private readonly notificationPort = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected currentDate = new Date();
  private treatmentMap = new Map<string, string>();
  private symptomLabelMap = new Map<string, string>();
  /** true si l'utilisateur a refusé les notifications dans le navigateur */
  protected notifDenied = false;
  protected entries: JournalEntry[] = [];
  protected activeCures: CureProgressVO[] = [];
  protected coachSuggestions: CoachSuggestionVO[] = [];
  protected loading = true;

  protected get meals() {
    return this.entries.filter((e): e is Extract<JournalEntry, { kind: 'meal' }> => e.kind === 'meal');
  }
  protected get symptoms() {
    return this.entries.filter(
      (e): e is Extract<JournalEntry, { kind: 'symptom' }> => e.kind === 'symptom',
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
    const state = history.state as { journalDate?: string };
    if (state?.journalDate) {
      this.currentDate = new Date(state.journalDate);
    }
    void this.loadEntries();
    void this.loadActiveCures();
    void this.loadTreatmentNames();
    void this.loadSymptomLabels();
    this.notifDenied = this.notificationPort.getPermissionStatus() === 'denied';
    void this.settingsService.scheduleReminders();
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
    void this.router.navigate([route], {
      ...(mode ? { queryParams: { mode } } : {}),
      state: { journalDate: this.currentDate.toISOString() },
    });
  }

  protected hasFodmapHigh(items: ReadonlyArray<FoodItemVO>): boolean {
    return items.some(item => item.fodmap?.level === 'high');
  }

  protected editMeal(data: MealEntity): void {
    void this.router.navigate(['/journal/meal'], {
      state: { editEntry: data, journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected editSymptom(data: SymptomEntity): void {
    void this.router.navigate(['/journal/symptom'], {
      state: { editEntry: data, journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected editIntake(data: IntakeEntity): void {
    void this.router.navigate(['/journal/intake'], {
      state: { editEntry: data, journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected editNote(data: NoteEntity): void {
    void this.router.navigate(['/journal/note'], {
      state: { editEntry: data, journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected startSymptomVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/symptom'], {
      queryParams: { mode: 'voice' },
      state: { journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected startIntakeVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/intake'], {
      queryParams: { mode: 'voice' },
      state: { journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected startNoteVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/note'], {
      queryParams: { mode: 'voice' },
      state: { journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
  }

  protected mealLabel(type: string): string {
    return MEAL_LABELS[type] ?? type;
  }

  protected symptomLabel(key: string): string {
    return this.symptomLabelMap.get(key) ?? key;
  }

  /**
   * Classe CSS de couleur d'une barre d'intensité de symptôme (0→10, haut = pire).
   *
   * @remarks
   * Échelle : 0–1 vert, 2–3 jaune, 4–6 orange, 7–10 rouge.
   */
  protected intensityClass(intensity: number): string {
    if (intensity <= 1) return 'intensity-low';
    if (intensity <= 3) return 'intensity-mild';
    if (intensity <= 6) return 'intensity-mid';
    return 'intensity-high';
  }

  protected treatmentName(id: string): string {
    return this.treatmentMap.get(id) ?? id;
  }

  /**
   * Libellé affiché pour une prise : nom du traitement rattaché, ou nom libre
   * saisi pour une prise ponctuelle hors traitement/cure.
   */
  protected intakeLabel(intake: IntakeEntity): string {
    if (intake.medicationName) return intake.medicationName;
    return intake.treatmentId ? this.treatmentName(intake.treatmentId) : 'Médicament';
  }

  protected startVoice(event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/journal/meal'], {
      queryParams: { mode: 'voice' },
      state: { journalDate: this.currentDate.toISOString() },
    }).catch(() => undefined);
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
        state: { photo: { base64, mediaType }, journalDate: this.currentDate.toISOString() },
      });
    };
    reader.readAsDataURL(file);

    // reset so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  protected confirmTag(note: NoteEntity, tag: string): void {
    const newTags = [...note.tags, tag];
    const newSuggestions = (note.aiTagSuggestions ?? []).filter(t => t !== tag);
    this.applyNoteTagUpdate(note.id, newTags, newSuggestions);
  }

  protected rejectTag(note: NoteEntity, tag: string): void {
    const newSuggestions = (note.aiTagSuggestions ?? []).filter(t => t !== tag);
    this.applyNoteTagUpdate(note.id, [...note.tags], newSuggestions);
  }

  protected confirmAllTags(note: NoteEntity): void {
    const newTags = [...note.tags, ...(note.aiTagSuggestions ?? [])];
    this.applyNoteTagUpdate(note.id, newTags, []);
  }

  protected addFreeTag(note: NoteEntity, inputEl: HTMLInputElement): void {
    const tag = inputEl.value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || note.tags.includes(tag)) return;
    inputEl.value = '';
    const newTags = [...note.tags, tag];
    this.applyNoteTagUpdate(note.id, newTags, [...(note.aiTagSuggestions ?? [])]);
  }

  private applyNoteTagUpdate(
    noteId: string,
    tags: ReadonlyArray<string>,
    aiTagSuggestions: ReadonlyArray<string>,
  ): void {
    this.entries = this.entries.map(e => {
      if (e.kind === 'note' && e.data.id === noteId) {
        return { ...e, data: { ...e.data, tags, aiTagSuggestions } };
      }
      return e;
    });
    this.cdr.markForCheck();
    void this.notesSvc.confirmTags(noteId, tags, aiTagSuggestions);
  }

  private async loadEntries(): Promise<void> {
    this.loading = true;
    this.coachSuggestions = [];
    this.cdr.markForCheck();
    this.entries = await this.intake.getJournalDay(this.currentDate);
    this.loading = false;
    this.cdr.markForCheck();
    this.coachSuggestions = await this.intake.getSuggestions(this.currentDate, this.entries);
    this.cdr.markForCheck();
  }

  private async loadActiveCures(): Promise<void> {
    this.activeCures = await this.intake.getActiveCures();
    this.cdr.markForCheck();
  }

  private async loadTreatmentNames(): Promise<void> {
    const treatments = await this.intake.getAllTreatments();
    this.treatmentMap = new Map(treatments.map(t => [t.id, t.name]));
  }

  private async loadSymptomLabels(): Promise<void> {
    const configs = await this.symptomSvc.getAllConfigs();
    this.symptomLabelMap = new Map(configs.map(c => [c.key, c.label]));
    this.cdr.markForCheck();
  }
}