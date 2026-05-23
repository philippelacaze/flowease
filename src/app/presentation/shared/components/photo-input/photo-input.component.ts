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
import { NgIf } from '@angular/common';
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
  imports: [NgIf, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="photo-input">
      <input
        #fileInput
        type="file"
        accept="image/*"
        capture="environment"
        class="photo-input__hidden"
        [attr.aria-hidden]="true"
        (change)="onFileChange($event)"
      />

      <button
        mat-raised-button
        color="primary"
        [disabled]="isOffline"
        [attr.aria-label]="isOffline ? 'Photo désactivée — connexion requise' : 'Prendre une photo ou choisir une image'"
        (click)="fileInput.click()"
      >
        <mat-icon aria-hidden="true">{{ isOffline ? 'cloud_off' : 'camera_alt' }}</mat-icon>
        {{ isOffline ? 'Photo (hors-ligne)' : 'Photo' }}
      </button>

      <span *ngIf="isOffline" class="photo-offline-hint" role="status">
        Connexion requise pour l'analyse IA
      </span>

      <span *ngIf="loading" class="photo-loading" role="status" aria-live="polite">
        Chargement…
      </span>
    </div>
  `,
  styles: [`
    .photo-input { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .photo-input__hidden { display: none; }
    .photo-offline-hint { font-size: 12px; color: var(--mat-sys-on-surface-variant); }
    .photo-loading { font-size: 12px; color: var(--mat-sys-primary); }
  `],
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
