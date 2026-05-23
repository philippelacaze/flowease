import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  AfterViewChecked,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import {
  SendCoachMessageUseCase,
  type SendCoachMessageInput,
} from '../../../../application/coach/send-coach-message.usecase';
import { SummarizeCoachSessionUseCase } from '../../../../application/coach/summarize-coach-session.usecase';
import type { StartCoachSessionResult } from '../../../../application/coach/start-coach-session.usecase';
import type { CoachContextWindow } from '../../../../domain/entities/coach-session.entity';
import type { CoachMessage, CoachContext } from '../../../../domain/repositories/ai/coach.port';
import { CoachContextPickerComponent } from '../coach-context-picker/coach-context-picker.component';
import { TokenCounterComponent } from '../../../shared/components/token-counter/token-counter.component';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  isStreaming: boolean;
}

const SUGGESTED_QUESTIONS: readonly string[] = [
  'Comment se passe mon protocole cette semaine ?',
  'Quels aliments semblent déclencher mes symptômes ?',
  'Mon observance des traitements est-elle satisfaisante ?',
  'Quelles sont mes tendances de bien-être ce mois-ci ?',
];

/**
 * Interface principale de conversation avec le Coach IA.
 *
 * @remarks
 * Respecte SRP : orchestration de la conversation uniquement.
 * Le streaming des tokens est délégué à SendCoachMessageUseCase (AsyncGenerator).
 * La clôture de session est déléguée à SummarizeCoachSessionUseCase.
 * Le choix du contexte est délégué à CoachContextPickerComponent (bottom sheet).
 * Mode dégradé : si l'IA retourne un itérable vide, la bulle assistant reste vide
 * sans bloquer l'interface.
 */
