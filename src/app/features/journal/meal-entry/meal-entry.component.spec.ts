import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MealEntryComponent } from './meal-entry.component';
import { MealService } from '../services/meal.service';
import { ErrorNotificationService } from '../../../core/services/error-notification.service';
import type { AiFodmapAlert, FoodItemVO } from '../../../core/models/entities/meal.entity';
import type { MealAnalysisResult } from '../../../core/services/ai.service';
import type { PhotoSelectedEvent } from '../../../shared/components/photo-input/photo-input.component';

const mockItems: FoodItemVO[] = [
  { name: 'Riz blanc', fodmap: { level: 'low' }, confirmed: false },
  { name: 'Poulet grillé', fodmap: { level: 'low' }, confirmed: false },
];
const mockFlags: AiFodmapAlert[] = [
  { item: 'Oignon', reason: 'Riche en fructanes, risque de fermentation (SIBO)', severity: 'danger' },
];

const mockResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: [] };
const mockResultWithFlags: MealAnalysisResult = { items: mockItems, aiFodmapFlags: mockFlags };
const emptyResult: MealAnalysisResult = { items: [], aiFodmapFlags: [] };

type ComponentPrivate = {
  onPhotoSelected(event: PhotoSelectedEvent): Promise<void>;
  onTranscript(text: string): Promise<void>;
  analyzeTextInput(): void;
  setMode(mode: string): void;
  phase: string;
  srcMode: string;
  proposedItems: FoodItemVO[];
  pendingAiFodmapFlags: AiFodmapAlert[];
  textInput: string;
};

function makeMealServiceMock(
  photoResult: MealAnalysisResult = mockResult,
  textResult: MealAnalysisResult = emptyResult,
) {
  return {
    add: vi.fn().mockResolvedValue('meal-id'),
    edit: vi.fn().mockResolvedValue(undefined),
    analyzePhoto: vi.fn().mockResolvedValue(photoResult),
    extractFromText: vi.fn().mockResolvedValue(textResult),
    getFrequent: vi.fn().mockResolvedValue([]),
  };
}

