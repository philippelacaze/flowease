import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { CoachContextWindow } from '../../domain/entities/coach-session.entity';
import type { CoachContext } from '../../domain/repositories/ai/coach.port';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { UserProfileEntity } from '../../domain/entities/user-profile.entity';
import { STORAGE_PORT } from '../tokens';

/**
 * Construit le CoachContext complet à transmettre à l'IA pour une fenêtre choisie.
 *
 * @remarks
 * Respecte SRP : assemblage du contexte uniquement — pas d'appel IA ni de session.
 * Charge profil, traitements actifs et données de santé pour la fenêtre sélectionnée.
 * 'profile_only' ne charge aucune donnée journalière — healthDataJson reste absent.
 * Utilisé par CoachChatComponent après la fermeture du CoachContextPickerComponent.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BuildCoachContextUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);

  /**
   * Charge les données de santé pour la fenêtre et construit le CoachContext.
   *
   * @param contextWindow - Fenêtre sélectionnée dans CoachContextPickerComponent
   * @returns CoachContext prêt à être passé à SendCoachMessageUseCase
   */
  async execute(contextWindow: CoachContextWindow): Promise<CoachContext> {
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
      protocol: profile?.protocol ?? 'none',
      activeTreatments,
      healthDataJson,
      profileContext: this.buildProfileContext(profile),
    };
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
