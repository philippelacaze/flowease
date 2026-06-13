import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { IntakeService } from '../services/intake.service';
import { IntakeDetailSheetComponent, type SheetResult } from './intake-detail-sheet.component';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import type { IntakeEntity } from '../../../core/models/entities/intake.entity';

interface TreatmentState {
  readonly treatment: TreatmentEntity;
  confirmed: boolean;
  skipped: boolean;
}

/**
 * Page de saisie des prises de traitement.
 *
 * @remarks
 * Tap simple = confirmation rapide (status 'taken').
 * Tap long (>500ms) = ouverture d'un MatBottomSheet (IntakeDetailSheetComponent).
 * Importe uniquement GetActiveTreatmentsUseCase et ConfirmIntakeUseCase.
 */
@Component({
  selector: 'app-intake-entry',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intake-entry.component.html',
  styleUrl: './intake-entry.component.scss',
})
export class IntakeEntryComponent implements OnInit, OnDestroy {
      private readonly intake = inject(IntakeService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected journalDate: Date = new Date();
  protected get isRetrospective(): boolean {
    return this.journalDate.toDateString() !== new Date().toDateString();
  }
  protected get journalDateLabel(): string {
    return this.journalDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected treatmentStates: TreatmentState[] = [];
  protected loading = true;
  private editingEntry: IntakeEntity | null = null;
  /** Mode édition d'un groupe de prises (même minute) saisi depuis le journal. */
  protected isGroupEdit = false;
  /** File des prises restant à modifier en édition de groupe. */
  private editQueue: IntakeEntity[] = [];
  /** Tous les traitements, mis en cache pour résoudre chaque prise du groupe. */
  private allTreatments: TreatmentEntity[] = [];

  // --- Prise ponctuelle (médicament hors traitement/cure) ---
  protected adHocName = '';
  protected adHocDose = '';
  protected adHocTime = this.nowTimeString();
  /** Prises ponctuelles ajoutées pendant la session — feedback visuel. */
  protected adHocAdded: { id: string; name: string; dose: string; time: string }[] = [];
  /** id de la prise ponctuelle en cours d'édition, sinon null (création). */
  protected editingAdHocId: string | null = null;

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private didLongPress = false;

  protected get confirmedCount(): number {
    return this.treatmentStates.filter(s => s.confirmed || s.skipped).length;
  }

  /** true si la page est ouverte pour modifier une (ou plusieurs) prise(s) existante(s). */
  protected get isEditing(): boolean {
    return this.editingEntry !== null || this.isGroupEdit;
  }

  /** true si la prise éditée est une prise ponctuelle (sans traitement rattaché). */
  protected get isEditingAdHoc(): boolean {
    return this.editingEntry !== null && !this.editingEntry.treatmentId;
  }

  protected get pageTitle(): string {
    if (this.isGroupEdit) return 'Modifier les prises';
    return this.editingEntry ? 'Modifier la prise' : 'Saisir des prises';
  }

  ngOnInit(): void {
    const state = history.state as {
      editEntry?: IntakeEntity;
      editEntries?: readonly IntakeEntity[];
      journalDate?: string;
    };
    if (state?.journalDate) {
      this.journalDate = new Date(state.journalDate);
    }
    if (state?.editEntries?.length) {
      this.isGroupEdit = true;
      this.editQueue = [...state.editEntries];
    } else if (state?.editEntry) {
      this.editingEntry = state.editEntry;
    }
    void this.loadTreatments();
  }

  ngOnDestroy(): void {
    this.clearLongPressTimer();
  }

  protected onPointerDown(event: PointerEvent, state: TreatmentState): void {
    (event.target as Element).setPointerCapture(event.pointerId);
    this.didLongPress = false;
    this.longPressTimer = setTimeout(() => {
      this.didLongPress = true;
      this.openDetail(state);
    }, 500);
  }

  protected onPointerUp(event: PointerEvent, state: TreatmentState): void {
    this.clearLongPressTimer();
    if (!this.didLongPress) {
      void this.quickConfirm(state);
    }
  }

  protected onPointerCancel(): void {
    this.clearLongPressTimer();
  }

  protected onKeyActivate(event: Event, state: TreatmentState): void {
    event.preventDefault();
    void this.quickConfirm(state);
  }

  protected openDetail(state: TreatmentState): void {
    const ref = this.bottomSheet.open(IntakeDetailSheetComponent, {
      data: { ...state, editEntry: undefined },
    });
    ref.afterDismissed().subscribe((result: SheetResult | undefined) => {
      if (result) void this.confirmFromDetail(state, result);
      this.cdr.markForCheck();
    });
  }

  private openEditSheet(editEntry: IntakeEntity): void {
    const matchingState = this.treatmentStates.find(
      s => s.treatment.id === editEntry.treatmentId,
    );
    if (!matchingState) return;
    const ref = this.bottomSheet.open(IntakeDetailSheetComponent, {
      data: { ...matchingState, editEntry },
    });
    ref.afterDismissed().subscribe((result: SheetResult | undefined) => {
      if (result) {
        void this.intake.edit({
          id: editEntry.id,
          confirmedAt: new Date(),
          status: result.action,
          skipReason: result.skipReason,
          notes: result.notes,
        });
      }
      void this.router.navigate(['/journal']).catch(() => undefined);
    });
  }

  protected cardBg(state: TreatmentState): string {
    if (state.confirmed) return 'var(--fodmap-low-bg)';
    if (state.skipped) return 'var(--fodmap-high-bg)';
    return 'var(--card-bg)';
  }

  protected cardBorder(state: TreatmentState): string {
    if (state.confirmed) return 'var(--fodmap-low-border)';
    if (state.skipped) return 'var(--fodmap-high-border)';
    return 'var(--border)';
  }

  protected treatmentStatus(state: TreatmentState): string {
    if (state.confirmed) return 'pris';
    if (state.skipped) return 'sauté';
    return 'non confirmé';
  }

  protected goToSettings(): void {
    void this.router.navigate(['/settings', 'treatments']).catch(() => undefined);
  }

  protected back(): void {
    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  protected get canAddAdHoc(): boolean {
    return this.adHocName.trim().length > 0;
  }

  /**
   * Enregistre (ou met à jour) une prise de médicament ponctuelle saisie textuellement,
   * en dehors de tout traitement/cure configuré.
   *
   * @remarks
   * Respecte le mode dégradé : aucune dépendance IA. En création, ajoute la prise à
   * la liste de feedback et réinitialise le formulaire ; en édition, persiste puis
   * revient au journal.
   */
  protected async addAdHoc(): Promise<void> {
    const name = this.adHocName.trim();
    if (!name) return;
    const dose = this.adHocDose.trim();
    const confirmedAt = this.dateOnJournalDayAt(this.adHocTime);

    if (this.editingAdHocId) {
      await this.intake.edit({
        id: this.editingAdHocId,
        confirmedAt,
        status: 'taken',
        medicationName: name,
        actualDose: dose || undefined,
      });
      void this.router.navigate(['/journal'], {
        state: { journalDate: this.journalDate.toISOString() },
      }).catch(() => undefined);
      return;
    }

    const id = await this.intake.confirm({
      confirmedAt,
      scheduledAt: confirmedAt,
      status: 'taken',
      medicationName: name,
      ...(dose && { actualDose: dose }),
    });

    this.adHocAdded = [...this.adHocAdded, { id, name, dose, time: this.adHocTime }];
    this.adHocName = '';
    this.adHocDose = '';
    this.adHocTime = this.nowTimeString();
    this.cdr.markForCheck();
  }

  private async quickConfirm(state: TreatmentState): Promise<void> {
    if (state.confirmed || state.skipped) return;

    const confirmedAt = this.dateOnJournalDay();
    await this.intake.confirm({
      treatmentId: state.treatment.id,
      scheduledAt: confirmedAt,
      confirmedAt,
      status: 'taken',
    });

    state.confirmed = true;
    this.cdr.markForCheck();
  }

  private async confirmFromDetail(state: TreatmentState, result: SheetResult): Promise<void> {
    const confirmedAt = this.dateOnJournalDay();
    await this.intake.confirm({
      treatmentId: state.treatment.id,
      scheduledAt: confirmedAt,
      confirmedAt,
      status: result.action,
      ...(result.skipReason && { skipReason: result.skipReason }),
      ...(result.notes && { notes: result.notes }),
    });

    state.confirmed = result.action === 'taken';
    state.skipped = result.action === 'skipped';
    this.cdr.markForCheck();
  }

  private async loadTreatments(): Promise<void> {
    if (this.isGroupEdit) {
      await this.loadForEditGroup();
      return;
    }
    if (this.editingEntry) {
      await this.loadForEdit(this.editingEntry);
      return;
    }
    const treatments = await this.intake.getActiveTreatments();
    this.treatmentStates = treatments.map(t => ({
      treatment: t,
      confirmed: false,
      skipped: false,
    }));
    this.loading = false;
    this.cdr.markForCheck();
  }

  /**
   * Mode édition : restreint la page au seul médicament concerné.
   *
   * @remarks
   * Prise rattachée à un traitement → on ne charge que ce traitement (même
   * inactif) et on ouvre directement la feuille de détail. Prise ponctuelle →
   * on pré-remplit le formulaire libre, sans afficher aucun traitement.
   */
  private async loadForEdit(editEntry: IntakeEntity): Promise<void> {
    if (editEntry.treatmentId) {
      const all = await this.intake.getAllTreatments();
      const treatment = all.find(t => t.id === editEntry.treatmentId);
      this.treatmentStates = treatment
        ? [{ treatment, confirmed: false, skipped: false }]
        : [];
      this.loading = false;
      this.cdr.markForCheck();
      if (treatment) this.openEditSheet(editEntry);
    } else {
      this.editingAdHocId = editEntry.id;
      this.adHocName = editEntry.medicationName ?? '';
      this.adHocDose = editEntry.actualDose ?? '';
      this.adHocTime = this.toTimeString(editEntry.confirmedAt);
      this.treatmentStates = [];
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Mode édition de groupe : itère la feuille de modification sur chaque prise.
   *
   * @remarks
   * Charge tous les traitements (pour résoudre chaque prise rattachée), n'affiche
   * aucune carte ni le formulaire ponctuel, puis ouvre les feuilles l'une après
   * l'autre via {@link processNextGroupEdit}. Retour au journal une fois la file vidée.
   */
  private async loadForEditGroup(): Promise<void> {
    this.allTreatments = await this.intake.getAllTreatments();
    this.treatmentStates = [];
    this.loading = false;
    this.cdr.markForCheck();
    this.processNextGroupEdit();
  }

  /** Ouvre la feuille de modification de la prochaine prise du groupe, ou revient au journal. */
  private processNextGroupEdit(): void {
    const next = this.editQueue.shift();
    if (!next) {
      void this.router.navigate(['/journal'], {
        state: { journalDate: this.journalDate.toISOString() },
      }).catch(() => undefined);
      return;
    }
    const ref = this.bottomSheet.open(IntakeDetailSheetComponent, {
      data: {
        treatment: this.resolveTreatment(next),
        confirmed: false,
        skipped: false,
        editEntry: next,
      },
    });
    ref.afterDismissed().subscribe((result: SheetResult | undefined) => {
      const persisted = result
        ? this.intake.edit({
            id: next.id,
            confirmedAt: new Date(),
            status: result.action,
            skipReason: result.skipReason,
            notes: result.notes,
          })
        : Promise.resolve();
      void persisted.then(() => this.processNextGroupEdit());
      this.cdr.markForCheck();
    });
  }

  /**
   * Résout le traitement d'une prise pour alimenter la feuille de détail.
   * Prise rattachée → traitement réel ; prise ponctuelle → traitement de synthèse
   * (affichage uniquement, la persistance se fait via l'id de la prise).
   */
  private resolveTreatment(entry: IntakeEntity): TreatmentEntity {
    if (entry.treatmentId) {
      const found = this.allTreatments.find(t => t.id === entry.treatmentId);
      if (found) return found;
    }
    return {
      id: entry.treatmentId ?? '',
      name: entry.medicationName ?? 'Médicament',
      category: 'other',
      mode: 'oral',
      dosage: entry.actualDose ?? '',
      unit: '',
      frequency: 1,
      reminder: { enabled: false, times: [], soundEnabled: false },
      notes: '',
      active: false,
      startedAt: entry.confirmedAt,
      createdAt: entry.confirmedAt,
    };
  }

  /** Date du journal à l'heure courante — garantit que les prises sont rattachées au bon jour. */
  private dateOnJournalDay(): Date {
    const now = new Date();
    const base = new Date(this.journalDate);
    base.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return base;
  }

  /** Date du journal à une heure "HH:MM" donnée — pour les prises ponctuelles. */
  private dateOnJournalDayAt(time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const base = new Date(this.journalDate);
    base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return base;
  }

  private nowTimeString(): string {
    return this.toTimeString(new Date());
  }

  private toTimeString(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
