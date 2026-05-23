import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { FoodItemVO } from '../../../domain/entities/meal.entity';
import type { MealAnalysisPort } from '../../../domain/repositories/ai/meal-analysis.port';
import type { NoteTaggingPort, NoteTaggingResult } from '../../../domain/repositories/ai/note-tagging.port';
import type { AnalysisPort, AnalysisContext, AnalysisResult } from '../../../domain/repositories/ai/analysis.port';
import type { ReportPort, ReportData } from '../../../domain/repositories/ai/report.port';
import type { CoachMessage, CoachContext, CoachPort } from '../../../domain/repositories/ai/coach.port';
import { LocalSettingsAdapter } from '../../storage/local-settings.adapter';
import { AnthropicClient } from './anthropic.client';
import { MEAL_PHOTO_PROMPT } from './prompts/meal-photo.prompt';
import { MEAL_TEXT_PROMPT } from './prompts/meal-text.prompt';
import { NOTE_TAGGING_PROMPT } from './prompts/note-tagging.prompt';
import { ANALYSIS_PROMPT } from './prompts/analysis.prompt';
import { REPORT_SUMMARY_PROMPT } from './prompts/report-summary.prompt';
import { COACH_SYSTEM_PROMPT } from './prompts/coach-system.prompt';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Modèle par défaut pour les analyses et conversations. */
const MODEL_DEFAULT = 'claude-sonnet-4-6';
/** Modèle léger pour les tâches simples (taguage, extraction). */
const MODEL_FAST = 'claude-haiku-4-5-20251001';

/** Réponse brute de l'API Anthropic Messages (non-streaming). */
interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

