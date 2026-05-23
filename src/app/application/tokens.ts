import { InjectionToken } from '@angular/core';
import type { StorageRepository } from '../domain/repositories/storage.repository';
import type { LocalSettingsRepository } from '../domain/repositories/local-settings.repository';
import type { MealAnalysisPort } from '../domain/repositories/ai/meal-analysis.port';
import type { NoteTaggingPort } from '../domain/repositories/ai/note-tagging.port';
import type { AnalysisPort } from '../domain/repositories/ai/analysis.port';
import type { ReportPort } from '../domain/repositories/ai/report.port';
import type { CoachPort } from '../domain/repositories/ai/coach.port';

/**
 * Token d'injection pour le port de stockage générique.
 *
 * @remarks
 * Respecte DIP : les use cases dépendent de cette abstraction,
 * jamais de IndexedDBAdapter directement.
 * Injecter FakeStorageAdapter en test via `{ provide: STORAGE_PORT, useClass: Fake }`.
 */
export const STORAGE_PORT = new InjectionToken<StorageRepository<{ id: string }>>('STORAGE_PORT');

/**
 * Token d'injection pour le port d'analyse de repas par IA.
 *
 * @remarks
 * Injecte AnthropicAdapter en prod, NullAIAdapter si clé absente ou en test.
 */
export const MEAL_ANALYSIS_PORT = new InjectionToken<MealAnalysisPort>('MEAL_ANALYSIS_PORT');

/**
 * Token d'injection pour le port de tagging de notes par IA.
 *
 * @remarks
 * Injecte AnthropicAdapter en prod, NullAIAdapter si clé absente ou en test.
 */
export const NOTE_TAGGING_PORT = new InjectionToken<NoteTaggingPort>('NOTE_TAGGING_PORT');

/**
 * Token d'injection pour le port d'analyse globale par IA.
 *
 * @remarks
 * Injecte AnthropicAdapter en prod, NullAIAdapter si clé absente ou en test.
 */
export const ANALYSIS_PORT = new InjectionToken<AnalysisPort>('ANALYSIS_PORT');

/**
 * Token d'injection pour le port de génération de rapports par IA.
 *
 * @remarks
 * Injecte AnthropicAdapter en prod, NullAIAdapter si clé absente ou en test.
 */
export const REPORT_PORT = new InjectionToken<ReportPort>('REPORT_PORT');

/**
 * Token d'injection pour le port du coach conversationnel IA.
 *
 * @remarks
 * Injecte AnthropicAdapter en prod, NullAIAdapter si clé absente ou en test.
 * Le guard api-key.guard redirige vers /settings/api-key si clé absente.
 */
export const COACH_PORT = new InjectionToken<CoachPort>('COACH_PORT');

/**
 * Token d'injection pour le port des préférences utilisateur (localStorage).
 *
 * @remarks
 * Injecte LocalSettingsAdapter en prod et test. Ne contient pas getApiKey()
 * — la clé API circule uniquement dans la couche infrastructure.
 */
export const LOCAL_SETTINGS_PORT = new InjectionToken<LocalSettingsRepository>('LOCAL_SETTINGS_PORT');