async function createComponent(mockService = makeMealServiceMock()) {
  await TestBed.configureTestingModule({
    imports: [MealEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: MealService, useValue: mockService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(MealEntryComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, mockService };
}

describe('MealEntryComponent', () => {

  // ── Mode texte — flux complet ───────────────────────────────────────────

  describe('mode texte — saisie et analyse', () => {
    afterEach(() => history.replaceState({}, ''));

    it('affiche une zone de texte libre en mode texte (phase form)', async () => {
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const textarea = fixture.debugElement.query(By.css('[data-testid="meal-text-input"]'));
      expect(textarea).not.toBeNull();
    });

    it('affiche le bouton "Analyser" dès que la textarea n\'est pas vide', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      const textarea = fixture.debugElement.query(By.css('[data-testid="meal-text-input"]'));
      (textarea.nativeElement as HTMLTextAreaElement).value = 'Poulet riz';
      (textarea.nativeElement as HTMLTextAreaElement).dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const analyzeBtn = fixture.debugElement.query(By.css('[data-testid="analyze-meal"]'));
      expect(analyzeBtn).not.toBeNull();
      expect((analyzeBtn.nativeElement as HTMLButtonElement).getAttribute('aria-label'))
        .toBe('Analyser les aliments par IA');
      void comp; // satisfy linter
    });

    it('analyzeTextInput() appelle extractFromText avec le contenu de textInput', async () => {
      const textResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: [] };
      const mockService = makeMealServiceMock(mockResult, textResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'Riz blanc et poulet';

      comp.analyzeTextInput();
      await fixture.whenStable();

      expect(mockService.extractFromText).toHaveBeenCalledWith('Riz blanc et poulet');
    });

    it('passe en phase "validation" avec les aliments IA après analyzeTextInput()', async () => {
      const textResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: [] };
      const mockService = makeMealServiceMock(mockResult, textResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'Riz blanc et poulet';

      comp.analyzeTextInput();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(comp.phase).toBe('validation');
      expect(comp.proposedItems).toHaveLength(mockItems.length);
    });

    it('affiche les alertes FODMAP dans la phase validation après analyzeTextInput()', async () => {
      const textResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: mockFlags };
      const mockService = makeMealServiceMock(mockResult, textResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'Pâtes à l\'ail';

      comp.analyzeTextInput();
      await fixture.whenStable();
      fixture.detectChanges();

      const alerts = fixture.debugElement.queryAll(By.css('[data-testid="fodmap-alert"]'));
      expect(alerts).toHaveLength(mockFlags.length);
      expect(alerts[0].nativeElement.textContent).toContain(mockFlags[0].item);
      expect(alerts[0].nativeElement.textContent).toContain(mockFlags[0].reason);
    });

    it('passe en phase "empty" quand l\'IA ne reconnaît aucun aliment', async () => {
      const mockService = makeMealServiceMock(mockResult, emptyResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'xyzabc';

      comp.analyzeTextInput();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(comp.phase).toBe('empty');
    });

    it('submit() n\'appelle pas extractFromText (analyse séparée de l\'enregistrement)', async () => {
      const mockService = makeMealServiceMock();
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'Poulet rôti';

      await (fixture.componentInstance as unknown as { submit(): Promise<void> }).submit();

      expect(mockService.extractFromText).not.toHaveBeenCalled();
    });

    it('conserve textInput comme fallback si aucun aliment IA n\'est disponible', async () => {
      const mockService = makeMealServiceMock();
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.textInput = 'Poulet rôti';

      await (fixture.componentInstance as unknown as { submit(): Promise<void> }).submit();

      const callArg = mockService.add.mock.calls[0][0] as { items: FoodItemVO[] };
      expect(callArg.items[0].name).toBe('Poulet rôti');
    });
  });

  // ── Mode vocal — flux complet ───────────────────────────────────────────

  describe('mode vocal — analyse et validation', () => {
    it('passe en phase "validation" avec les aliments IA après transcription', async () => {
      const textResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: [] };
      const mockService = makeMealServiceMock(mockResult, textResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;

      await comp.onTranscript('Poulet et riz');
      fixture.detectChanges();

      expect(comp.phase).toBe('validation');
      expect(comp.proposedItems).toHaveLength(mockItems.length);
    });

    it('affiche les alertes FODMAP dans la validation après transcription vocale', async () => {
      const textResult: MealAnalysisResult = { items: mockItems, aiFodmapFlags: mockFlags };
      const mockService = makeMealServiceMock(mockResult, textResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;

      await comp.onTranscript('Soupe à l\'oignon');
      fixture.detectChanges();

      const alerts = fixture.debugElement.queryAll(By.css('[data-testid="fodmap-alert"]'));
      expect(alerts).toHaveLength(mockFlags.length);
      expect(alerts[0].nativeElement.textContent).toContain(mockFlags[0].item);
    });
  });

  // ── Mode photo — flux complet ───────────────────────────────────────────

  describe('mode photo — analyse et validation', () => {
    it('affiche les food chips dans la phase validation après analyse photo', async () => {
      const { fixture, mockService } = await createComponent(makeMealServiceMock(mockResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc123==', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      expect(comp.phase).toBe('validation');
      const chips = fixture.debugElement.queryAll(By.css('app-food-chip'));
      expect(chips).toHaveLength(mockItems.length);
      void mockService;
    });

    it('affiche les alertes FODMAP dans la validation après analyse photo', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(mockResultWithFlags));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const alerts = fixture.debugElement.queryAll(By.css('[data-testid="fodmap-alert"]'));
      expect(alerts).toHaveLength(mockFlags.length);
      expect(alerts[0].nativeElement.textContent).toContain(mockFlags[0].item);
      expect(alerts[0].nativeElement.textContent).toContain(mockFlags[0].reason);
    });

    it('n\'affiche pas la section alertes si fodmapAlerts est vide', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(mockResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const alerts = fixture.debugElement.queryAll(By.css('[data-testid="fodmap-alert"]'));
      expect(alerts).toHaveLength(0);
    });

    it('n\'affiche pas le bandeau ai-unavailable quand l\'IA retourne des aliments', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(mockResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc123==', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const unavailable = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(unavailable).toBeNull();
    });

    it('affiche data-testid="ai-unavailable" quand l\'IA retourne 0 aliment', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(emptyResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const unavailable = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(unavailable).not.toBeNull();
    });

    it('affiche le message exact de la bannière globale dans la zone inline', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(emptyResult));
      const notifService = TestBed.inject(ErrorNotificationService);
      notifService.showWarning('Cette photo montre un chat, pas un repas.');

      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const unavailable = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(unavailable.nativeElement.textContent).toContain('Cette photo montre un chat, pas un repas.');
    });

    it('transmet le base64 et le mediaType au service IA', async () => {
      const mockService = makeMealServiceMock(mockResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');

      await comp.onPhotoSelected({ base64: 'xyz==', mediaType: 'image/png' });

      expect(mockService.analyzePhoto).toHaveBeenCalledWith({
        base64Image: 'xyz==',
        mediaType: 'image/png',
      });
    });

    it('laisse le champ d\'ajout manuel accessible après l\'échec IA', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(emptyResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const addInput = fixture.debugElement.query(By.css('[data-testid="add-item-input"]'));
      expect(addInput).not.toBeNull();
      expect((addInput.nativeElement as HTMLInputElement).disabled).toBe(false);
    });

    it('n\'appelle pas extractFromText lors du submit en mode photo', async () => {
      const mockService = makeMealServiceMock(mockResult);
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      await comp.onPhotoSelected({ base64: 'abc123==', mediaType: 'image/jpeg' });
      mockService.extractFromText.mockClear();
      await (fixture.componentInstance as unknown as { submit(): Promise<void> }).submit();
      expect(mockService.extractFromText).not.toHaveBeenCalled();
    });
  });

  // ── Phase validation — bouton confirm ───────────────────────────────────

  describe('phase validation — bouton confirmer', () => {
    it('le bouton submit porte l\'aria-label "Confirmer et enregistrer le repas"', async () => {
      const { fixture } = await createComponent(makeMealServiceMock(mockResult));
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const btn = fixture.debugElement.query(By.css('[data-testid="submit-meal"]'));
      expect(btn).not.toBeNull();
      expect((btn.nativeElement as HTMLButtonElement).getAttribute('aria-label'))
        .toBe('Confirmer et enregistrer le repas');
    });
  });

  // ── Date du journal ─────────────────────────────────────────────────────

  describe('date du journal sélectionnée', () => {
    afterEach(() => history.replaceState({}, ''));

    function yesterday(): Date {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    it('occurredAt a le jour d\'hier avec l\'heure saisie quand journalDate = hier', async () => {
      const ref = yesterday();
      history.replaceState({ journalDate: ref.toISOString() }, '');
      const mockService = makeMealServiceMock();
      const { fixture } = await createComponent(mockService);
      const comp = fixture.componentInstance as unknown as {
        mealTime: string; textInput: string; submit(): Promise<void>;
      };
      comp.mealTime = '12:30';
      comp.textInput = 'Poulet grillé';
      await comp.submit();
      const callArg = mockService.add.mock.calls[0][0] as { occurredAt: Date };
      expect(callArg.occurredAt.getFullYear()).toBe(ref.getFullYear());
      expect(callArg.occurredAt.getMonth()).toBe(ref.getMonth());
      expect(callArg.occurredAt.getDate()).toBe(ref.getDate());
      expect(callArg.occurredAt.getHours()).toBe(12);
      expect(callArg.occurredAt.getMinutes()).toBe(30);
    });

    it('isRetrospective est vrai quand journalDate est antérieure à aujourd\'hui', async () => {
      history.replaceState({ journalDate: yesterday().toISOString() }, '');
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(true);
    });

    it('isRetrospective est faux par défaut (journalDate = aujourd\'hui)', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(false);
    });

    it('affiche data-testid="retrospective-banner" quand journalDate est antérieure', async () => {
      history.replaceState({ journalDate: yesterday().toISOString() }, '');
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).not.toBeNull();
    });

    it('n\'affiche pas data-testid="retrospective-banner" pour le jour courant', async () => {
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).toBeNull();
    });

    it('back() navigue vers /journal en conservant journalDate dans le state', async () => {
      const ref = yesterday();
      history.replaceState({ journalDate: ref.toISOString() }, '');
      const { fixture } = await createComponent();
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { back(): void }).back();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
      );
    });
  });

  // ── Type de repas par défaut ─────────────────────────────────────────────

  describe('type de repas par défaut selon l\'heure', () => {
    type CompWithDefault = { defaultMealType(now: Date): string };

    function at(h: number, min = 0): Date {
      const d = new Date();
      d.setHours(h, min, 0, 0);
      return d;
    }

    let comp: CompWithDefault;
    beforeEach(async () => {
      const { fixture } = await createComponent();
      comp = fixture.componentInstance as unknown as CompWithDefault;
    });

    it('retourne "breakfast" à 6h00', () => expect(comp.defaultMealType(at(6, 0))).toBe('breakfast'));
    it('retourne "breakfast" à 8h59', () => expect(comp.defaultMealType(at(8, 59))).toBe('breakfast'));
    it('retourne "snack" à 9h00 (juste après breakfast)', () => expect(comp.defaultMealType(at(9, 0))).toBe('snack'));
    it('retourne "snack" à 5h59 (avant breakfast)', () => expect(comp.defaultMealType(at(5, 59))).toBe('snack'));
    it('retourne "lunch" à 11h45', () => expect(comp.defaultMealType(at(11, 45))).toBe('lunch'));
    it('retourne "lunch" à 14h59', () => expect(comp.defaultMealType(at(14, 59))).toBe('lunch'));
    it('retourne "snack" à 11h44 (juste avant lunch)', () => expect(comp.defaultMealType(at(11, 44))).toBe('snack'));
    it('retourne "snack" à 15h00 (juste après lunch)', () => expect(comp.defaultMealType(at(15, 0))).toBe('snack'));
    it('retourne "dinner" à 19h00', () => expect(comp.defaultMealType(at(19, 0))).toBe('dinner'));
    it('retourne "dinner" à 20h59', () => expect(comp.defaultMealType(at(20, 59))).toBe('dinner'));
    it('retourne "snack" à 21h00 (après dinner)', () => expect(comp.defaultMealType(at(21, 0))).toBe('snack'));
    it('retourne "snack" à 10h00 (entre breakfast et lunch)', () => expect(comp.defaultMealType(at(10, 0))).toBe('snack'));
  });

  // ── Hors-ligne ───────────────────────────────────────────────────────────

  describe('mode photo — bouton désactivé si hors-ligne', () => {
    let fixture: ComponentFixture<MealEntryComponent>;
    let originalDescriptor: PropertyDescriptor | undefined;

    beforeEach(async () => {
      originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
      ({ fixture } = await createComponent(makeMealServiceMock(mockResult)));
    });

    afterEach(() => {
      if (originalDescriptor) {
        Object.defineProperty(navigator, 'onLine', originalDescriptor);
      } else {
        Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
      }
    });

    it('le bouton photo est désactivé quand navigator.onLine est false', () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      const photoInput = fixture.debugElement.query(By.css('app-photo-input'));
      expect(photoInput).not.toBeNull();
      const btn = photoInput.query(By.css('button'));
      expect((btn.nativeElement as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