/**
 * Adapter IA principal — implémente tous les ports via l'API Anthropic.
 *
 * @remarks
 * Respecte LSP : substituable à NullAIAdapter dans n'importe quel use case.
 * Single Responsibility : les prompts sont externalisés dans /prompts/,
 * la construction HTTP dans AnthropicClient.
 * La clé API est lue via LocalSettingsAdapter.getApiKey() à chaque appel
 * — jamais stockée en propriété de classe.
 * Retourne null en cas d'erreur réseau ou JSON invalide — jamais throw.
 * sendMessage() utilise fetch (SSE natif) car HttpClient ne supporte pas
 * le streaming.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: AnthropicAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AnthropicAdapter implements MealAnalysisPort, NoteTaggingPort, AnalysisPort, ReportPort, CoachPort {
  private readonly settings = inject(LocalSettingsAdapter);
  private readonly client: AnthropicClient;

  constructor(http: HttpClient) {
    this.client = new AnthropicClient(http);
  }

  // --- MealAnalysisPort ---

  /**
   * Analyse une photo de repas via vision Anthropic.
   *
   * @param base64Image - Image encodée en base64
   * @param mediaType - Type MIME de l'image
   * @returns FoodItemVO[] ou null si IA indisponible
   */
  async analyzeMealPhoto(base64Image: string, mediaType: string): Promise<FoodItemVO[] | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const payload = {
      model: MODEL_DEFAULT,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            { type: 'text', text: MEAL_PHOTO_PROMPT },
          ],
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.client.post<AnthropicResponse>(payload, apiKey),
      );
      if (!response) return null;
      return this.parseFoodItems(response.content[0]?.text ?? '');
    } catch {
      return null;
    }
  }

  /**
   * Extrait les aliments depuis une description textuelle.
   *
   * @param text - Description du repas
   * @returns FoodItemVO[] ou null si IA indisponible
   */
  async extractMealFromText(text: string): Promise<FoodItemVO[] | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const prompt = MEAL_TEXT_PROMPT.replace('{{MEAL_TEXT}}', text);
    const response = await this.callApi(MODEL_FAST, prompt, apiKey);
    if (response === null) return null;
    return this.parseFoodItems(response);
  }

  // --- NoteTaggingPort ---

  /**
   * Génère des tags et un résumé pour une note.
   *
   * @param content - Contenu de la note
   * @returns NoteTaggingResult ou null si IA indisponible
   */
  async tagNote(content: string): Promise<NoteTaggingResult | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const prompt = NOTE_TAGGING_PROMPT.replace('{{NOTE_CONTENT}}', content);
    const text = await this.callApi(MODEL_FAST, prompt, apiKey);
    if (text === null) return null;

    try {
      const parsed = JSON.parse(text) as { tags: string[]; summary: string };
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    } catch {
      return null;
    }
  }

  // --- AnalysisPort ---

  /**
   * Analyse les données de santé et retourne des insights.
   *
   * @param context - Données agrégées sur la fenêtre temporelle
   * @returns AnalysisResult ou null si IA indisponible
   */
  async analyzeData(context: AnalysisContext): Promise<AnalysisResult | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const contextData = JSON.stringify({
      symptoms: context.symptomsJson,
      meals: context.mealsJson,
      intakes: context.intakesJson,
      conditions: context.userConditions,
      protocol: context.protocol,
    });

    const prompt = ANALYSIS_PROMPT
      .replace('{{WINDOW_DAYS}}', String(context.windowDays))
      .replace('{{CONTEXT_DATA}}', contextData);

    const text = await this.callApi(MODEL_DEFAULT, prompt, apiKey);
    if (text === null) return null;

    try {
      const parsed = JSON.parse(text) as { insights: AnalysisResult['insights'] };
      return {
        available: true,
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        analyzedAt: new Date(),
        windowDays: context.windowDays,
      };
    } catch {
      return null;
    }
  }

  // --- ReportPort ---

  /**
   * Génère une synthèse narrative du rapport médical.
   *
   * @param data - Données du rapport
   * @returns Synthèse markdown ou null si IA indisponible
   */
  async generateReportSummary(data: ReportData): Promise<string | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const reportData = JSON.stringify({
      sections: data.sections,
      windowDays: data.windowDays,
      conditions: data.userConditions,
    });

    const prompt = REPORT_SUMMARY_PROMPT.replace('{{REPORT_DATA}}', reportData);
    return this.callApi(MODEL_DEFAULT, prompt, apiKey);
  }

  // --- CoachPort ---

  /**
   * Stream la réponse du coach token par token via SSE.
   *
   * @param message - Message de l'utilisateur
   * @param history - Historique de la session courante
   * @param context - Contexte de données de santé
   * @returns AsyncIterable<string> — itérable vide si IA indisponible
   */
  async *sendMessage(
    message: string,
    history: readonly CoachMessage[],
    context: CoachContext,
  ): AsyncIterable<string> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return;

    const systemPrompt = COACH_SYSTEM_PROMPT
      .replace('{{CONDITIONS}}', context.userConditions.join(', ') || 'Non renseigné')
      .replace('{{PROTOCOL}}', context.protocol || 'Non renseigné')
      .replace('{{TREATMENTS}}', context.activeTreatments.join(', ') || 'Aucun')
      .replace('{{PREVIOUS_SESSION_SUMMARY}}', context.previousSessionSummary ?? 'Première session')
      .replace('{{CONTEXT_DATA}}', context.healthDataJson ?? 'Aucune donnée disponible');

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_DEFAULT,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
          stream: true,
        }),
      });
    } catch {
      return;
    }

    if (!response.ok || !response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const event = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text: string };
            };
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              yield event.delta.text;
            }
          } catch {
            // ligne SSE malformée — on ignore et on continue
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Génère un résumé condensé de la session.
   *
   * @param messages - Tous les messages de la session
   * @returns Résumé textuel ou null si IA indisponible
   */
  async summarizeSession(messages: readonly CoachMessage[]): Promise<string | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Patient' : 'Coach'} : ${m.content}`)
      .join('\n\n');

    const prompt = `Résume cette session de coaching santé en 3-5 phrases, en capturant les points clés abordés, les symptômes mentionnés et les recommandations données. Ce résumé sera utilisé comme contexte pour la prochaine session.\n\nTranscription :\n${transcript}`;

    return this.callApi(MODEL_FAST, prompt, apiKey);
  }

  // --- Helpers privés ---

  /**
   * Appel API Anthropic simplifié pour les requêtes texte → texte.
   * Retourne null si la clé est absente, si le réseau échoue, ou si la réponse est vide.
   */
  private async callApi(model: string, userMessage: string, apiKey: string): Promise<string | null> {
    const payload = {
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
    };

    try {
      const response = await firstValueFrom(
        this.client.post<AnthropicResponse>(payload, apiKey),
      );
      if (!response) return null;
      const text = response.content[0]?.text?.trim() ?? '';
      return text || null;
    } catch {
      return null;
    }
  }

  /**
   * Parse une réponse JSON contenant un tableau de FoodItemVO.
   * Retourne [] si le JSON est invalide — jamais throw.
   */
  private parseFoodItems(text: string): FoodItemVO[] {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];
      return parsed as FoodItemVO[];
    } catch {
      return [];
    }
  }
}