@Component({
  selector: 'app-coach-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TokenCounterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-wrapper">

      <!-- Header -->
      <div class="chat-header">
        <span class="chat-title">Coach IA</span>
        <div class="header-actions">
          <button
            mat-icon-button
            aria-label="Voir l'historique des sessions"
            data-testid="btn-history"
            (click)="goToHistory()">
            <mat-icon>history</mat-icon>
          </button>
          <button
            mat-icon-button
            aria-label="Démarrer une nouvelle conversation"
            data-testid="btn-new-conversation"
            [disabled]="isStreaming"
            (click)="onNewConversation()">
            <mat-icon>add_comment</mat-icon>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div
        class="messages-area"
        #messagesList
        role="log"
        aria-live="polite"
        aria-label="Conversation avec le coach IA">

        <!-- Suggested questions (visibles tant qu'aucun message n'a été envoyé) -->
        <div *ngIf="showSuggestions && messages.length === 0" class="suggestions-container">
          <p class="suggestions-label">Suggestions</p>
          <button
            *ngFor="let q of suggestedQuestions; let i = index"
            mat-stroked-button
            class="suggestion-btn"
            [attr.data-testid]="'suggestion-' + i"
            [attr.aria-label]="q"
            (click)="onSendMessage(q)">
            {{ q }}
          </button>
        </div>

        <!-- Bulles de messages -->
        <div
          *ngFor="let msg of messages; let i = index"
          class="message-row"
          [class.user-row]="msg.role === 'user'"
          [class.assistant-row]="msg.role === 'assistant'">

          <div
            class="message-bubble"
            [class.user-bubble]="msg.role === 'user'"
            [class.assistant-bubble]="msg.role === 'assistant'"
            [attr.data-testid]="'message-' + i"
            [attr.aria-label]="(msg.role === 'user' ? 'Vous : ' : 'Coach : ') + msg.content">

            <span *ngIf="msg.content" [class.streaming-text]="msg.isStreaming">{{ msg.content }}</span>
            <span
              *ngIf="!msg.content && msg.isStreaming"
              class="typing-indicator"
              aria-label="Le coach rédige sa réponse...">
              ···
            </span>
          </div>

          <!-- Bouton Copier (réponses assistant uniquement, après fin du streaming) -->
          <button
            *ngIf="msg.role === 'assistant' && !msg.isStreaming && msg.content"
            mat-icon-button
            class="copy-btn"
            [attr.aria-label]="'Copier la réponse du coach'"
            [matTooltip]="copiedIndex === i ? 'Copié !' : 'Copier'"
            [attr.data-testid]="'copy-btn-' + i"
            (click)="onCopy(msg.content, i)">
            <mat-icon>{{ copiedIndex === i ? 'check' : 'content_copy' }}</mat-icon>
          </button>
        </div>
      </div>

      <!-- Pied de page : compteur tokens + zone de saisie -->
      <div class="chat-footer">
        <div class="token-row">
          <app-token-counter [sessionTokens]="sessionTokens"></app-token-counter>
        </div>
        <div class="input-row">
          <mat-form-field appearance="outline" class="input-field">
            <textarea
              matInput
              [(ngModel)]="currentInput"
              placeholder="Votre message..."
              [disabled]="isStreaming || !sessionId"
              aria-label="Message au coach IA"
              data-testid="chat-input"
              rows="2">
            </textarea>
          </mat-form-field>
          <button
            mat-raised-button
            color="primary"
            class="send-btn"
            [disabled]="!currentInput.trim() || isStreaming || !sessionId"
            aria-label="Envoyer le message"
            data-testid="send-button"
            (click)="onSendMessage()">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .chat-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100dvh;
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 8px 8px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }
    .chat-title { font-size: 18px; font-weight: 500; }
    .header-actions { display: flex; }

    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .suggestions-container {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      padding: 24px 0;
    }
    .suggestions-label {
      font-size: 13px;
      color: var(--mat-sys-outline);
      margin: 0 0 4px;
      text-align: center;
    }
    .suggestion-btn {
      text-align: left;
      white-space: normal;
      line-height: 1.4;
      min-height: 44px;
      padding: 8px 16px;
    }

    .message-row {
      display: flex;
      flex-direction: column;
      max-width: 80%;
    }
    .user-row { align-self: flex-end; align-items: flex-end; }
    .assistant-row { align-self: flex-start; align-items: flex-start; }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      min-height: 44px;
      display: flex;
      align-items: center;
    }
    .user-bubble {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      border-bottom-right-radius: 4px;
    }
    .assistant-bubble {
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
      border-bottom-left-radius: 4px;
    }
    .streaming-text { white-space: pre-wrap; }
    .typing-indicator {
      font-size: 20px;
      letter-spacing: 4px;
      opacity: 0.6;
      animation: blink 1s step-end infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.2; } }

    .copy-btn { opacity: 0.5; transition: opacity 0.2s; }
    .copy-btn:hover { opacity: 1; }

    .chat-footer {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding: 8px;
      flex-shrink: 0;
    }
    .token-row { display: flex; justify-content: center; }
    .input-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .input-field { flex: 1; }
    .send-btn {
      min-width: 56px;
      min-height: 44px;
      margin-bottom: 22px; /* align with mat-form-field bottom */
    }
  `],
})
export class CoachChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesList') private readonly messagesList!: ElementRef<HTMLElement>;

  protected messages: DisplayMessage[] = [];
  protected currentInput = '';
  protected isStreaming = false;
  protected sessionId: string | null = null;
  protected sessionTokens = 0;
  protected showSuggestions = true;
  protected copiedIndex: number | null = null;
  protected readonly suggestedQuestions = SUGGESTED_QUESTIONS;

  private contextWindow: CoachContextWindow = 'today';
  private previousSummary: string | undefined;
  private shouldScrollToBottom = false;

  private readonly sendMessageUseCase = inject(SendCoachMessageUseCase);
  private readonly summarizeUseCase = inject(SummarizeCoachSessionUseCase);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.openContextPicker();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  protected goToHistory(): void {
    this.router.navigate(['/coach/history']);
  }

  protected async onNewConversation(): Promise<void> {
    if (this.sessionId) {
      await this.summarizeUseCase.execute(this.sessionId);
    }
    this.messages = [];
    this.sessionId = null;
    this.sessionTokens = 0;
    this.showSuggestions = true;
    this.cdr.markForCheck();
    this.openContextPicker();
  }

  protected async onSendMessage(text?: string): Promise<void> {
    const message = (text ?? this.currentInput).trim();
    if (!message || this.isStreaming || !this.sessionId) return;

    this.currentInput = '';
    this.showSuggestions = false;
    this.messages = [
      ...this.messages,
      { role: 'user', content: message, isStreaming: false },
      { role: 'assistant', content: '', isStreaming: true },
    ];
    this.isStreaming = true;
    this.shouldScrollToBottom = true;
    this.cdr.markForCheck();

    const assistantIndex = this.messages.length - 1;
    const history: CoachMessage[] = this.messages
      .slice(0, assistantIndex)
      .map(m => ({ role: m.role, content: m.content }));

    const input: SendCoachMessageInput = {
      sessionId: this.sessionId,
      userMessage: message,
      history,
      context: this.buildCoachContext(),
    };

    try {
      for await (const token of this.sendMessageUseCase.execute(input)) {
        this.messages[assistantIndex] = {
          ...this.messages[assistantIndex],
          content: this.messages[assistantIndex].content + token,
        };
        this.shouldScrollToBottom = true;
        this.cdr.markForCheck();
      }
    } finally {
      this.messages[assistantIndex] = {
        ...this.messages[assistantIndex],
        isStreaming: false,
      };
      const responseLength = this.messages[assistantIndex].content.length;
      this.sessionTokens += Math.ceil(message.length / 4) + Math.ceil(responseLength / 4);
      this.isStreaming = false;
      this.cdr.markForCheck();
    }
  }

  protected async onCopy(content: string, index: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      this.copiedIndex = index;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedIndex = null;
        this.cdr.markForCheck();
      }, 2000);
    } catch {
      // Clipboard non disponible — aucune action silencieuse
    }
  }

  private openContextPicker(): void {
    const sheetRef = this.bottomSheet.open<
      CoachContextPickerComponent,
      void,
      StartCoachSessionResult
    >(CoachContextPickerComponent, { disableClose: true });

    sheetRef.afterDismissed().subscribe(result => {
      if (result) {
        this.sessionId = result.sessionId;
        this.contextWindow = result.contextWindow;
        this.previousSummary = result.previousSummary;
      }
      this.cdr.markForCheck();
    });
  }

  private buildCoachContext(): CoachContext {
    return {
      contextWindow: this.contextWindow,
      userConditions: [],
      protocol: '',
      activeTreatments: [],
      previousSessionSummary: this.previousSummary,
    };
  }

  private scrollToBottom(): void {
    const el = this.messagesList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
