import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import type { CoachMessage, CoachContext } from '../../../core/services/ai.service';
import type { CoachMessageEntity, CoachContextWindow, SessionSummaryVO } from '../../../core/models/entities/coach-session.entity';
import type { MealEntity } from '../../../core/models/entities/meal.entity';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { UserProfileEntity } from '../../../core/models/entities/user-profile.entity';

export interface StoredCoachSession {
  readonly id: string;
  readonly contextWindow: CoachContextWindow;
  readonly messages: readonly CoachMessageEntity[];
  readonly summary?: SessionSummaryVO;
  readonly totalTokens: number;
  readonly startedAt: Date;
  readonly endedAt?: Date;
}

export interface StartCoachSessionResult {
  readonly sessionId: string;
  readonly contextWindow: CoachContextWindow;
  readonly previousSummary?: string;
}

export interface SendCoachMessageInput {
  readonly sessionId: string;
  readonly userMessage: string;
  readonly history: readonly CoachMessage[];
  readonly context: CoachContext;
}

@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly storage = inject(StorageService);
  private readonly ai = inject(AiService);

  async startSession(contextWindow: CoachContextWindow): Promise<StartCoachSessionResult> {
    const previousSummary = await this.loadPreviousSummary();

    const session: StoredCoachSession = {
      id: crypto.randomUUID(),
      contextWindow,
      messages: [],
      totalTokens: 0,
      startedAt: new Date(),
    };

    await this.storage.save('coach-sessions', session);

    return { sessionId: session.id, contextWindow, previousSummary };
  }

  async *sendMessage(input: SendCoachMessageInput): AsyncGenerator<string> {
    const session = await this.storage.get('coach-sessions', input.sessionId) as StoredCoachSession | undefined;
    if (!session) return;

    const userMsg: CoachMessageEntity = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      role: 'user',
      content: input.userMessage,
      tokenCount: Math.ceil(input.userMessage.length / 4),
      createdAt: new Date(),
    };

    const sessionWithUser: StoredCoachSession = {
      ...session,
      messages: [...session.messages, userMsg],
    };
    await this.storage.save('coach-sessions', sessionWithUser);

    const stream = this.ai.sendMessage(input.userMessage, input.history, input.context);
    let fullResponse = '';

    for await (const token of stream) {
      fullResponse += token;
      yield token;
    }

    const assistantMsg: CoachMessageEntity = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      role: 'assistant',
      content: fullResponse,
      tokenCount: Math.ceil(fullResponse.length / 4),
      createdAt: new Date(),
    };

    await this.storage.save('coach-sessions', {
      ...sessionWithUser,
      messages: [...sessionWithUser.messages, assistantMsg],
      totalTokens: session.totalTokens + userMsg.tokenCount + assistantMsg.tokenCount,
    });
  }

  async summarizeSession(sessionId: string): Promise<string | null> {
    const session = await this.storage.get('coach-sessions', sessionId) as StoredCoachSession | undefined;
    if (!session) return null;

    const history: CoachMessage[] = session.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const summaryText = await this.ai.summarizeSession(history);

    const summary: SessionSummaryVO | undefined = summaryText
      ? {
          content: summaryText,
          generatedAt: new Date(),
          tokenCount: Math.ceil(summaryText.length / 4),
        }
      : undefined;

    await this.storage.save('coach-sessions', {
      ...session,
      summary,
      endedAt: new Date(),
    });

    return summaryText;
  }

  async buildContext(contextWindow: CoachContextWindow): Promise<CoachContext> {
    const profiles = await this.storage.getAll('user-profile') as UserProfileEntity[];
    const profile = profiles[0];

    const allTreatments = await this.storage.getAll('treatments') as TreatmentEntity[];
    const activeTreatments = allTreatments.filter(t => t.active).map(t => t.name);

    let healthDataJson: string | undefined;
    if (contextWindow !== 'profile_only') {
      const [from, to] = this.windowToRange(contextWindow);
      const meals = await this.storage.getRange('meals', 'occurredAt', from, to) as MealEntity[];
      const symptoms = await this.storage.getRange('symptoms', 'occurredAt', from, to) as SymptomEntity[];

      healthDataJson = JSON.stringify({
        meals: meals.map(m => ({
          date: new Date(m.occurredAt).toISOString().slice(0, 10),
          type: m.type,
          items: m.items.map(i => `${i.name}${i.quantity ? ' ' + i.quantity + (i.unit ?? '') : ''}`),
          fodmapLevels: [...new Set(m.items.map(i => i.fodmap.level))],
          notes: m.notes,
        })),
        symptoms: symptoms.map(s => ({
          date: new Date(s.occurredAt).toISOString().slice(0, 10),
          symptom: s.symptomKey,
          intensity: s.intensity,
          notes: s.notes,
        })),
      });
    }

    return {
      contextWindow,
      userConditions: profile?.conditions ?? [],
      otherConditions: profile?.otherConditions,
      protocol: profile?.protocol ?? 'none',
      activeTreatments,
      healthDataJson,
      profileContext: this.buildProfileContext(profile),
    };
  }

  async getHistory(): Promise<StoredCoachSession[]> {
    const sessions = await this.storage.getAll<StoredCoachSession>('coach-sessions');
    return [...sessions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  async deleteAllHistory(): Promise<void> {
    await this.storage.clear('coach-sessions');
  }

  private async loadPreviousSummary(): Promise<string | undefined> {
    const allSessions = await this.storage.getAll<StoredCoachSession>('coach-sessions');
    const withSummary = allSessions
      .filter(s => s.summary !== undefined)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return withSummary[0]?.summary?.content;
  }

  private buildProfileContext(profile: UserProfileEntity | undefined): string | undefined {
    if (!profile) return undefined;
    const parts: string[] = [];
    if (profile.diagnosedAt) parts.push(`Diagnostic : ${new Date(profile.diagnosedAt).toLocaleDateString('fr-FR')}`);
    if (profile.referringDoctor) parts.push(`Médecin référent : ${profile.referringDoctor}`);
    if (profile.otherConditions) parts.push(`Autres conditions : ${profile.otherConditions}`);
    if (profile.allergies) parts.push(`Allergies : ${profile.allergies}`);
    if (profile.dietaryRestrictions) parts.push(`Restrictions alimentaires : ${profile.dietaryRestrictions}`);
    return parts.length > 0 ? parts.join('\n') : undefined;
  }

  private windowToRange(window: Exclude<CoachContextWindow, 'profile_only'>): [Date, Date] {
    const to = new Date();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const daysBack: Record<Exclude<CoachContextWindow, 'profile_only'>, number> = {
      today: 0,
      '7d': 7,
      '14d': 14,
      '30d': 30,
    };
    from.setDate(from.getDate() - daysBack[window]);
    return [from, to];
  }
}
