import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import type { IntakeEntity, IntakeStatus, SkipReason } from '../../../core/models/entities/intake.entity';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { CureEntity } from '../../../core/models/entities/cure.entity';
import type { MealEntity } from '../../../core/models/entities/meal.entity';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { NoteEntity } from '../../../core/models/entities/note.entity';
import type { CoachSuggestionVO } from '../../../core/models/entities/coach-suggestion.vo';

// --- Types exportés ---

export interface ConfirmIntakeInput {
  /** Référence au traitement, ou absent pour une prise ponctuelle libre. */
  readonly treatmentId?: string;
  /** Nom libre du médicament pour une prise hors traitement/cure. */
  readonly medicationName?: string;
  /** Heure planifiée ; par défaut alignée sur confirmedAt pour une prise ponctuelle. */
  readonly scheduledAt?: Date;
  readonly confirmedAt: Date;
  readonly status: IntakeStatus;
  readonly skipReason?: SkipReason;
  readonly actualDose?: string;
  readonly notes?: string;
}

export interface EditIntakeInput {
  readonly id: string;
  readonly confirmedAt: Date;
  readonly status: IntakeStatus;
  readonly skipReason?: SkipReason;
  readonly actualDose?: string;
  readonly notes?: string;
  /** Nouveau nom libre pour une prise ponctuelle (ignoré si non fourni). */
  readonly medicationName?: string;
}

export type JournalEntry =
  | { readonly kind: 'meal'; readonly data: MealEntity }
  | { readonly kind: 'symptom'; readonly data: SymptomEntity }
  | { readonly kind: 'intake'; readonly data: IntakeEntity }
  | { readonly kind: 'note'; readonly data: NoteEntity };

export interface CureProgressVO {
  readonly id: string;
  readonly name: string;
  readonly currentDay: number;
  readonly totalDays: number;
  readonly progressPercent: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function entryTime(entry: JournalEntry): number {
  if (entry.kind === 'intake') return entry.data.confirmedAt.getTime();
  return entry.data.occurredAt.getTime();
}

@Injectable({ providedIn: 'root' })
export class IntakeService {
  private readonly storage = inject(StorageService);
  private readonly localSettings = inject(LocalSettingsService);

  async confirm(input: ConfirmIntakeInput): Promise<string> {
    const intake: IntakeEntity = {
      id: crypto.randomUUID(),
      scheduledAt: input.scheduledAt ?? input.confirmedAt,
      confirmedAt: input.confirmedAt,
      createdAt: new Date(),
      status: input.status,
      ...(input.treatmentId && { treatmentId: input.treatmentId }),
      ...(input.medicationName && { medicationName: input.medicationName }),
      ...(input.skipReason && { skipReason: input.skipReason }),
      ...(input.actualDose && { actualDose: input.actualDose }),
      ...(input.notes && { notes: input.notes }),
    };
    return this.storage.save('intakes', intake);
  }

  async edit(input: EditIntakeInput): Promise<void> {
    const existing = await this.storage.get<IntakeEntity>('intakes', input.id);
    if (!existing) return;
    const updated: IntakeEntity = {
      ...existing,
      confirmedAt: input.confirmedAt,
      status: input.status,
      skipReason: input.skipReason,
      actualDose: input.actualDose,
      notes: input.notes,
      ...(input.medicationName !== undefined && { medicationName: input.medicationName }),
      editedAt: new Date(),
    };
    await this.storage.save('intakes', updated);
  }

