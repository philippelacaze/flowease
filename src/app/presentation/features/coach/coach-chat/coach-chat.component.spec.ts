import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CoachChatComponent } from './coach-chat.component';
import { SendCoachMessageUseCase } from '../../../../application/coach/send-coach-message.usecase';
import { SummarizeCoachSessionUseCase } from '../../../../application/coach/summarize-coach-session.usecase';
import { BuildCoachContextUseCase } from '../../../../application/coach/build-coach-context.usecase';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';

const mockSend = {
  execute: vi.fn().mockReturnValue((async function* () {})()),
};
const mockSummarize = { execute: vi.fn().mockResolvedValue(undefined) };
const mockBuildContext = {
  execute: vi.fn().mockResolvedValue({
    contextWindow: 'today',
    userConditions: [],
    protocol: 'none',
    activeTreatments: [],
  }),
};
const mockBottomSheet = {
  open: vi.fn().mockReturnValue({
    afterDismissed: () => ({
      subscribe: (fn: (r: unknown) => void) => fn({ sessionId: 'test-session', contextWindow: 'today', previousSummary: undefined }),
    }),
  }),
};
const mockSettings = {
  getShowTokenCounter: vi.fn().mockReturnValue(false),
  getApiKey: vi.fn().mockReturnValue(null),
};

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [CoachChatComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: SendCoachMessageUseCase, useValue: mockSend },
      { provide: SummarizeCoachSessionUseCase, useValue: mockSummarize },
      { provide: BuildCoachContextUseCase, useValue: mockBuildContext },
      { provide: MatBottomSheet, useValue: mockBottomSheet },
      { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CoachChatComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('CoachChatComponent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initialisation', () => {
    it('ouvre le context picker au démarrage', async () => {
      await createComponent();
      expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    });

    it('affiche les suggestions quand aucun message n\'a été envoyé', async () => {
      const fixture = await createComponent();
      const container = fixture.nativeElement.querySelector('.suggestions-container');
      expect(container).not.toBeNull();
    });

    it('affiche le textarea de saisie', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="chat-input"]')).not.toBeNull();
    });
  });

  describe('header', () => {
    it('affiche le bouton historique', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-history"]')).not.toBeNull();
    });

    it('affiche le bouton nouvelle conversation', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-new-conversation"]')).not.toBeNull();
    });
  });

  describe('envoi de message', () => {
    it('le bouton envoi est désactivé quand le champ est vide', async () => {
      const fixture = await createComponent();
      const sendBtn = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      expect(sendBtn.disabled).toBe(true);
    });

    it('le bouton envoi est actif quand le champ est rempli et la session ouverte', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { currentInput: string };
      comp.currentInput = 'Bonjour Coach';
      fixture.detectChanges();
      const sendBtn = fixture.nativeElement.querySelector('[data-testid="send-button"]');
      expect(sendBtn.disabled).toBe(false);
    });
  });

  describe('onEnterKey', () => {
    it('envoie le message sur Enter sans Shift', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as {
        onEnterKey(e: Event): void;
        onSendMessage(): Promise<void>;
        currentInput: string;
        sessionId: string;
      };
      comp.currentInput = 'Test';
      comp.sessionId = 'test-session';
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      comp.onEnterKey(event);
      expect(preventDefault).toHaveBeenCalledOnce();
    });

    it('n\'envoie pas sur Shift+Enter', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { onEnterKey(e: Event): void };
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      comp.onEnterKey(event);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('suggestions', () => {
    it('affiche 4 suggestions', async () => {
      const fixture = await createComponent();
      const btns = fixture.nativeElement.querySelectorAll('[data-testid^="suggestion-"]');
      expect(btns).toHaveLength(4);
    });
  });

  describe('nouvelle conversation', () => {
    it('rouvre le context picker sur nouvelle conversation', async () => {
      const fixture = await createComponent();
      mockBottomSheet.open.mockClear();
      const comp = fixture.componentInstance as unknown as { onNewConversation(): Promise<void> };
      await comp.onNewConversation();
      expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    });
  });
});
