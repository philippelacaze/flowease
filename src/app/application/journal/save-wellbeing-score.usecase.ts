import { inject, Injectable } from '@angular/core';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres pour enregistrer le score de bien-être d'une journée.
 *
 * @remarks
 * date identifie le jour cible (heure ignorée).
 * score est un entier de 1 à 10 correspondant à l'échelle de bien-être.
 */
export interface SaveWellbeingInput {
  readonly date: Date;
  readonly score: number;
}

/**
 * Persiste le score de bien-être journalier en garantissant une seule entrée par jour.
 *
 * @remarks
 * Respecte SRP : responsabilité unique — upsert du score de bien-être.
 * Si une entrée (category='wellbeing', symptomKey='wellbeing_score') existe déjà
 * pour la journée cible, son intensité est mise à jour sans créer de doublon.
 * Sinon, une nouvelle SymptomEntity est créée.
 * Cette entrée est lue par GetSymptomTrendsUseCase pour alimenter la heatmap mensuelle.
 * Mode dégradé : aucune dépendance IA — fonctionne toujours offline.
 */
@Injectable({ providedIn: 'root' })
export class SaveWellbeingScoreUseCase {
  private readonly storage = inject<StorageRepository<SymptomEntity>>(STORAGE_PORT as never);

  /**
   * Crée ou met à jour l'entrée de bien-être pour la journée indiquée.
   *
   * @param input - Date du jour et score 1–10
   * @returns UUID de l'entrée créée ou mise à jour
   */
  async execute(input: SaveWellbeingInput): Promise<string> {
    const dayStart = new Date(input.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(input.date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySymptoms = await this.storage.getRange('symptoms', 'occurredAt', dayStart, dayEnd);
    const existing = daySymptoms.find(s => s.symptomKey === 'wellbeing_score');

    const now = new Date();
    const symptom: SymptomEntity = existing
      ? { ...existing, intensity: input.score, occurredAt: now }
      : {
          id: crypto.randomUUID(),
          category: 'wellbeing',
          symptomKey: 'wellbeing_score',
          intensity: input.score,
          occurredAt: now,
          createdAt: now,
        };

    return this.storage.save('symptoms', symptom);
  }
}
