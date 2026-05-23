import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatChipsModule } from '@angular/material/chips';
import { AddNoteUseCase } from '../../../../application/journal/add-note.usecase';
import { TagNoteUseCase } from '../../../../application/journal/tag-note.usecase';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';
import {
  PhotoInputComponent,
  PhotoSelectedEvent,
} from '../../../shared/components/photo-input/photo-input.component';
import { LinkEntriesSheetComponent } from './link-entries-sheet.component';
import type { NoteInputMode, LinkedEntry } from '../../../../domain/entities/note.entity';

/**
 * Page de saisie d'une note — modes texte, vocal et photo.
 *
 * @remarks
 * Importe AddNoteUseCase, TagNoteUseCase et GetJournalDayUseCase depuis application/.
 * Les tags IA sont générés de façon asynchrone après la sauvegarde initiale (TagNoteUseCase).
 * Bottom sheet "Lier à..." charge les entrées du jour via GetJournalDayUseCase.
 */
@Component({
  selector: 'app-note-entry',
  standalone: true,
  imports: [
    NgFor, NgIf, FormsModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule,
    VoiceInputComponent, PhotoInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="note-entry">
      <header class="page-header">
        <button mat-icon-button aria-label="Retour au journal" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="page-title">Saisir une note</h1>
      </header>

      <!-- Mode selector -->
      <div class="mode-selector">
        <mat-button-toggle-group
          [value]="mode"
          aria-label="Mode de saisie de la note"
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
        </mat-button-toggle-group>
        <div class="mode-label">{{ modeLabels[mode] }}</div>
      </div>

      <div class="note-form">
        <!-- Mode: Text -->
        <div *ngIf="mode === 'text'" class="mode-content">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contenu de la note</mat-label>
            <textarea
              matInput
              [(ngModel)]="content"
              rows="6"
              placeholder="Écrivez votre observation…"
              aria-label="Contenu textuel de la note"
              data-testid="note-text-input"
            ></textarea>
          </mat-form-field>
        </div>

        <!-- Mode: Voice -->
        <div *ngIf="mode === 'voice'" class="mode-content">
          <app-voice-input (transcript)="onTranscript($event)" />
          <div *ngIf="content" class="voice-preview">
            <p class="voice-preview-label">Transcription :</p>
            <p class="voice-preview-text" data-testid="voice-transcript">{{ content }}</p>
          </div>
        </div>

        <!-- Mode: Photo -->
        <div *ngIf="mode === 'photo'" class="mode-content">
          <app-photo-input (imageSelected)="onPhotoSelected($event)" />
          <div *ngIf="imageBase64" class="photo-preview">
            <img
              [src]="'data:' + imageMediaType + ';base64,' + imageBase64"
              alt="Photo attachée à la note"
              class="photo-thumb"
            />
          </div>
          <mat-form-field *ngIf="imageBase64" appearance="outline" class="full-width photo-caption">
            <mat-label>Description (optionnel)</mat-label>
            <textarea
              matInput
              [(ngModel)]="content"
              rows="3"
              placeholder="Décrivez la photo…"
              aria-label="Description de la photo"
            ></textarea>
          </mat-form-field>
        </div>

        <!-- Tags IA (après sauvegarde) -->
        <div *ngIf="savedTags.length > 0" class="tags-section">
          <p class="tags-label">Tags générés par l'IA :</p>
          <mat-chip-set aria-label="Tags générés par l'IA">
            <mat-chip *ngFor="let tag of savedTags" [attr.aria-label]="tag">{{ tag }}</mat-chip>
          </mat-chip-set>
        </div>

        <!-- Entrées liées -->
        <div *ngIf="linkedEntries.length > 0" class="linked-section">
          <p class="linked-label">Entrées liées :</p>
          <div class="linked-list" role="list" aria-label="Entrées liées">
            <div
              *ngFor="let link of linkedEntries"
              class="linked-item"
              role="listitem"
            >
              <mat-icon aria-hidden="true" class="linked-icon">{{ linkIcon(link) }}</mat-icon>
              <span>{{ link.entryType }} #{{ link.entryId.slice(0, 8) }}…</span>
            </div>
          </div>
        </div>

        <!-- Bouton Lier à... -->
        <button
          mat-stroked-button
          class="link-btn"
          aria-label="Lier cette note à d'autres entrées du journal"
          data-testid="link-entries-btn"
          (click)="openLinkSheet()"
        >
          <mat-icon aria-hidden="true">link</mat-icon>
          Lier à…
          <span *ngIf="linkedEntries.length > 0">({{ linkedEntries.length }})</span>
        </button>
      </div>

      <div class="submit-row">
        <button
          mat-raised-button
          color="primary"
          class="submit-btn"
          [disabled]="!canSubmit || saving"
          aria-label="Valider et enregistrer la note"
          data-testid="submit-note"
          (click)="submit()"
        >
          <mat-icon aria-hidden="true">check</mat-icon>
          {{ saving ? 'Enregistrement…' : 'Valider la note' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

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

    .note-form { padding: 8px 16px; }

    .mode-content { margin-bottom: 12px; }

    .voice-preview {
      margin-top: 12px;
      padding: 12px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
    }
    .voice-preview-label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 4px;
    }
    .voice-preview-text {
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .photo-preview { margin: 8px 0; }
    .photo-thumb {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      object-fit: cover;
    }
    .photo-caption { margin-top: 8px; }

    .tags-section { margin-bottom: 12px; }
    .tags-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 8px;
    }

    .linked-section { margin-bottom: 12px; }
    .linked-label {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 6px;
    }
    .linked-list { display: flex; flex-direction: column; gap: 4px; }
    .linked-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      padding: 4px 0;
    }
    .linked-icon { font-size: 16px; width: 16px; height: 16px; color: var(--mat-sys-primary); }

    .link-btn { margin-bottom: 12px; width: 100%; }

    .full-width { width: 100%; }

    .submit-row {
      padding: 12px 16px 24px;
      background: var(--mat-sys-surface);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .submit-btn { width: 100%; }
  `],
})
export class NoteEntryComponent {
  private readonly addNote = inject(AddNoteUseCase);
  private readonly tagNote = inject(TagNoteUseCase);
  private readonly getJournalDay = inject(GetJournalDayUseCase);
  private readonly router = inject(Router);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly cdr = inject(ChangeDetectorRef);

  protected mode: NoteInputMode = 'text';
  protected content = '';
  protected imageBase64: string | null = null;
  protected imageMediaType = '';
  protected linkedEntries: LinkedEntry[] = [];
  protected savedTags: string[] = [];
  protected saving = false;

  protected readonly modeLabels: Record<NoteInputMode, string> = {
    text: 'Texte — écrivez votre observation',
    voice: 'Vocal — dictez votre note',
    photo: 'Photo — attachez une image',
  };

  protected get canSubmit(): boolean {
    return this.content.trim().length > 0 || this.imageBase64 !== null;
  }

  protected setMode(m: NoteInputMode): void {
    this.mode = m;
    this.content = '';
    this.imageBase64 = null;
    this.cdr.markForCheck();
  }

  protected onTranscript(text: string): void {
    this.content = text;
    this.cdr.markForCheck();
  }

  protected onPhotoSelected(event: PhotoSelectedEvent): void {
    this.imageBase64 = event.base64;
    this.imageMediaType = event.mediaType;
    this.cdr.markForCheck();
  }

  protected async openLinkSheet(): Promise<void> {
    const entries = await this.getJournalDay.execute(new Date());
    const linkable = entries.filter(e => e.kind !== 'note');

    const ref = this.bottomSheet.open(LinkEntriesSheetComponent, {
      data: linkable,
      ariaLabel: 'Lier la note à des entrées du journal',
    });

    const result = await ref.afterDismissed().toPromise() as LinkedEntry[] | undefined;
    if (result && result.length > 0) {
      this.linkedEntries = result;
      this.cdr.markForCheck();
    }
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    const noteId = await this.addNote.execute({
      occurredAt: new Date(),
      inputMode: this.mode,
      content: this.content.trim() || '(photo)',
      ...(this.imageBase64 && { imageBase64: this.imageBase64 }),
      ...(this.linkedEntries.length > 0 && { linkedEntries: this.linkedEntries }),
    });

    // Taguage IA asynchrone — ne bloque pas la navigation
    this.tagNote.execute(noteId).then(result => {
      this.savedTags = result.tags as string[];
    }).catch(() => {
      // mode dégradé : tags restent vides
    });

    void this.router.navigate(['/journal']);
  }

  protected back(): void {
    void this.router.navigate(['/journal']);
  }

  protected linkIcon(link: LinkedEntry): string {
    const icons: Record<string, string> = {
      meal: 'restaurant',
      symptom: 'health_and_safety',
      intake: 'medication',
    };
    return icons[link.entryType] ?? 'link';
  }
}
