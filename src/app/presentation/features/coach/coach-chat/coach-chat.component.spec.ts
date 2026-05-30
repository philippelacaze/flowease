import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { CoachChatComponent } from './coach-chat.component';
import { SendCoachMessageUseCase } from '../../../../application/coach/send-coach-message.usecase';
import { SummarizeCoachSessionUseCase } from '../../../../application/coach/summarize-coach-session.usecase';
import { BuildCoachContextUseCase } from '../../../../application/coach/build-coach-context.usecase';
import { StartCoachSessionUseCase } from '../../../../application/coach/start-coach-session.usecase';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';

const DEFAULT_CONTEXT = { contextWindow: '14d', userConditions: [], protocol: 'none', activeTreatments: [] };
const DEFAULT_SESSION = { sessionId: 'default-session', contextWindow: '14d', previousSummary: undefined };

const mockSend = { execute: vi.fn().mockReturnValue((async function* () {})()) };
const mockSummarize = { execute: vi.fn().mockResolvedValue(undefined) };
const mockBuildContext = { execute: vi.fn().mockResolvedValue(DEFAULT_CONTEXT) };
const mockStartSession = { execute: vi.fn().mockResolvedValue(DEFAULT_SESSION) };
const mockBottomSheet = {
  open: vi.fn().mockReturnValue({
    afterDismissed: () => of(undefined),
  }),
};
const mockSettings = {
  getDefaultContextWindow: vi.fn().mockReturnValue('14d'),
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
      { provide: StartCoachSessionUseCase, useValue: mockStartSession },
      { provide: MatBottomSheet, useValue: mockBottomSheet },
      { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CoachChatComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges(); // applique les changements OnPush après la résolution de l'async
  return fixture;
}

describe('CoachChatComponent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('initialisation automatique', () => {
    it('démarre la session avec le contexte par défaut sans ouvrir le bottom sheet', async () => {
      await createComponent();
      expect(mockStartSession.execute).toHaveBeenCalledWith('14d');
      expect(mockBottomSheet.open).not.toHaveBeenCalled();
    });

    it('construit le contexte pour la fenêtre par défaut', async () => {
      await createComponent();
      expect(mockBuildContext.execute).toHaveBeenCalledWith('14d');
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

  describe('chip de contexte actif', () => {
    it('affiche le chip avec le label du contexte par défaut', async () => {
      const fixture = await createComponent();
      const chip = fixture.nativeElement.querySelector('[data-testid="btn-change-context"]');
      expect(chip).not.toBeNull();
      expect(chip.textContent).toContain('14 derniers jours');
    });

    it('le chip est désactivé tant que sessionId est null (avant résolution async)', async () => {
      // Vérifie l'état INITIAL du composant avant que initSession() ait résolu
      await TestBed.configureTestingModule({
        imports: [CoachChatComponent, NoopAnimationsModule],
        providers: [
          provideRouter([]),
          { provide: SendCoachMessageUseCase, useValue: mockSend },
          { provide: SummarizeCoachSessionUseCase, useValue: mockSummarize },
          { provide: BuildCoachContextUseCase, useValue: { execute: vi.fn().mockReturnValue(new Promise(() => {})) } },
          { provide: StartCoachSessionUseCase, useValue: { execute: vi.fn().mockReturnValue(new Promise(() => {})) } },
          { provide: MatBottomSheet, useValue: mockBottomSheet },
          { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(CoachChatComponent);
      fixture.detectChanges(); // ngOnInit démarre mais les promises ne se résolvent jamais
      const chip = fixture.nativeElement.querySelector('[data-testid="btn-change-context"]');
      expect(chip.disabled).toBe(true);
      TestBed.resetTestingModule(); // nettoyage explicite pour éviter toute contamination
    });
  });

  describe('bouton Modifier (ouverture volontaire du picker)', () => {
    it('le chip est présent dans le header', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="btn-change-context"]')).not.toBeNull();
    });

    it('openContextPicker() ouvre le bottom sheet avec disableClose: false et le contexte actif en data', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { openContextPicker(): void };
      comp.openContextPicker();
      expect(mockBottomSheet.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ disableClose: false, data: { currentWindow: '14d' } }),
      );
    });

    it('fermer le picker sans sélection (null) ne change pas le contexte actif', async () => {
      mockBottomSheet.open.mockReturnValue({ afterDismissed: () => of(undefined) });
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as {
        openContextPicker(): void;
        activeContextWindow: { (): string };
      };
      const before = comp.activeContextWindow();
      comp.openContextPicker();
      await fixture.whenStable();
      expect(comp.activeContextWindow()).toBe(before);
    });

    it('une sélection dans le picker met à jour activeContextWindow', async () => {
      const newSession = { sessionId: 'new-session', contextWindow: '7d', previousSummary: undefined };
      mockBottomSheet.open.mockReturnValue({ afterDismissed: () => of(newSession) });
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as {
        openContextPicker(): void;
        activeContextWindow: { (): string };
      };
      comp.openContextPicker();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(comp.activeContextWindow()).toBe('7d');
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
    it('démarre une nouvelle session avec le contexte par défaut sans ouvrir le picker', async () => {
      const fixture = await createComponent();
      mockStartSession.execute.mockClear();
      mockBottomSheet.open.mockClear();

      const comp = fixture.componentInstance as unknown as { onNewConversation(): Promise<void> };
      await comp.onNewConversation();

      expect(mockStartSession.execute).toHaveBeenCalledWith('14d');
      expect(mockBottomSheet.open).not.toHaveBeenCalled();
    });

    it('réinitialise les messages', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as {
        messages: unknown[];
        onNewConversation(): Promise<void>;
      };
      comp.messages = [{ role: 'user', content: 'test', isStreaming: false }];
      await comp.onNewConversation();
      expect(comp.messages).toHaveLength(0);
    });
  });
});
