import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import type { MealEntity, MealType, MealInputMode, FoodItemVO, AiFodmapAlert } from '../../../core/models/entities/meal.entity';
import type { MealAnalysisResult } from '../../../core/services/ai.service';
import type { UserProfileEntity, MealProfileContext } from '../../../core/models/entities/user-profile.entity';

export interface AddMealInput {
  readonly occurredAt: Date;
  readonly type: MealType;
  readonly inputMode: MealInputMode;
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly notes?: string;
  readonly aiFodmapFlags?: ReadonlyArray<AiFodmapAlert>;
}

export interface EditMealInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly type: MealType;
  readonly inputMode: MealInputMode;
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly notes?: string;
  readonly aiFodmapFlags?: ReadonlyArray<AiFodmapAlert>;
}

export interface AnalyzeMealPhotoInput {
  readonly base64Image: string;
  readonly mediaType: string;
}

const EMPTY_MEAL_RESULT: MealAnalysisResult = { items: [], aiFodmapFlags: [] };

@Injectable({ providedIn: 'root' })
export class MealService {
  private readonly storage = inject(StorageService);
  private readonly ai = inject(AiService);

  async add(input: AddMealInput): Promise<string> {
    const meal: MealEntity = {
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt,
      createdAt: new Date(),
      type: input.type,
      inputMode: input.inputMode,
      items: input.items,
      notes: input.notes,
      aiFodmapFlags: input.aiFodmapFlags,
    };
    return this.storage.save('meals', meal);
  }

  async edit(input: EditMealInput): Promise<void> {
    const existing = await this.storage.get<MealEntity>('meals', input.id);
    if (!existing) return;
    const updated: MealEntity = {
      ...existing,
      occurredAt: input.occurredAt,
      type: input.type,
      inputMode: input.inputMode,
      items: input.items,
      notes: input.notes,
      aiFodmapFlags: input.aiFodmapFlags,
      editedAt: new Date(),
    };
    await this.storage.save('meals', updated);
  }

  async analyzePhoto(input: AnalyzeMealPhotoInput): Promise<MealAnalysisResult> {
    const ctx = await this.loadProfileContext();
    const result = await this.ai.analyzeMealPhoto(input.base64Image, input.mediaType, ctx);
    return this.markAnalyzed(result);
  }

  async extractFromText(text: string): Promise<MealAnalysisResult> {
    const ctx = await this.loadProfileContext();
    const result = await this.ai.extractMealFromText(text, ctx);
    return this.markAnalyzed(result);
  }

  /**
   * Marque comme analysés tous les aliments issus de l'IA.
   *
   * @remarks
   * Tout aliment renvoyé par l'analyse a, par définition, été soumis à l'IA — même si
   * son niveau FODMAP reste 'unknown'. Le flag analyzed évite de le re-proposer à l'analyse.
   *
   * @param result - Résultat IA, ou null si l'IA est indisponible
   * @returns Résultat avec items marqués analyzed:true, ou résultat vide si null
   */
  private markAnalyzed(result: MealAnalysisResult | null): MealAnalysisResult {
    if (!result) return EMPTY_MEAL_RESULT;
    return {
      items: result.items.map(item => ({ ...item, analyzed: true })),
      aiFodmapFlags: result.aiFodmapFlags,
    };
  }

  private async loadProfileContext(): Promise<MealProfileContext> {
    const profile = await this.storage.get<UserProfileEntity>('user-profile', 'singleton');
    return {
      conditions: profile?.conditions ?? [],
      protocol: profile?.protocol ?? 'none',
      allergies: profile?.allergies,
      dietaryRestrictions: profile?.dietaryRestrictions,
      otherConditions: profile?.otherConditions,
    };
  }

  async getFrequent(limit = 20): Promise<FoodItemVO[]> {
    const meals = await this.storage.getAll('meals') as MealEntity[];
    const frequency = new Map<string, { item: FoodItemVO; count: number }>();

    for (const meal of meals) {
      for (const item of meal.items) {
        if (!item.confirmed) continue;
        const existing = frequency.get(item.name);
        if (existing) {
          existing.count++;
        } else {
          frequency.set(item.name, { item, count: 1 });
        }
      }
    }

    return Array.from(frequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(e => e.item);
  }
}
