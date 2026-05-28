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

import { Router } from '@angular/router';
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
    TokenCounterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coach-chat.component.html',
  styleUrl: './coach-chat.component.scss',
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

  protected onEnterKey(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      void this.onSendMessage();
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

  protected openContextPicker(): void {
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
