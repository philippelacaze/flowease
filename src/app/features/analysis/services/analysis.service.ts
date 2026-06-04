import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { AiService } from '../../../core/services/ai.service';
import type { AnalysisResult, InsightVO } from '../../../core/services/ai.service';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { MealEntity } from '../../../core/models/entities/meal.entity';
import type { IntakeEntity } from '../../../core/models/entities/intake.entity';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { UserProfileEntity } from '../../../core/models/entities/user-profile.entity';

export interface StoredAnalysisResult {
  readonly id: string;
  readonly available: boolean;
  readonly insights: readonly InsightVO[];
  readonly analyzedAt: Date;
  readonly windowDays: number;
}

export interface TrendData {
  readonly date: string;
  readonly symptomKey: string;
  readonly averageIntensity: number;
  readonly count: number;
}

export interface AdherenceStat {
  readonly treatmentId: string;
  readonly treatmentName: string;
  readonly takenCount: number;
  readonly expectedCount: number;
  readonly adherenceRate: number;
}

const DEGRADED_RESULT: AnalysisResult = { available: false, insights: [] };

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly storage = inject(StorageService);
  private readonly ai = inject(AiService);
  private readonly settings = inject(LocalSettingsService);

  async run(windowDays: number): Promise<AnalysisResult> {
    const now = new Date();
    const lower = new Date(now);
    lower.setDate(lower.getDate() - windowDays);
    lower.setHours(0, 0, 0, 0);

    const [symptoms, meals, intakes, cures] = await Promise.all([
      this.storage.getRange('symptoms', 'occurredAt', lower, now) as Promise<SymptomEntity[]>,
      this.storage.getRange('meals', 'occurredAt', lower, now) as Promise<MealEntity[]>,
      this.storage.getRange('intakes', 'occurredAt', lower, now) as Promise<IntakeEntity[]>,
      this.storage.getAll('cures') as Promise<{ id: string }[]>,
    ]);

    const userProfile = await this.storage.get('user-profile', 'singleton') as UserProfileEntity | undefined;

    const context = {
      windowDays,
      symptomsJson: JSON.stringify(symptoms),
      mealsJson: JSON.stringify(meals),
      intakesJson: JSON.stringify(intakes),
      curesJson: cures.length > 0 ? JSON.stringify(cures) : undefined,
      userConditions: userProfile?.conditions ?? [],
      protocol: userProfile?.protocol ?? 'none',
    };

    const result = await this.ai.analyzeData(context) ?? DEGRADED_RESULT;

    const stored: StoredAnalysisResult = {
      id: crypto.randomUUID(),
      available: result.available,
      insights: result.insights,
      analyzedAt: new Date(),
      windowDays,
    };
    await this.storage.save('insights', stored);
    this.settings.setLastAnalysisDate(new Date());

    return result;
  }

  async getInsights(limit = 10): Promise<StoredAnalysisResult[]> {
    const all = await this.storage.getAll('insights') as StoredAnalysisResult[];
    return all
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
      .slice(0, limit);
  }

  async getSymptomTrends(windowDays: number, symptomKey?: string): Promise<TrendData[]> {
    const now = new Date();
    const lower = new Date(now);
    lower.setDate(lower.getDate() - windowDays);
    lower.setHours(0, 0, 0, 0);

    const symptoms = await this.storage.getRange<SymptomEntity>('symptoms', 'occurredAt', lower, now);

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

  async getAdherenceStats(windowDays: number): Promise<AdherenceStat[]> {
    const now = new Date();
    const lower = new Date(now);
    lower.setDate(lower.getDate() - windowDays);
    lower.setHours(0, 0, 0, 0);

    const [allTreatments, intakesInWindow] = await Promise.all([
      this.storage.getAll('treatments') as Promise<TreatmentEntity[]>,
      this.storage.getRange('intakes', 'occurredAt', lower, now) as Promise<IntakeEntity[]>,
    ]);

    const activeTreatments = allTreatments.filter(t => t.active);

    return activeTreatments.map(treatment => {
      const taken = intakesInWindow.filter(
        i => i.treatmentId === treatment.id && i.status === 'taken',
      );
      const expectedCount = treatment.frequency * windowDays;
      const takenCount = taken.length;

      return {
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        takenCount,
        expectedCount,
        adherenceRate: expectedCount > 0 ? Math.min(takenCount / expectedCount, 1) : 0,
      };
    });
  }
}
