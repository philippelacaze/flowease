import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MealEntryComponent } from './meal-entry.component';
import { AddMealUseCase } from '../../../../application/journal/add-meal.usecase';
import { AnalyzeMealPhotoUseCase } from '../../../../application/journal/analyze-meal-photo.usecase';
import { ExtractMealFromTextUseCase } from '../../../../application/journal/extract-meal-from-text.usecase';
import { GetFrequentFoodsUseCase } from '../../../../application/journal/get-frequent-foods.usecase';
import type { FoodItemVO } from '../../../../domain/entities/meal.entity';
import type { PhotoSelectedEvent } from '../../../shared/components/photo-input/photo-input.component';

const mockItems: FoodItemVO[] = [
  { name: 'Riz blanc', fodmap: { level: 'low' }, confirmed: false },
  { name: 'Poulet grillé', fodmap: { level: 'low' }, confirmed: false },
];

type ComponentPrivate = {
  onPhotoSelected(event: PhotoSelectedEvent): Promise<void>;
  setMode(mode: string): void;
  mode: string;
  proposedItems: FoodItemVO[];
  aiUnavailable: boolean;
};

function makeUseCaseMocks(analyzeMealPhotoResult: FoodItemVO[] = mockItems) {
  return {
    addMeal: { execute: vi.fn().mockResolvedValue('meal-id') },
    analyzeMealPhoto: { execute: vi.fn().mockResolvedValue(analyzeMealPhotoResult) },
    extractMealFromText: { execute: vi.fn().mockResolvedValue([]) },
    getFrequentFoods: { execute: vi.fn().mockResolvedValue([]) },
  };
}

async function createComponent(mocks: ReturnType<typeof makeUseCaseMocks>) {
  await TestBed.configureTestingModule({
    imports: [MealEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: AddMealUseCase, useValue: mocks.addMeal },
      { provide: AnalyzeMealPhotoUseCase, useValue: mocks.analyzeMealPhoto },
      { provide: ExtractMealFromTextUseCase, useValue: mocks.extractMealFromText },
      { provide: GetFrequentFoodsUseCase, useValue: mocks.getFrequentFoods },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(MealEntryComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('MealEntryComponent', () => {

  describe('mode photo — IA disponible', () => {
    let fixture: ComponentFixture<MealEntryComponent>;
    let mocks: ReturnType<typeof makeUseCaseMocks>;

    beforeEach(async () => {
      mocks = makeUseCaseMocks(mockItems);
      fixture = await createComponent(mocks);
    });

    it('affiche les food chips après une analyse photo réussie', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc123==', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const chips = fixture.debugElement.queryAll(By.css('app-food-chip'));
      expect(chips).toHaveLength(mockItems.length);
    });

    it('n\'affiche pas le bandeau ai-unavailable quand l\'IA retourne des aliments', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc123==', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const unavailable = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(unavailable).toBeNull();
    });

    it('transmet le base64 et le mediaType au use case d\'analyse', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');

      await comp.onPhotoSelected({ base64: 'xyz==', mediaType: 'image/png' });

      expect(mocks.analyzeMealPhoto.execute).toHaveBeenCalledWith({
        base64Image: 'xyz==',
        mediaType: 'image/png',
      });
    });
  });

  describe('mode photo — IA indisponible', () => {
    let fixture: ComponentFixture<MealEntryComponent>;

    beforeEach(async () => {
      const mocks = makeUseCaseMocks([]);
      fixture = await createComponent(mocks);
    });

    it('affiche data-testid="ai-unavailable" quand l\'IA retourne 0 aliment', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const unavailable = fixture.debugElement.query(By.css('[data-testid="ai-unavailable"]'));
      expect(unavailable).not.toBeNull();
    });

    it('laisse le champ d\'ajout manuel accessible après l\'échec IA', async () => {
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('photo');
      fixture.detectChanges();

      await comp.onPhotoSelected({ base64: 'abc', mediaType: 'image/jpeg' });
      fixture.detectChanges();

      const addInput = fixture.debugElement.query(By.css('[data-testid="add-item-input"]'));
      expect(addInput).not.toBeNull();
      expect((addInput.nativeElement as HTMLInputElement).disabled).toBe(false);
    });
  });

  describe('mode photo — bouton désactivé si hors-ligne', () => {
    let fixture: ComponentFixture<MealEntryComponent>;
    let originalDescriptor: PropertyDescriptor | undefined;

    beforeEach(async () => {
      originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });

      const mocks = makeUseCaseMocks();
      fixture = await createComponent(mocks);
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
