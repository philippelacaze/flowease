import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { FoodItemVO, AiFodmapAlert } from '../../core/models/entities/meal.entity';
import type { CoachContextWindow } from '../../core/models/entities/coach-session.entity';
import type { ReportSection } from '../../core/models/entities/report.entity';
import { LocalSettingsService } from '../../core/services/local-settings.service';
import { ErrorNotificationService } from './error-notification.service';
import { AnthropicClient } from '../../core/services/ai/anthropic/anthropic.client';
import { buildMealPhotoPrompt } from '../../core/services/ai/anthropic/prompts/meal-photo.prompt';
import { buildMealTextPrompt } from '../../core/services/ai/anthropic/prompts/meal-text.prompt';
import type { MealProfileContext } from '../../core/models/entities/user-profile.entity';
import { NOTE_TAGGING_PROMPT } from '../../core/services/ai/anthropic/prompts/note-tagging.prompt';
import { ANALYSIS_PROMPT } from '../../core/services/ai/anthropic/prompts/analysis.prompt';
import { REPORT_SUMMARY_PROMPT } from '../../core/services/ai/anthropic/prompts/report-summary.prompt';
import { COACH_SYSTEM_PROMPT } from '../../core/services/ai/anthropic/prompts/coach-system.prompt';

// --- Types (anciennement dans les fichiers de ports) ---

export type { MealProfileContext };

export interface MealAnalysisResult {
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly aiFodmapFlags: ReadonlyArray<AiFodmapAlert>;
}

export interface NoteTaggingResult {
  readonly tags: readonly string[];
  readonly summary: string;
}

export interface AnalysisContext {
  readonly windowDays: number;
  readonly symptomsJson: string;
  readonly mealsJson: string;
  readonly intakesJson: string;
  readonly userConditions: readonly string[];
  readonly protocol: string;
  readonly curesJson?: string;
}

export type InsightType =
  | 'correlation'
  | 'pattern'
  | 'alert'
  | 'recommendation'
  | 'cureComparison';

export interface CureComparisonPeriodVO {
  readonly label: string;
  readonly avgWellbeing: number | null;
  readonly avgSymptomIntensity: number | null;
}

export interface InsightVO {
  readonly type: InsightType;
  readonly title: string;
  readonly description: string;
  readonly confidence: number;
  readonly relatedEntries?: readonly string[];
  readonly comparisonPeriods?: ReadonlyArray<CureComparisonPeriodVO>;
}

export interface AnalysisResult {
  readonly available: boolean;
  readonly insights: readonly InsightVO[];
  readonly analyzedAt?: Date;
  readonly windowDays?: number;
}

export interface ReportData {
  readonly sections: readonly ReportSection[];
  readonly windowDays: number;
  readonly userConditions: readonly string[];
}

export interface CoachMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface CoachContext {
  readonly contextWindow: CoachContextWindow;
  readonly userConditions: readonly string[];
  readonly protocol: string;
  readonly activeTreatments: readonly string[];
  readonly previousSessionSummary?: string;
  readonly healthDataJson?: string;
  readonly profileContext?: string;
}

// --- Service ---