  async getActiveTreatments(): Promise<TreatmentEntity[]> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    return all.filter(t => t.active).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllTreatments(): Promise<TreatmentEntity[]> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getJournalDay(date: Date): Promise<JournalEntry[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [meals, symptoms, intakes, notes] = await Promise.all([
      this.storage.getRange('meals', 'occurredAt', dayStart, dayEnd) as Promise<MealEntity[]>,
      this.storage.getRange('symptoms', 'occurredAt', dayStart, dayEnd) as Promise<SymptomEntity[]>,
      this.storage.getRange('intakes', 'confirmedAt', dayStart, dayEnd) as Promise<IntakeEntity[]>,
      this.storage.getRange('notes', 'occurredAt', dayStart, dayEnd) as Promise<NoteEntity[]>,
    ]);

    const entries: JournalEntry[] = [
      ...meals.map((data): JournalEntry => ({ kind: 'meal', data })),
      ...symptoms.map((data): JournalEntry => ({ kind: 'symptom', data })),
      ...intakes.map((data): JournalEntry => ({ kind: 'intake', data })),
      ...notes.map((data): JournalEntry => ({ kind: 'note', data })),
    ];

    return entries.sort((a, b) => entryTime(a) - entryTime(b));
  }

  async getSuggestions(date: Date, todayEntries: JournalEntry[]): Promise<CoachSuggestionVO[]> {
    if (!this.localSettings.getCoachSuggestions()) return [];

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (!isToday) return [];

    const suggestions: CoachSuggestionVO[] = [];

    const hasMeals = todayEntries.some(e => e.kind === 'meal');
    if (!hasMeals && now.getHours() >= 8) {
      suggestions.push({
        type: 'no_recent_meal',
        message: 'Pas de repas saisi depuis plus de 8h — pensez à noter votre repas.',
      });
    }

    const trendSuggestion = await this.checkSymptomTrend(date, todayEntries);
    if (trendSuggestion) suggestions.push(trendSuggestion);

    return suggestions;
  }

  async getActiveCures(): Promise<CureProgressVO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const all = await this.storage.getAll('cures') as CureEntity[];
    const result: CureProgressVO[] = [];

    for (const cure of all) {
      if (cure.status !== 'active') continue;

      const startDay = new Date(cure.startedAt);
      startDay.setHours(0, 0, 0, 0);

      const dayIndex = Math.floor((today.getTime() - startDay.getTime()) / MS_PER_DAY);
      if (dayIndex < 0) continue;

      if (dayIndex >= cure.durationDays) {
        const completed: CureEntity = { ...cure, status: 'completed', endedAt: new Date() };
        await this.storage.save('cures', completed);
        continue;
      }

      const currentDay = dayIndex + 1;
      result.push({
        id: cure.id,
        name: cure.name,
        currentDay,
        totalDays: cure.durationDays,
        progressPercent: Math.round((currentDay / cure.durationDays) * 100),
      });
    }

    return result;
  }

  private async checkSymptomTrend(
    date: Date,
    todayEntries: JournalEntry[],
  ): Promise<CoachSuggestionVO | null> {
    const todaySymptoms = todayEntries
      .filter((e): e is Extract<JournalEntry, { kind: 'symptom' }> =>
        e.kind === 'symptom' && e.data.category !== 'wellbeing',
      )
      .map(e => ({ key: e.data.symptomKey, intensity: e.data.intensity }));

    if (todaySymptoms.length === 0) return null;

    const getDaySymptoms = async (offsetDays: number): Promise<SymptomEntity[]> => {
      const d = new Date(date);
      d.setDate(d.getDate() - offsetDays);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      return this.storage.getRange('symptoms', 'occurredAt', start, end) as Promise<SymptomEntity[]>;
    };

    const [day1Symptoms, day2Symptoms] = await Promise.all([
      getDaySymptoms(1),
      getDaySymptoms(2),
    ]);

    for (const todaySym of todaySymptoms) {
      const d1 = day1Symptoms.find(s => s.symptomKey === todaySym.key);
      const d2 = day2Symptoms.find(s => s.symptomKey === todaySym.key);
      if (!d1 || !d2) continue;
      if (d2.intensity < d1.intensity && d1.intensity < todaySym.intensity) {
        return {
          type: 'symptom_trending_up',
          message: 'Un symptôme est en hausse depuis 3 jours — en parler avec le Coach ?',
        };
      }
    }

    return null;
  }
}
