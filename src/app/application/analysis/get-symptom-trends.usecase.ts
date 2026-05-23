import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import { STORAGE_PORT } from '../tokens';

/**
 * Point de données agrégé pour un symptôme sur une journée.
 *
 * @remarks
 * Value Object retourné par GetSymptomTrendsUseCase. averageIntensity est
 * calculé sur toutes les saisies du même symptomKey dans la journée.
 */
export interface TrendData {
  readonly date: string;
  readonly symptomKey: string;
  readonly averageIntensity: number;
  readonly count: number;
}

/**
 * Agrège les saisies de symptômes par jour sur une fenêtre temporelle.
 *
 * @remarks
 * Respecte SRP : seul calcul de tendances symptômes, sans dépendance IA.
 * Fonctionne hors-ligne — lit uniquement depuis IndexedDB.
 * Mode dégradé : retourne [] si aucune donnée sur la fenêtre demandée.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetSymptomTrendsUseCase {
  private readonly storage = inject<StorageRepository<SymptomEntity>>(STORAGE_PORT as never);

  /**
   * Retourne les tendances agrégées par jour et par type de symptôme.
   *
   * @param windowDays - Nombre de jours à analyser en remontant depuis aujourd'hui
   * @param symptomKey - Si fourni, filtre sur ce symptôme uniquement
   * @returns Tableau de TrendData trié par date croissante
   */
  async execute(windowDays: number, symptomKey?: string): Promise<TrendData[]> {
    const now = new Date();
    const lower = new Date(now);
    lower.setDate(lower.getDate() - windowDays);
    lower.setHours(0, 0, 0, 0);

    const symptoms = await this.storage.getRange('symptoms', 'occurredAt', lower, now);

    const filtered = symptomKey
      ? symptoms.filter(s => s.symptomKey === symptomKey)
      : symptoms;

    const grouped = new Map<string, { total: number; count: number }>();

    for (const s of filtered) {
      const date = new Date(s.occurredAt).toISOString().slice(0, 10);
      const key = `${date}__${s.symptomKey}`;
      const existing = grouped.get(key) ?? { total: 0, count: 0 };
      grouped.set(key, { total: existing.total + s.intensity, count: existing.count + 1 });
    }

    const result: TrendData[] = [];
    for (const [key, agg] of grouped) {
      const [date, sKey] = key.split('__');
      result.push({
        date,
        symptomKey: sKey,
        averageIntensity: Math.round((agg.total / agg.count) * 10) / 10,
        count: agg.count,
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
}
