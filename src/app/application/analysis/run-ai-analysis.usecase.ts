import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { AnalysisPort, AnalysisResult, InsightVO } from '../../domain/repositories/ai/analysis.port';
import type { LocalSettingsRepository } from '../../domain/repositories/local-settings.repository';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { IntakeEntity } from '../../domain/entities/intake.entity';
import type { UserProfileEntity } from '../../domain/entities/user-profile.entity';
import { STORAGE_PORT, ANALYSIS_PORT, LOCAL_SETTINGS_PORT } from '../tokens';

/** Résultat d'analyse persisté en store IndexedDB 'insights'. */
export interface StoredAnalysisResult {
  readonly id: string;
  readonly available: boolean;
  readonly insights: readonly InsightVO[];
  readonly analyzedAt: Date;
  readonly windowDays: number;
}

const DEGRADED_RESULT: AnalysisResult = { available: false, insights: [] };

/**
 * Orchestre l'analyse IA des données de santé sur une fenêtre temporelle.
 *
 * @remarks
 * Respecte SRP : construction du contexte + appel IA + persistance du résultat.
 * Mode dégradé : retourne `{ available: false, insights: [] }` si AnalysisPort
 * retourne null — jamais throw vers la présentation.
 * Persiste le résultat dans le store 'insights' même en mode dégradé.
 * Met à jour lastAnalysisDate dans LocalSettings après chaque exécution.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [
 *   { provide: ANALYSIS_PORT, useClass: NullAIAdapter },
 *   { provide: STORAGE_PORT, useValue: mockStorage },
 *   { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class RunAiAnalysisUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);
  private readonly analysisPort = inject<AnalysisPort>(ANALYSIS_PORT as never);
  private readonly settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);

  /**
   * Lance l'analyse IA sur la fenêtre donnée et persiste le résultat.
   *
   * @param windowDays - Nombre de jours à analyser en remontant depuis aujourd'hui
   * @returns AnalysisResult — available: false en mode dégradé
   */
  async execute(windowDays: number): Promise<AnalysisResult> {
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

    const result = await this.analysisPort.analyzeData(context) ?? DEGRADED_RESULT;

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
}
