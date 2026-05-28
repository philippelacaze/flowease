import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AddMealUseCase } from '../../../../application/journal/add-meal.usecase';
import { AnalyzeMealPhotoUseCase } from '../../../../application/journal/analyze-meal-photo.usecase';
import { ExtractMealFromTextUseCase } from '../../../../application/journal/extract-meal-from-text.usecase';
import { GetFrequentFoodsUseCase } from '../../../../application/journal/get-frequent-foods.usecase';
import { ErrorNotificationService } from '../../../../core/error-notification.service';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';
import {
  PhotoInputComponent,
  PhotoSelectedEvent,
} from '../../../shared/components/photo-input/photo-input.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import type { FoodItemVO, MealInputMode, MealType } from '../../../../domain/entities/meal.entity';

type MealPhase = 'processing' | 'validation' | 'form' | 'empty' | 'network' | 'confirm';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

/**
 * Page de saisie d'un repas — machine d'état à 6 phases.
 *
 * @remarks
 * La phase initiale est déterminée par queryParams.mode : voice/photo → processing, text → form.
 * history.state.transcript / photo déclenchent l'analyse IA réelle.
 * data-testid="ai-unavailable" visible dans les phases empty et network.
 * data-testid="submit-meal" sur le bouton de validation.
 */
@Component({
  selector: 'app-meal-entry',
  standalone: true,
  imports: [FormsModule, VoiceInputComponent, PhotoInputComponent, FoodChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-entry.component.html',
  styleUrl: './meal-entry.component.scss',
})
export class MealEntryComponent implements OnInit, OnDestroy {
  private readonly addMeal = inject(AddMealUseCase);
  private readonly analyzeMealPhoto = inject(AnalyzeMealPhotoUseCase);
  private readonly extractMealFromText = inject(ExtractMealFromTextUseCase);
  private readonly getFrequentFoods = inject(GetFrequentFoodsUseCase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorNotification = inject(ErrorNotificationService);

  protected phase: MealPhase = 'form';
  protected srcMode: 'voice' | 'photo' | 'text' = 'text';
  protected processingStep = 0;
  private processingTimers: ReturnType<typeof setTimeout>[] = [];

  protected mealType: MealType = 'lunch';
  protected mealTime = this.nowTime();
  protected textInput = '';
  protected newItemName = '';
  protected proposedItems: FoodItemVO[] = [];
  protected frequentFoods: FoodItemVO[] = [];
  protected aiUnavailableReason: string | null = null;
  protected saving = false;

  protected get mealTypeLabel(): string {
    return MEAL_TYPE_LABELS[this.mealType] ?? this.mealType;
  }

  protected get canSubmit(): boolean {
    return this.proposedItems.length > 0
      || (this.srcMode === 'text' && this.textInput.trim().length > 0);
  }

  protected get isOnline(): boolean {
    return navigator.onLine;
  }

  ngOnInit(): void {
    void this.loadFrequentFoods();
    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;
    const state = history.state as { transcript?: string; photo?: { base64: string; mediaType: string } };

    if (mode === 'voice') {
      this.srcMode = 'voice';
      if (state?.transcript) {
        this.phase = 'processing';
        this.startProcessing();
        void this.onTranscript(state.transcript);
      } else {
        this.phase = 'form';
      }
    } else if (mode === 'photo') {
      this.srcMode = 'photo';
      if (state?.photo) {
        this.phase = 'processing';
        this.startProcessing();
        void this.onPhotoSelected({ base64: state.photo.base64, mediaType: state.photo.mediaType });
      } else {
        this.phase = 'form';
      }
    } else {
      this.srcMode = 'text';
      this.phase = 'form';
    }
  }

  ngOnDestroy(): void {
    this.clearProcessingTimers();
  }

  protected setMode(m: 'voice' | 'photo' | 'text' | 'recurring'): void {
    this.srcMode = (m === 'recurring' ? 'text' : m) as 'voice' | 'photo' | 'text';
    this.aiUnavailableReason = null;
    this.phase = 'form';
    this.cdr.markForCheck();
  }

  protected async onTranscript(text: string): Promise<void> {
    if (!text.trim()) return;
    this.aiUnavailableReason = null;
    if (this.phase !== 'processing') {
      this.phase = 'processing';
      this.startProcessing();
      this.cdr.markForCheck();
    }
    const items = await this.extractMealFromText.execute(text);
    this.clearProcessingTimers();
    if (items.length === 0) {
      this.aiUnavailableReason = this.errorNotification.current()?.message
        ?? 'Analyse IA indisponible — ajoutez les aliments manuellement';
      this.phase = !navigator.onLine ? 'network' : 'empty';
    } else {
      this.proposedItems = [...this.proposedItems, ...items];
      this.phase = 'validation';
    }
    this.cdr.markForCheck();
  }

  protected async onPhotoSelected(event: PhotoSelectedEvent): Promise<void> {
    this.aiUnavailableReason = null;
    const items = await this.analyzeMealPhoto.execute({
      base64Image: event.base64,
      mediaType: event.mediaType,
    });
    this.clearProcessingTimers();
    if (items.length === 0) {
      this.aiUnavailableReason = this.errorNotification.current()?.message
        ?? 'Analyse IA indisponible — ajoutez les aliments manuellement';
      this.phase = !navigator.onLine ? 'network' : 'empty';
    } else {
      this.proposedItems = [...this.proposedItems, ...items];
      this.phase = 'validation';
    }
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
    this.proposedItems = [
      ...this.proposedItems,
      { name, fodmap: { level: 'unknown' }, confirmed: true },
    ];
    this.newItemName = '';
    this.cdr.markForCheck();
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit || this.saving) return;

    const [hours, minutes] = this.mealTime.split(':').map(Number);
    const occurredAt = new Date();
    occurredAt.setHours(hours, minutes, 0, 0);

    let items = this.proposedItems;
    const notes = this.srcMode === 'text' ? this.textInput.trim() || undefined : undefined;

    if (items.length === 0 && this.srcMode === 'text' && this.textInput.trim()) {
      items = [{ name: this.textInput.trim(), fodmap: { level: 'unknown' }, confirmed: true }];
    }

    this.saving = true;
    this.cdr.markForCheck();

    await this.addMeal.execute({
      occurredAt,
      type: this.mealType,
      inputMode: this.srcMode as MealInputMode,
      items,
      notes,
    });

    this.saving = false;
    this.phase = 'confirm';
    this.cdr.markForCheck();
  }

  protected back(): void {
    void this.router.navigate(['/journal']).catch(() => undefined);
  }

  private startProcessing(): void {
    this.processingStep = 0;
    this.processingTimers = [
      setTimeout(() => { this.processingStep = 1; this.cdr.markForCheck(); }, 1800),
      setTimeout(() => { this.processingStep = 2; this.cdr.markForCheck(); }, 3200),
    ];
  }

  private clearProcessingTimers(): void {
    this.processingTimers.forEach(t => clearTimeout(t));
    this.processingTimers = [];
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
