import { inject, Injectable } from '@angular/core';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { IntakeEntity } from '../../domain/entities/intake.entity';
import type { NoteEntity } from '../../domain/entities/note.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Entrée typée du journal d'une journée.
 *
 * @remarks
 * Union discriminée permettant au composant de switcher sur le type
 * sans cast ni instanceof.
 */
export type JournalEntry =
  | { readonly kind: 'meal'; readonly data: MealEntity }
  | { readonly kind: 'symptom'; readonly data: SymptomEntity }
  | { readonly kind: 'intake'; readonly data: IntakeEntity }
  | { readonly kind: 'note'; readonly data: NoteEntity };

/** Retourne le timestamp de référence pour le tri d'une entrée. */
function entryTime(entry: JournalEntry): number {
  if (entry.kind === 'intake') {
    return entry.data.confirmedAt.getTime();
  }
  return entry.data.occurredAt.getTime();
}

/**
 * Retourne toutes les entrées du journal pour un jour donné, triées par occurredAt.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'agréger les 4 stores pour une date.
 * Utilise getRange sur l'index 'occurredAt' (ou 'confirmedAt' pour les prises)
 * pour ne charger que les données du jour demandé.
 * Mode dégradé : aucune dépendance IA — retourne toujours les données locales.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetJournalDayUseCase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly storage = inject<StorageRepository<any>>(STORAGE_PORT as never);

  /**
   * Agrège les 4 stores du journal pour la date passée en paramètre.
   *
   * @param date - Le jour à charger (heure ignorée — plage minuit–23h59)
   * @returns Tableau de JournalEntry trié par timestamp de référence croissant
   */
  async execute(date: Date): Promise<JournalEntry[]> {
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
}
