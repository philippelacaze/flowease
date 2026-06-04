import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NoteService } from '../services/note.service';
import { IntakeService } from '../services/intake.service';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';
import {
  PhotoInputComponent,
  PhotoSelectedEvent,
} from '../../../shared/components/photo-input/photo-input.component';
import { LinkEntriesSheetComponent } from './link-entries-sheet.component';
import type { NoteEntity, NoteInputMode, LinkedEntry } from '../../../core/models/entities/note.entity';

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
    FormsModule,
    VoiceInputComponent,
    PhotoInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-entry.component.html',
  styleUrl: './note-entry.component.scss',
})
export class NoteEntryComponent implements OnInit {
        private readonly notes = inject(NoteService);
  private readonly intake = inject(IntakeService);
  private readonly router = inject(Router);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly cdr = inject(ChangeDetectorRef);

  protected journalDate: Date = new Date();
  protected get isRetrospective(): boolean {
    return this.journalDate.toDateString() !== new Date().toDateString();
  }
  protected get journalDateLabel(): string {
    return this.journalDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected mode: NoteInputMode = 'text';
  protected content = '';
  protected imageBase64: string | null = null;
  protected imageMediaType = '';
  protected linkedEntries: LinkedEntry[] = [];
  protected saving = false;
  private editingEntry: NoteEntity | null = null;

  protected readonly modes: { key: NoteInputMode; emoji: string; label: string }[] = [
    { key: 'text',  emoji: '✏️', label: 'Texte' },
    { key: 'voice', emoji: '🎤', label: 'Vocal' },
    { key: 'photo', emoji: '📷', label: 'Photo' },
  ];

  ngOnInit(): void {
    const state = history.state as { editEntry?: NoteEntity; journalDate?: string };
    if (state?.journalDate) {
      this.journalDate = new Date(state.journalDate);
    }
    if (state?.editEntry) {
      this.editingEntry = state.editEntry;
      this.mode = state.editEntry.inputMode;
      this.content = state.editEntry.content;
      this.imageBase64 = state.editEntry.imageBase64 ?? null;
      this.linkedEntries = [...state.editEntry.linkedEntries];
      this.cdr.markForCheck();
    }
  }

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
    const entries = await this.intake.getJournalDay(this.journalDate);
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

    if (this.editingEntry) {
      await this.notes.edit({
        id: this.editingEntry.id,
        occurredAt: this.editingEntry.occurredAt,
        inputMode: this.mode,
        content: this.content.trim() || '(photo)',
        ...(this.imageBase64 && { imageBase64: this.imageBase64 }),
        ...(this.linkedEntries.length > 0 && { linkedEntries: this.linkedEntries }),
      });
      void this.router.navigate(['/journal'], {
        state: { journalDate: this.journalDate.toISOString() },
      }).catch(() => undefined);
      return;
    }

    const noteId = await this.notes.add({
      occurredAt: new Date(this.journalDate),
      inputMode: this.mode,
      content: this.content.trim() || '(photo)',
      ...(this.imageBase64 && { imageBase64: this.imageBase64 }),
      ...(this.linkedEntries.length > 0 && { linkedEntries: this.linkedEntries }),
    });

    // Taguage IA asynchrone — ne bloque pas la navigation
    // Les suggestions seront visibles dans le journal (aiTagSuggestions) après confirmation
    this.notes.tag(noteId).catch(() => undefined);

    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  protected back(): void {
    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  protected linkEmoji(link: LinkedEntry): string {
    const emojis: Record<string, string> = {
      meal: '🍽️',
      symptom: '🩺',
      intake: '💊',
    };
    return emojis[link.entryType] ?? '🔗';
  }
}
