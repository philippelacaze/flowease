import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AddMealUseCase } from '../../../../application/journal/add-meal.usecase';
import { AnalyzeMealPhotoUseCase } from '../../../../application/journal/analyze-meal-photo.usecase';
import { ExtractMealFromTextUseCase } from '../../../../application/journal/extract-meal-from-text.usecase';
import { GetFrequentFoodsUseCase } from '../../../../application/journal/get-frequent-foods.usecase';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';
import {
  PhotoInputComponent,
  PhotoSelectedEvent,
} from '../../../shared/components/photo-input/photo-input.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import type { FoodItemVO, MealInputMode, MealType } from '../../../../domain/entities/meal.entity';

/**
 * Page de saisie d'un repas — 4 modes : texte, vocal, photo, récurrents.
 *
 * @remarks
 * Importe uniquement des use cases de la couche application.
 * data-testid="ai-unavailable" visible si l'analyse IA retourne 0 aliment.
 * data-testid="submit-meal" sur le bouton de validation pour les tests E2E.
 */
@Component({
  selector: 'app-meal-entry',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    VoiceInputComponent,
    PhotoInputComponent,
    FoodChipComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-entry.component.html',
  styleUrl: './meal-entry.component.scss',
})
export class MealEntryComponent implements OnInit {
  private readonly addMeal = inject(AddMealUseCase);
  private readonly analyzeMealPhoto = inject(AnalyzeMealPhotoUseCase);
  private readonly extractMealFromText = inject(ExtractMealFromTextUseCase);
  private readonly getFrequentFoods = inject(GetFrequentFoodsUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected mode: MealInputMode = 'text';
  protected mealType: MealType = 'lunch';
  protected mealTime = this.nowTime();
  protected textInput = '';
  protected newItemName = '';
  protected proposedItems: FoodItemVO[] = [];
  protected frequentFoods: FoodItemVO[] = [];
  protected analyzing = false;
  protected aiUnavailable = false;
  protected saving = false;

  protected readonly modeLabels: Record<MealInputMode, string> = {
    text: 'Texte — décrivez librement le repas',
    voice: 'Vocal — dictez le contenu du repas',
    photo: 'Photo — l\'IA identifie les aliments',
    recurring: 'Récurrents — aliments fréquents de l\'historique',
  };

  protected get canSubmit(): boolean {
    if (this.mode === 'text') {
      return this.textInput.trim().length > 0 || this.proposedItems.length > 0;
    }
    return this.proposedItems.length > 0;
  }

  ngOnInit(): void {
    void this.loadFrequentFoods();
    const state = history.state as { transcript?: string; photo?: { base64: string; mediaType: string } };
    if (state?.transcript) {
      this.mode = 'voice';
      void this.onTranscript(state.transcript);
    } else if (state?.photo) {
      this.mode = 'photo';
      void this.onPhotoSelected({ base64: state.photo.base64, mediaType: state.photo.mediaType });
    }
  }

  protected setMode(m: MealInputMode): void {
    this.mode = m;
    this.aiUnavailable = false;
    this.cdr.markForCheck();
  }

  protected async onTranscript(text: string): Promise<void> {
    if (!text.trim() || this.analyzing) return;
    this.analyzing = true;
    this.aiUnavailable = false;
    this.cdr.markForCheck();
    const items = await this.extractMealFromText.execute(text);
    this.proposedItems = [...this.proposedItems, ...items];
    this.aiUnavailable = items.length === 0;
    this.analyzing = false;
    this.cdr.markForCheck();
  }

  protected async onPhotoSelected(event: PhotoSelectedEvent): Promise<void> {
    this.analyzing = true;
    this.aiUnavailable = false;
    this.cdr.markForCheck();
    const items = await this.analyzeMealPhoto.execute({
      base64Image: event.base64,
      mediaType: event.mediaType,
    });
    this.proposedItems = [...this.proposedItems, ...items];
    this.aiUnavailable = items.length === 0;
    this.analyzing = false;
    this.cdr.markForCheck();
  }

  protected isSelected(food: FoodItemVO): boolean {
    return this.proposedItems.some(i => i.name === food.name);
  }

  protected toggleFrequent(food: FoodItemVO): void {
    if (this.isSelected(food)) {
      this.proposedItems = this.proposedItems.filter(i => i.name !== food.name);
    } else {
      this.proposedItems = [...this.proposedItems, { ...food, confirmed: true }];
    }
    this.cdr.markForCheck();
  }

  protected removeItem(index: number): void {
    this.proposedItems = this.proposedItems.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  protected confirmItem(index: number): void {
    const items = [...this.proposedItems];
    items[index] = { ...items[index], confirmed: true };
    this.proposedItems = items;
    this.cdr.markForCheck();
  }

  protected addManualItem(): void {
    const name = this.newItemName.trim();
    if (!name) return;
    const item: FoodItemVO = {
      name,
      fodmap: { level: 'unknown' },
      confirmed: true,
    };
    this.proposedItems = [...this.proposedItems, item];
    this.newItemName = '';
    this.cdr.markForCheck();
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit || this.saving) return;

    const [hours, minutes] = this.mealTime.split(':').map(Number);
    const occurredAt = new Date();
    occurredAt.setHours(hours, minutes, 0, 0);

    let items = this.proposedItems;
    const notes = this.mode === 'text' ? this.textInput.trim() || undefined : undefined;

    if (items.length === 0 && this.mode === 'text' && this.textInput.trim()) {
      items = [{ name: this.textInput.trim(), fodmap: { level: 'unknown' }, confirmed: true }];
    }

    this.saving = true;
    this.cdr.markForCheck();

    await this.addMeal.execute({
      occurredAt,
      type: this.mealType,
      inputMode: this.mode,
      items,
      notes,
    });

    void this.router.navigate(['/journal']);
  }

  protected back(): void {
    void this.router.navigate(['/journal']);
  }

  private async loadFrequentFoods(): Promise<void> {
    this.frequentFoods = await this.getFrequentFoods.execute(20);
    this.cdr.markForCheck();
  }

  private nowTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}
