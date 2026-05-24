import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PhotoSelectedEvent {
  readonly base64: string;
  readonly mediaType: string;
}

/**
 * Bouton de capture photo avec conversion base64.
 *
 * @remarks
 * Composant autonome utilisé dans MealEntryComponent et NoteEntryComponent.
 * Désactivé automatiquement si le navigateur est hors-ligne (navigator.onLine).
 * Principe SRP : délègue l'analyse de l'image à AnalyzeMealPhotoUseCase via le parent.
 * La clé API n'est jamais touchée ici.
 *
 * @returns imageSelected - Émis avec la donnée base64 et le MIME type de l'image
 */
@Component({
  selector: 'app-photo-input',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-input.component.html',
  styleUrl: './photo-input.component.scss',
})
export class PhotoInputComponent {
  /** Émis avec la donnée base64 et le MIME type de l'image sélectionnée. */
  @Output() imageSelected = new EventEmitter<PhotoSelectedEvent>();

  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  protected loading = false;
  protected get isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  private readonly cdr = inject(ChangeDetectorRef);

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading = true;
    this.cdr.markForCheck();

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl = "data:<mediaType>;base64,<base64>"
      const [header, base64] = dataUrl.split(',');
      const mediaType = header.replace('data:', '').replace(';base64', '');
      this.imageSelected.emit({ base64, mediaType });
      this.loading = false;
      // Reset pour permettre la sélection du même fichier à nouveau
      if (this.fileInput?.nativeElement) {
        this.fileInput.nativeElement.value = '';
      }
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.loading = false;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }
}
