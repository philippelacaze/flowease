import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type RecordingState = 'idle' | 'recording' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':     'Microphone refusé — autorisez l\'accès dans les paramètres du navigateur',
  'network':         'Connexion requise — la reconnaissance vocale nécessite internet (Google Speech)',
  'no-speech':       'Aucune parole détectée — réessayez',
  'audio-capture':   'Aucun microphone détecté',
  'aborted':         'Reconnaissance annulée',
};

/** Déclaration minimale de l'API Web Speech (non typée nativement dans TypeScript). */
declare class SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

/**
 * Bouton de saisie vocale via Web Speech API.
 *
 * @remarks
 * Composant autonome utilisé dans MealEntryComponent et NoteEntryComponent.
 * Émet la transcription en temps réel. Affiche un message si l'API n'est pas supportée.
 * Principe SRP : ce composant gère uniquement la capture vocale, pas l'interprétation.
 *
 * @returns transcript - Texte transcrit émis en temps réel lors de la reconnaissance
 */
@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [NgIf, NgClass, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="voice-input">
      <ng-container *ngIf="supported; else unsupported">
        <button
          mat-fab
          [color]="state === 'recording' ? 'warn' : 'primary'"
          [ngClass]="{ 'voice-btn--recording': state === 'recording' }"
          [attr.aria-label]="state === 'recording' ? 'Arrêter la reconnaissance vocale' : 'Démarrer la reconnaissance vocale'"
          [attr.aria-pressed]="state === 'recording'"
          (click)="toggle()"
        >
          <mat-icon aria-hidden="true">{{ state === 'recording' ? 'stop' : 'mic' }}</mat-icon>
        </button>

        <span *ngIf="state === 'recording'" class="voice-status" role="status" aria-live="polite">
          Écoute en cours…
        </span>
        <span *ngIf="state === 'error'" class="voice-error" role="alert">
          {{ errorMessage }}
        </span>
      </ng-container>

      <ng-template #unsupported>
        <p class="voice-unsupported" role="status">
          <mat-icon aria-hidden="true">mic_off</mat-icon>
          Saisie vocale non supportée sur ce navigateur
        </p>
      </ng-template>
    </div>
  `,
  styles: [`
    .voice-input { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .voice-btn--recording { animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.08); }
    }
    .voice-status  { font-size: 13px; color: var(--mat-sys-primary); }
    .voice-error   { font-size: 13px; color: var(--mat-sys-error); }
    .voice-unsupported {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
  `],
})
export class VoiceInputComponent implements OnDestroy {
  /** Émis en temps réel avec la transcription partielle ou finale. */
  @Output() transcript = new EventEmitter<string>();

  protected state: RecordingState = 'idle';
  protected errorMessage = '';
  protected readonly supported: boolean;

  private recognition: SpeechRecognition | null = null;
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    const SpeechRecognitionImpl =
      (window as unknown as Record<string, unknown>)['SpeechRecognition'] ??
      (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'];
    this.supported = !!SpeechRecognitionImpl;

    if (this.supported && SpeechRecognitionImpl) {
      this.recognition = new (SpeechRecognitionImpl as typeof SpeechRecognition)();
      this.recognition.lang = 'fr-FR';
      this.recognition.interimResults = true;
      this.recognition.continuous = false;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        this.transcript.emit(text);
        this.cdr.markForCheck();
      };

      this.recognition.onerror = (event: Event) => {
        const e = event as Event & { error?: string; message?: string };
        console.error('[VoiceInput] SpeechRecognition error', { error: e.error, message: e.message, raw: event });
        this.errorMessage = ERROR_MESSAGES[e.error ?? ''] ?? `Erreur de reconnaissance (${e.error ?? 'inconnue'}) — réessayez`;
        this.state = 'error';
        this.cdr.markForCheck();
      };

      this.recognition.onend = () => {
        if (this.state === 'recording') this.state = 'idle';
        this.cdr.markForCheck();
      };
    }
  }

  ngOnDestroy(): void {
    this.recognition?.stop();
  }

  protected toggle(): void {
    if (this.state === 'recording') {
      this.recognition?.stop();
      this.state = 'idle';
    } else {
      this.state = 'recording';
      this.recognition?.start();
    }
    this.cdr.markForCheck();
  }
}
