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
import { MealService } from '../services/meal.service';
import { ErrorNotificationService } from '../../../core/services/error-notification.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';
import {
  PhotoInputComponent,
  PhotoSelectedEvent,
} from '../../../shared/components/photo-input/photo-input.component';
import { FoodChipComponent } from '../../../shared/components/food-chip/food-chip.component';
import type { AiFodmapAlert, FoodItemVO, MealEntity, MealInputMode, MealType } from '../../../core/models/entities/meal.entity';

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
          private readonly meals = inject(MealService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorNotification = inject(ErrorNotificationService);
  private readonly settings = inject(LocalSettingsService);

  protected journalDate: Date = new Date();
  protected get isRetrospective(): boolean {
    return this.journalDate.toDateString() !== new Date().toDateString();
  }
  protected get journalDateLabel(): string {
    return this.journalDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected phase: MealPhase = 'form';
  protected srcMode: 'voice' | 'photo' | 'text' = 'text';
  protected processingStep = 0;
  private processingTimers: ReturnType<typeof setTimeout>[] = [];

  protected mealType: MealType = this.defaultMealType();
  protected mealTime = this.nowTime();
  protected textInput = '';
  protected newItemName = '';
  protected proposedItems: FoodItemVO[] = [];
  protected pendingAiFodmapFlags: AiFodmapAlert[] = [];
  protected frequentFoods: FoodItemVO[] = [];
  protected aiUnavailableReason: string | null = null;
  protected saving = false;
  private editingEntry: MealEntity | null = null;

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

  /**
   * Indique si un aliment a déjà été soumis à l'analyse IA.
   *
   * @remarks
   * Le flag `analyzed` fait foi (un aliment peut être analysé mais rester de niveau
   * 'unknown' si l'IA n'a pas su le classer). Pour les données antérieures au flag,
   * on retombe sur le niveau FODMAP : un niveau connu implique un aliment déjà analysé.
   */
  private isAnalyzed(item: FoodItemVO): boolean {
    return item.analyzed === true || item.fodmap.level !== 'unknown';
  }

  /** Aliments encore non analysés par l'IA. */
  protected get unanalyzedItems(): FoodItemVO[] {
    return this.proposedItems.filter(i => !this.isAnalyzed(i));
  }

  /**
   * Vrai s'il reste quelque chose à analyser : un aliment non analysé,
   * ou du texte libre saisi mais pas encore extrait.
   */
  protected get hasPendingAnalysis(): boolean {
    return this.unanalyzedItems.length > 0
      || (this.srcMode === 'text' && this.textInput.trim().length > 0);
  }

  /** L'analyse IA est possible : clé API configurée et connexion disponible. */
  protected get aiAvailable(): boolean {
    return this.isOnline && this.settings.hasApiKey();
  }

  /**
   * Vrai si l'action principale doit être « Analyse IA » plutôt qu'« Enregistrer ».
   *
   * @remarks
   * Tant qu'au moins un aliment n'est pas analysé, le bouton unique reste « Analyse IA ».
   * Il devient « Enregistrer le repas » uniquement quand tous les aliments ont un niveau
   * FODMAP connu. En mode dégradé (sans clé ou hors ligne), on bascule directement sur
   * l'enregistrement manuel pour ne jamais bloquer l'utilisateur.
   */
  protected get showAnalyzeAction(): boolean {
    return this.hasPendingAnalysis && this.aiAvailable;
  }

  ngOnInit(): void {
    void this.loadFrequentFoods();
    const state = history.state as {
      transcript?: string;
      photo?: { base64: string; mediaType: string };
      editEntry?: MealEntity;
      journalDate?: string;
    };

    if (state?.journalDate) {
      this.journalDate = new Date(state.journalDate);
    }

    if (state?.editEntry) {
      this.editingEntry = state.editEntry;
      this.mealType = state.editEntry.type;
      this.mealTime = this.toTimeString(state.editEntry.occurredAt);
      this.proposedItems = [...state.editEntry.items];
      this.pendingAiFodmapFlags = state.editEntry.aiFodmapFlags
        ? [...state.editEntry.aiFodmapFlags]
        : [];
      this.phase = 'validation';
      this.cdr.markForCheck();
      return;
    }

    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;

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
    const result = await this.meals.extractFromText(text);
    this.clearProcessingTimers();
    if (result.items.length === 0) {
      this.aiUnavailableReason = this.errorNotification.current()?.message
        ?? 'Analyse IA indisponible — ajoutez les aliments manuellement';
      this.phase = !navigator.onLine ? 'network' : 'empty';
    } else {
      this.proposedItems = [...this.proposedItems, ...result.items];
      this.pendingAiFodmapFlags = [...result.aiFodmapFlags];
      this.phase = 'validation';
    }
    this.cdr.markForCheck();
  }

  protected async onPhotoSelected(event: PhotoSelectedEvent): Promise<void> {
    this.aiUnavailableReason = null;
    const result = await this.meals.analyzePhoto({
      base64Image: event.base64,
      mediaType: event.mediaType,
    });
    this.clearProcessingTimers();
    if (result.items.length === 0) {
      this.aiUnavailableReason = this.errorNotification.current()?.message
        ?? 'Analyse IA indisponible — ajoutez les aliments manuellement';
      this.phase = !navigator.onLine ? 'network' : 'empty';
    } else {
      this.proposedItems = [...this.proposedItems, ...result.items];
      this.pendingAiFodmapFlags = [...result.aiFodmapFlags];
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

  /**
   * Lance l'analyse IA de tous les aliments non encore analysés, en une seule passe.
   *
   * @remarks
   * Combine le texte libre éventuel et les noms des aliments au niveau FODMAP 'unknown',
   * envoie le tout à l'IA, puis fusionne le résultat avec les aliments déjà analysés.
   * Les aliments déjà colorés (low/medium/high) sont préservés tels quels.
   * En cas d'échec IA, les aliments existants sont restaurés et l'écran dégradé s'affiche
   * pour permettre l'ajout/enregistrement manuel.
   */
  protected async analyzeAll(): Promise<void> {
    if (this.saving) return;

    const parts: string[] = [];
    const text = this.textInput.trim();
    if (text) parts.push(text);
    const unanalyzed = this.unanalyzedItems;
    for (const item of unanalyzed) parts.push(item.name);
    if (parts.length === 0) return;

    const keptItems = this.proposedItems.filter(i => this.isAnalyzed(i));
    const previousItems = this.proposedItems;

    this.aiUnavailableReason = null;
    this.phase = 'processing';
    this.startAnalyzing();
    this.cdr.markForCheck();

    const result = await this.meals.extractFromText(parts.join(', '));
    this.clearProcessingTimers();

    if (result.items.length === 0) {
      this.proposedItems = previousItems;
      this.aiUnavailableReason = this.errorNotification.current()?.message
        ?? 'Analyse IA indisponible — ajoutez les aliments manuellement';
      this.phase = !navigator.onLine ? 'network' : 'empty';
    } else {
      this.proposedItems = [...keptItems, ...result.items];
      this.pendingAiFodmapFlags = this.mergeFlags(this.pendingAiFodmapFlags, result.aiFodmapFlags);
      this.textInput = '';
      this.phase = 'validation';
    }
    this.cdr.markForCheck();
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit || this.saving) return;

    const [hours, minutes] = this.mealTime.split(':').map(Number);
    const occurredAt = new Date(this.journalDate);
    occurredAt.setHours(hours, minutes, 0, 0);

    let items = this.proposedItems;
    const notes = this.srcMode === 'text' ? this.textInput.trim() || undefined : undefined;

    if (items.length === 0 && this.srcMode === 'text' && this.textInput.trim()) {
      items = [{ name: this.textInput.trim(), fodmap: { level: 'unknown' }, confirmed: true }];
    }

    this.saving = true;
    this.cdr.markForCheck();

    if (this.editingEntry) {
      await this.meals.edit({
        id: this.editingEntry.id,
        occurredAt,
        type: this.mealType,
        inputMode: this.editingEntry.inputMode,
        items,
        notes: notes ?? this.editingEntry.notes,
        aiFodmapFlags: this.pendingAiFodmapFlags.length > 0 ? this.pendingAiFodmapFlags : this.editingEntry.aiFodmapFlags,
      });
    } else {
      await this.meals.add({
        occurredAt,
        type: this.mealType,
        inputMode: this.srcMode as MealInputMode,
        items,
        notes,
        aiFodmapFlags: this.pendingAiFodmapFlags.length > 0 ? this.pendingAiFodmapFlags : undefined,
      });
    }

    this.saving = false;
    this.phase = 'confirm';
    this.cdr.markForCheck();
  }

  protected back(): void {
    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  private startProcessing(): void {
    this.processingStep = 0;
    this.processingTimers = [
      setTimeout(() => { this.processingStep = 1; this.cdr.markForCheck(); }, 1800),
      setTimeout(() => { this.processingStep = 2; this.cdr.markForCheck(); }, 3200),
    ];
  }

  /**
   * Démarre l'animation d'analyse sans l'étape de capture (vocal/photo).
   *
   * @remarks
   * Utilisé par analyzeAll() : on est déjà au stade « Analyse IA en cours »,
   * donc on saute directement à l'étape ✨ (processingStep = 1).
   */
  private startAnalyzing(): void {
    this.processingStep = 1;
    this.processingTimers = [
      setTimeout(() => { this.processingStep = 2; this.cdr.markForCheck(); }, 1500),
    ];
  }

  private clearProcessingTimers(): void {
    this.processingTimers.forEach(t => clearTimeout(t));
    this.processingTimers = [];
  }

  /** Fusionne deux listes d'alertes FODMAP en dédupliquant par nom d'aliment. */
  private mergeFlags(
    existing: AiFodmapAlert[],
    incoming: ReadonlyArray<AiFodmapAlert>,
  ): AiFodmapAlert[] {
    const byItem = new Map<string, AiFodmapAlert>();
    for (const flag of existing) byItem.set(flag.item, flag);
    for (const flag of incoming) byItem.set(flag.item, flag);
    return Array.from(byItem.values());
  }

  private async loadFrequentFoods(): Promise<void> {
    this.frequentFoods = await this.meals.getFrequent(20);
    this.cdr.markForCheck();
  }

  private nowTime(): string {
    return this.toTimeString(new Date());
  }

  private toTimeString(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private defaultMealType(now = new Date()): MealType {
    const m = now.getHours() * 60 + now.getMinutes();
    if (m >= 360 && m < 540)  return 'breakfast'; // 06:00–08:59
    if (m >= 705 && m < 900)  return 'lunch';     // 11:45–14:59
    if (m >= 1140 && m < 1260) return 'dinner';   // 19:00–20:59
    return 'snack';
  }
}
