import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { ReportEntity, ReportFormat, ReportSection } from '../../domain/entities/report.entity';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { IntakeEntity } from '../../domain/entities/intake.entity';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { NoteEntity } from '../../domain/entities/note.entity';
import { STORAGE_PORT } from '../tokens';

/** Paramètres requis pour construire un rapport. */
export interface BuildReportInput {
  readonly windowDays: number;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly format: ReportFormat;
  readonly includedSections?: readonly string[];
}

const DEFAULT_SECTIONS = ['meals', 'symptoms', 'adherence', 'treatments', 'notes'];

/**
 * Construit un rapport médical depuis les données IndexedDB sans appel IA.
 *
 * @remarks
 * Respecte SRP : collecte et mise en forme des données uniquement.
 * La synthèse IA est déléguée à GenerateReportSummaryUseCase.
 * Fonctionne hors-ligne — lit uniquement depuis IndexedDB.
 * Persiste le rapport dans le store 'reports' et retourne l'entité créée.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class BuildReportUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);

  /**
   * Collecte les données de la fenêtre temporelle et construit le rapport.
   *
   * @param input - Paramètres de la fenêtre et du format
   * @returns ReportEntity persistée dans le store 'reports'
   */
  async execute(input: BuildReportInput): Promise<ReportEntity> {
    const { startDate, endDate, windowDays, format } = input;
    const included = new Set(input.includedSections ?? DEFAULT_SECTIONS);

    const [meals, symptoms, intakes, treatments, notes] = await Promise.all([
      this.storage.getRange('meals', 'occurredAt', startDate, endDate) as Promise<MealEntity[]>,
      this.storage.getRange('symptoms', 'occurredAt', startDate, endDate) as Promise<SymptomEntity[]>,
      this.storage.getRange('intakes', 'occurredAt', startDate, endDate) as Promise<IntakeEntity[]>,
      this.storage.getAll('treatments') as Promise<TreatmentEntity[]>,
      this.storage.getRange('notes', 'occurredAt', startDate, endDate) as Promise<NoteEntity[]>,
    ]);

    const sections: ReportSection[] = [
      {
        key: 'meals',
        title: 'Alimentation',
        content: this.buildMealsSection(meals),
        included: included.has('meals'),
      },
      {
        key: 'symptoms',
        title: 'Symptômes',
        content: this.buildSymptomsSection(symptoms),
        included: included.has('symptoms'),
      },
      {
        key: 'adherence',
        title: 'Observance des traitements',
        content: this.buildAdherenceSection(intakes, treatments),
        included: included.has('adherence'),
      },
      {
        key: 'treatments',
        title: 'Traitements actifs',
        content: this.buildTreatmentsSection(treatments),
        included: included.has('treatments'),
      },
      {
        key: 'notes',
        title: 'Notes libres',
        content: this.buildNotesSection(notes),
        included: included.has('notes'),
      },
    ];

    const report: ReportEntity = {
      id: crypto.randomUUID(),
      windowDays,
      startDate,
      endDate,
      format,
      sections,
      generatedAt: new Date(),
    };

    await this.storage.save('reports', report);
    return report;
  }

  private buildMealsSection(meals: MealEntity[]): string {
    if (meals.length === 0) return '_Aucun repas enregistré sur cette période._';
    const lines = meals.map(m => `- ${new Date(m.occurredAt).toLocaleDateString('fr-FR')} — ${m.type} (${m.items.length} aliment(s))`);
    return `**${meals.length} repas enregistrés**\n\n${lines.join('\n')}`;
  }

  private buildSymptomsSection(symptoms: SymptomEntity[]): string {
    if (symptoms.length === 0) return '_Aucun symptôme enregistré sur cette période._';
    const avg = (symptoms.reduce((sum, s) => sum + s.intensity, 0) / symptoms.length).toFixed(1);
    const lines = symptoms.map(s => `- ${new Date(s.occurredAt).toLocaleDateString('fr-FR')} — ${s.symptomKey} (intensité ${s.intensity}/10)`);
    return `**${symptoms.length} saisies — intensité moyenne ${avg}/10**\n\n${lines.join('\n')}`;
  }

  private buildAdherenceSection(intakes: IntakeEntity[], treatments: TreatmentEntity[]): string {
    if (treatments.length === 0) return '_Aucun traitement enregistré._';
    const lines = treatments
      .filter(t => t.active)
      .map(t => {
        const taken = intakes.filter(i => i.treatmentId === t.id && i.status === 'taken').length;
        return `- **${t.name}** : ${taken} prise(s)`;
      });
    return lines.length > 0 ? lines.join('\n') : '_Aucun traitement actif._';
  }

  private buildTreatmentsSection(treatments: TreatmentEntity[]): string {
    const active = treatments.filter(t => t.active);
    if (active.length === 0) return '_Aucun traitement actif._';
    return active.map(t => `- **${t.name}** (${t.dosage} ${t.unit}, ${t.frequency}×/j)`).join('\n');
  }

  private buildNotesSection(notes: NoteEntity[]): string {
    if (notes.length === 0) return '_Aucune note sur cette période._';
    return notes.map(n => `- ${new Date(n.occurredAt).toLocaleDateString('fr-FR')} — ${n.content.slice(0, 120)}${n.content.length > 120 ? '…' : ''}`).join('\n');
  }
}
