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
  templateUrl: './note-entry.component.html',
  styleUrl: './note-entry.component.scss',
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
