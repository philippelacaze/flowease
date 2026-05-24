import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
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
    NgFor, NgIf, FormsModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    VoiceInputComponent, PhotoInputComponent, FoodChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meal-entry">
      <header class="page-header">
        <button mat-icon-button aria-label="Retour au journal" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="page-title">Saisir un repas</h1>
      </header>

      <!-- Mode selector -->
      <div class="mode-selector">
        <mat-button-toggle-group
          [value]="mode"
          aria-label="Mode de saisie du repas"
          (change)="setMode($event.value)"
        >
          <mat-button-toggle value="text" aria-label="Mode texte">
            <mat-icon aria-hidden="true">edit</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="voice" aria-label="Mode vocal">
            <mat-icon aria-hidden="true">mic</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="photo" aria-label="Mode photo">
            <mat-icon aria-hidden="true">camera_alt</mat-icon>
          </mat-button-toggle>
          <mat-button-toggle value="recurring" aria-label="Mode aliments fréquents">
            <mat-icon aria-hidden="true">history</mat-icon>
          </mat-button-toggle>
        </mat-button-toggle-group>
        <div class="mode-label" aria-live="polite">
          {{ modeLabels[mode] }}
        </div>
      </div>

      <div class="meal-form">
        <!-- Meal type + time -->
        <div class="meal-meta">
          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Type de repas</mat-label>
            <mat-select [(ngModel)]="mealType" aria-label="Type de repas">
              <mat-option value="breakfast">Petit-déjeuner</mat-option>
              <mat-option value="lunch">Déjeuner</mat-option>
              <mat-option value="dinner">Dîner</mat-option>
              <mat-option value="snack">Collation</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Heure</mat-label>
            <input
              matInput
              type="time"
              [(ngModel)]="mealTime"
              aria-label="Heure du repas"
              data-testid="meal-time-input"
            />
          </mat-form-field>
        </div>

        <!-- Mode: Text -->
        <div *ngIf="mode === 'text'" class="mode-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Décrire le repas</mat-label>
            <textarea
              matInput
              [(ngModel)]="textInput"
              rows="3"
              placeholder="Ex : riz blanc, poulet grillé, carottes…"
              aria-label="Description textuelle du repas"
              data-testid="meal-text-input"
            ></textarea>
          </mat-form-field>
        </div>

        <!-- Mode: Voice -->
        <div *ngIf="mode === 'voice'" class="mode-content">
          <app-voice-input (transcript)="onTranscript($event)" />
          <div
            *ngIf="analyzing"
            class="analyzing-hint"
            role="status"
            aria-live="polite"
          >
            Analyse IA en cours…
          </div>
          <div
            *ngIf="aiUnavailable"
            class="ai-unavailable"
            role="status"
            data-testid="ai-unavailable"
          >
            <mat-icon aria-hidden="true">info</mat-icon>
            Analyse IA indisponible — ajoutez les aliments manuellement
          </div>
        </div>

        <!-- Mode: Photo -->
        <div *ngIf="mode === 'photo'" class="mode-content">
          <app-photo-input (imageSelected)="onPhotoSelected($event)" />
          <div
            *ngIf="analyzing"
            class="analyzing-hint"
            role="status"
            aria-live="polite"
          >
            Analyse IA en cours…
          </div>
          <div
            *ngIf="aiUnavailable"
            class="ai-unavailable"
            role="status"
            data-testid="ai-unavailable"
          >
            <mat-icon aria-hidden="true">info</mat-icon>
            Analyse IA indisponible — ajoutez les aliments manuellement
          </div>
        </div>

        <!-- Mode: Recurring -->
        <div *ngIf="mode === 'recurring'" class="mode-content">
          <div
            *ngIf="frequentFoods.length === 0"
            class="no-frequent"
            role="status"
          >
            <mat-icon aria-hidden="true">info</mat-icon>
            Aucun historique disponible — ajoutez des aliments manuellement
          </div>
          <div
            *ngIf="frequentFoods.length > 0"
            class="frequent-list"
            role="list"
            aria-label="Aliments fréquents"
          >
            <button
              *ngFor="let food of frequentFoods"
              class="frequent-btn"
              role="listitem"
              [class.frequent-btn--selected]="isSelected(food)"
              [attr.aria-label]="food.name + (isSelected(food) ? ' — sélectionné' : '')"
              [attr.aria-pressed]="isSelected(food)"
              (click)="toggleFrequent(food)"
            >{{ food.name }}</button>
          </div>
        </div>

        <!-- Aliments du repas (chips éditables) -->
        <div *ngIf="proposedItems.length > 0" class="proposed-items">
          <h2 class="items-title">Aliments du repas</h2>
          <div class="chips-row" role="list" aria-label="Aliments sélectionnés">
            <app-food-chip
              *ngFor="let item of proposedItems; let i = index"
              [item]="item"
              [editable]="true"
              (remove)="removeItem(i)"
              (edit)="confirmItem(i)"
            />
          </div>
        </div>

        <!-- Ajout manuel d'un aliment -->
        <div class="add-item-row">
          <mat-form-field appearance="outline" class="add-item-field">
            <mat-label>Ajouter un aliment</mat-label>
            <input
              matInput
              [(ngModel)]="newItemName"
              placeholder="Nom de l'aliment"
              aria-label="Nom de l'aliment à ajouter"
              data-testid="add-item-input"
              (keydown.enter)="addManualItem()"
            />
          </mat-form-field>
          <button
            mat-icon-button
            color="primary"
            aria-label="Ajouter l'aliment"
            [disabled]="!newItemName.trim()"
            (click)="addManualItem()"
          >
            <mat-icon>add_circle</mat-icon>
          </button>
        </div>
      </div>

      <!-- Bouton Valider -->
      <div class="submit-row">
        <button
          mat-raised-button
          color="primary"
          class="submit-btn"
          [disabled]="!canSubmit || saving"
          aria-label="Valider et enregistrer le repas"
          data-testid="submit-meal"
          (click)="submit()"
        >
          <mat-icon aria-hidden="true">check</mat-icon>
          {{ saving ? 'Enregistrement…' : 'Valider le repas' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .meal-entry { padding-bottom: 0; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .page-title { margin: 0; font-size: 18px; font-weight: 500; }

    .mode-selector {
      padding: 12px 16px 4px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mode-label { font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    .meal-form { padding: 8px 16px; }

    .meal-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 4px;
    }
    .meta-field { width: 100%; }

    .mode-content { margin-bottom: 12px; }

    .analyzing-hint {
      margin-top: 8px;
      font-size: 13px;
      color: var(--mat-sys-primary);
    }

    .ai-unavailable {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 8px 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 8px;
      font-size: 13px;
    }
    .ai-unavailable mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .no-frequent {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      padding: 4px 0;
    }
    .no-frequent mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .frequent-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .frequent-btn {
      min-height: 44px;
      padding: 8px 16px;
      border: 1.5px solid var(--mat-sys-outline-variant);
      border-radius: 22px;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.15s, border-color 0.15s;
    }
    .frequent-btn--selected {
      background: var(--mat-sys-primary-container);
      border-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary-container);
    }

    .proposed-items { margin-bottom: 12px; }
    .items-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 8px;
    }
    .chips-row { display: flex; flex-wrap: wrap; gap: 6px; }

    .add-item-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
    }
    .add-item-field { flex: 1; }

    .full-width { width: 100%; }

    .submit-row {
      padding: 12px 16px 24px;
      background: var(--mat-sys-surface);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .submit-btn { width: 100%; }
  `],
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
