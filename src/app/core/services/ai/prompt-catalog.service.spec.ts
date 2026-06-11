import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PromptCatalogService } from './prompt-catalog.service';
import { StorageService } from '../storage.service';
import type { UserProfileEntity } from '../../models/entities/user-profile.entity';

interface TreatmentLike { name: string; active: boolean; }

function makeStorageMock(profile?: Partial<UserProfileEntity>, treatments: TreatmentLike[] = []) {
  return {
    get: vi.fn().mockResolvedValue(profile),
    getAll: vi.fn().mockResolvedValue(treatments),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function createService(profile?: Partial<UserProfileEntity>, treatments: TreatmentLike[] = []): PromptCatalogService {
  const storage = makeStorageMock(profile, treatments);
  TestBed.configureTestingModule({
    providers: [PromptCatalogService, { provide: StorageService, useValue: storage }],
  });
  return TestBed.inject(PromptCatalogService);
}

describe('PromptCatalogService', () => {
  describe('resolveAll', () => {
    it('retourne les 6 prompts IA dans l\'ordre d\'affichage', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      expect(result.map(p => p.id)).toEqual([
        'meal_photo',
        'meal_text',
        'note_tagging',
        'analysis',
        'report_summary',
        'coach_system',
      ]);
    });

    it('marque les prompts repas comme résolus et les autres comme patterns', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      const byId = new Map(result.map(p => [p.id, p]));
      expect(byId.get('meal_photo')?.resolved).toBe(true);
      expect(byId.get('meal_text')?.resolved).toBe(true);
      expect(byId.get('analysis')?.resolved).toBe(false);
      expect(byId.get('coach_system')?.resolved).toBe(false);
    });

    it('résout le prompt photo selon le profil médical (gastroparésie)', async () => {
      const svc = createService({ conditions: ['gastroparesis'], protocol: 'strict' });
      const result = await svc.resolveAll();
      const mealPhoto = result.find(p => p.id === 'meal_photo')!;
      expect(mealPhoto.text).toContain('gastroparésie');
      expect(mealPhoto.text).toContain('FODMAP strict');
    });

    it('utilise une persona générique quand aucune condition n\'est renseignée', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      const mealPhoto = result.find(p => p.id === 'meal_photo')!;
      expect(mealPhoto.text).toContain('nutritionniste expert en nutrition digestive');
    });

    it('expose les placeholders restants des patterns', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      expect(result.find(p => p.id === 'note_tagging')?.placeholders).toContain('{{NOTE_CONTENT}}');
      expect(result.find(p => p.id === 'analysis')?.placeholders).toEqual(
        expect.arrayContaining(['{{WINDOW_DAYS}}', '{{CONTEXT_DATA}}']),
      );
    });

    it('résout {{CONDITIONS}} dans les patterns selon le profil (plus de placeholder)', async () => {
      const svc = createService({ conditions: ['gastroparesis'], otherConditions: 'Endométriose' });
      const result = await svc.resolveAll();
      for (const id of ['analysis', 'report_summary', 'note_tagging', 'coach_system']) {
        const prompt = result.find(p => p.id === id)!;
        expect(prompt.placeholders).not.toContain('{{CONDITIONS}}');
        expect(prompt.text).toContain('gastroparésie');
        expect(prompt.text).toContain('Endométriose');
      }
    });

    it('ne code plus en dur « SIBO et gastroparésie » et emploie « micro-nutritionniste »', async () => {
      const svc = createService({ conditions: ['gerd'] });
      const result = await svc.resolveAll();
      const analysis = result.find(p => p.id === 'analysis')!;
      expect(analysis.text).toContain('micro-nutritionniste');
      expect(analysis.text).not.toContain('SIBO et gastroparésie');
      expect(analysis.text).toContain('RGO (reflux gastro-œsophagien)');
    });

    it('injecte les données issues des Paramètres (protocole, traitements, détails) dans le prompt Coach', async () => {
      const svc = createService(
        { conditions: ['gastroparesis'], protocol: 'strict', allergies: 'arachides', referringDoctor: 'Dr Martin' },
        [
          { name: 'Rifaximine', active: true },
          { name: 'Ancien traitement', active: false },
        ],
      );
      const result = await svc.resolveAll();
      const coach = result.find(p => p.id === 'coach_system')!;
      expect(coach.text).toContain('régime FODMAP strict');
      expect(coach.text).toContain('Rifaximine');
      expect(coach.text).not.toContain('Ancien traitement');
      expect(coach.text).toContain('Allergies : arachides');
      expect(coach.text).toContain('Médecin référent : Dr Martin');
      // Plus de placeholders issus des Paramètres…
      expect(coach.placeholders).not.toContain('{{PROTOCOL}}');
      expect(coach.placeholders).not.toContain('{{TREATMENTS}}');
      expect(coach.placeholders).not.toContain('{{MEDICAL_DETAILS}}');
      // …mais les données runtime restent en variables.
      expect(coach.placeholders).toEqual(
        expect.arrayContaining(['{{PREVIOUS_SESSION_SUMMARY}}', '{{CONTEXT_DATA}}']),
      );
    });

    it('emploie des valeurs de repli lisibles quand les Paramètres sont vides', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      const coach = result.find(p => p.id === 'coach_system')!;
      expect(coach.text).toContain('Protocole suivi : Non renseigné');
      expect(coach.text).toContain('Traitements actifs : Aucun');
    });

    it('injecte le placeholder de description utilisateur dans le prompt repas texte', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      const mealText = result.find(p => p.id === 'meal_text')!;
      expect(mealText.text).toContain('{{DESCRIPTION_UTILISATEUR}}');
      expect(mealText.placeholders).toContain('{{DESCRIPTION_UTILISATEUR}}');
    });

    it('tous les prompts ont un libellé, une description et un texte non vides', async () => {
      const svc = createService();
      const result = await svc.resolveAll();
      for (const prompt of result) {
        expect(prompt.label.length).toBeGreaterThan(0);
        expect(prompt.description.length).toBeGreaterThan(0);
        expect(prompt.text.length).toBeGreaterThan(0);
      }
    });
  });
});
