import { inject, Injectable } from '@angular/core';
import type { CoachSuggestionVO } from '../../domain/entities/coach-suggestion.vo';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { LocalSettingsRepository } from '../../domain/repositories/local-settings.repository';
import { STORAGE_PORT, LOCAL_SETTINGS_PORT } from '../tokens';
import type { JournalEntry } from './get-journal-day.usecase';

/**
 * Évalue les règles de suggestion proactive du Coach pour le jour courant.
 *
 * @remarks
 * Respecte SRP — responsabilité unique : déterminer quelles suggestions afficher.
 * Aucun appel IA : les règles sont évaluées localement à partir des données IndexedDB.
 * Retourne un tableau vide si les suggestions sont désactivées dans les préférences
 * ou si la date passée n'est pas aujourd'hui.
 *
 * Règles évaluées :
 * - `no_recent_meal` : aucun repas saisi et il est ≥ 8h du matin
 * - `symptom_trending_up` : un symptôme a augmenté 3 jours de suite
 */
@Injectable({ providedIn: 'root' })
export class GetJournalSuggestionsUseCase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly storage = inject<StorageRepository<any>>(STORAGE_PORT as never);
  private readonly localSettings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT);

  /**
   * Calcule les suggestions pour un jour et ses entrées déjà chargées.
   *
   * @param date - Le jour courant du journal
   * @param todayEntries - Entrées déjà chargées par GetJournalDayUseCase
   * @returns Tableau de suggestions — vide si désactivé ou pas aujourd'hui
   */
  async execute(date: Date, todayEntries: JournalEntry[]): Promise<CoachSuggestionVO[]> {
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