const EMPTY_PROFILE_CTX: MealProfileContext = { conditions: [], protocol: 'none' };

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const MODEL_DEFAULT = 'claude-haiku-4-5-20251001';
const MODEL_FAST = 'claude-haiku-4-5-20251001';

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly settings = inject(LocalSettingsService);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly client: AnthropicClient;

  constructor(http: HttpClient) {
    this.client = new AnthropicClient(http);
  }

  async analyzeMealPhoto(base64Image: string, mediaType: string, ctx: MealProfileContext = EMPTY_PROFILE_CTX): Promise<MealAnalysisResult | null> {
    const apiKey = this.requireApiKey();
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
            { type: 'text', text: buildMealPhotoPrompt(ctx) },
          ],
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.client.post<AnthropicResponse>(payload, apiKey),
      );
      if (!response) return null;

      const rawText = response.content[0]?.text ?? '';
      const { json, explanation } = this.extractJsonBlock(rawText);
      const result = this.parseMealAnalysisResult(json);

      if (result === null) {
        console.error('[AiService] analyzeMealPhoto: réponse JSON invalide');
        this.errorNotification.show('Réponse IA illisible — réessayez');
        return null;
      }
      if (result.items.length === 0) {
        this.errorNotification.showWarning(
          explanation ?? 'Aucun aliment identifié dans cette image.',
        );
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[AiService] analyzeMealPhoto:', msg);
      this.errorNotification.show(msg);
      return null;
    }
  }

  async extractMealFromText(text: string, ctx: MealProfileContext = EMPTY_PROFILE_CTX): Promise<MealAnalysisResult | null> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return null;

    const prompt = buildMealTextPrompt(ctx, text);
    const response = await this.callApi(MODEL_FAST, prompt, apiKey);
    if (response === null) return null;

    const { json, explanation } = this.extractJsonBlock(response);
    const result = this.parseMealAnalysisResult(json);
    if (result === null) {
      this.errorNotification.show('Réponse IA illisible — réessayez');
      return null;
    }
    if (result.items.length === 0) {
      this.errorNotification.showWarning(
        explanation ?? 'Aucun aliment identifié dans ce texte.',
      );
    }
    return result;
  }

  async tagNote(content: string): Promise<NoteTaggingResult | null> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return null;

    const prompt = NOTE_TAGGING_PROMPT.replace('{{NOTE_CONTENT}}', content);
    const text = await this.callApi(MODEL_FAST, prompt, apiKey);
    if (text === null) return null;

    try {
      const parsed = JSON.parse(this.extractJsonBlock(text).json) as { tags: string[]; summary: string };
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        summary: parsed.summary ?? '',
      };
    } catch {
      return null;
    }
  }

  async analyzeData(context: AnalysisContext): Promise<AnalysisResult | null> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return null;

    const contextData = JSON.stringify({
      symptoms: context.symptomsJson,
      meals: context.mealsJson,
      intakes: context.intakesJson,
      ...(context.curesJson ? { cures: context.curesJson } : {}),
      conditions: context.userConditions,
      protocol: context.protocol,
    });

    const prompt = ANALYSIS_PROMPT
      .replace('{{WINDOW_DAYS}}', String(context.windowDays))
      .replace('{{CONTEXT_DATA}}', contextData);

    const text = await this.callApi(MODEL_DEFAULT, prompt, apiKey);
    if (text === null) return null;

    try {
      const parsed = JSON.parse(this.extractJsonBlock(text).json) as { insights: AnalysisResult['insights'] };
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

  async generateReportSummary(data: ReportData): Promise<string | null> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return null;

    const reportData = JSON.stringify({
      sections: data.sections,
      windowDays: data.windowDays,
      conditions: data.userConditions,
    });

    const prompt = REPORT_SUMMARY_PROMPT.replace('{{REPORT_DATA}}', reportData);
    return this.callApi(MODEL_DEFAULT, prompt, apiKey);
  }

  async *sendMessage(
    message: string,
    history: readonly CoachMessage[],
    context: CoachContext,
  ): AsyncIterable<string> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return;

    const medicalDetails = context.profileContext
      ? `\n${context.profileContext}\n`
      : '';
    const systemPrompt = COACH_SYSTEM_PROMPT
      .replace('{{CONDITIONS}}', context.userConditions.join(', ') || 'Non renseigné')
      .replace('{{PROTOCOL}}', context.protocol || 'Non renseigné')
      .replace('{{TREATMENTS}}', context.activeTreatments.join(', ') || 'Aucun')
      .replace('{{MEDICAL_DETAILS}}', medicalDetails)
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
          'anthropic-dangerous-direct-browser-access': 'true',
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
      this.errorNotification.show('Erreur réseau — vérifiez votre connexion internet');
      return;
    }

    if (response.status === 401) {
      const msg = 'Clé API invalide — vérifiez votre clé sur console.anthropic.com (401)';
      console.error('[AiService] sendMessage:', msg);
      this.errorNotification.show(msg);
      return;
    }
    if (response.status === 429) {
      const msg = 'Quota Anthropic dépassé — réessayez plus tard (429)';
      console.error('[AiService] sendMessage:', msg);
      this.errorNotification.show(msg);
      return;
    }
    if (!response.ok || !response.body) {
      const msg = `Erreur Anthropic ${response.status}`;
      console.error('[AiService] sendMessage:', msg);
      this.errorNotification.show(msg);
      return;
    }

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

  async summarizeSession(messages: readonly CoachMessage[]): Promise<string | null> {
    const apiKey = this.requireApiKey();
    if (!apiKey) return null;

    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Patient' : 'Coach'} : ${m.content}`)
      .join('\n\n');

    const prompt = `Résume cette session de coaching santé en 3-5 phrases, en capturant les points clés abordés, les symptômes mentionnés et les recommandations données. Ce résumé sera utilisé comme contexte pour la prochaine session.\n\nTranscription :\n${transcript}`;

    return this.callApi(MODEL_FAST, prompt, apiKey);
  }

  async testApiKey(apiKey: string): Promise<string | null> {
    try {
      await firstValueFrom(
        this.client.post<AnthropicResponse>(
          { model: MODEL_FAST, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] },
          apiKey,
        ),
      );
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur inconnue';
    }
  }

  private requireApiKey(): string | null {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) {
      this.errorNotification.showWarning(
        'Clé API Anthropic non configurée — rendez-vous dans Paramètres',
      );
    }
    return apiKey;
  }

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[AiService] callApi:', msg);
      this.errorNotification.show(msg);
      return null;
    }
  }

  private extractJsonBlock(text: string): { json: string; explanation: string | null } {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```([\s\S]*)/i);
    if (fenceMatch) {
      return {
        json: fenceMatch[1].trim(),
        explanation: fenceMatch[2].trim() || null,
      };
    }
    return { json: text.trim(), explanation: null };
  }

  private parseMealAnalysisResult(json: string): MealAnalysisResult | null {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) {
        return { items: parsed as FoodItemVO[], aiFodmapFlags: [] };
      }
      if (parsed !== null && typeof parsed === 'object' && 'items' in parsed) {
        const obj = parsed as { items: unknown; fodmapAlerts?: unknown };
        return {
          items: Array.isArray(obj.items) ? (obj.items as FoodItemVO[]) : [],
          aiFodmapFlags: Array.isArray(obj.fodmapAlerts) ? (obj.fodmapAlerts as AiFodmapAlert[]) : [],
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
