import type { Page } from '@playwright/test';

/**
 * Injecte un mock de la Web Speech API avant le chargement de la page.
 * Expose window.__mockSpeechResult(transcript) pour déclencher un résultat.
 * Doit être appelée avant page.goto().
 */
export async function installSpeechMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class MockSpeechRecognition {
      lang = 'fr-FR';
      interimResults = false;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        (window as Record<string, unknown>)['__activeSpeechRecognition'] = this;
      }

      stop(): void {
        this.onend?.();
      }
    }

    (window as Record<string, unknown>)['SpeechRecognition'] = MockSpeechRecognition;
    (window as Record<string, unknown>)['webkitSpeechRecognition'] = MockSpeechRecognition;

    (window as Record<string, unknown>)['__mockSpeechResult'] = (transcript: string) => {
      const recognition = (window as Record<string, unknown>)['__activeSpeechRecognition'] as
        | MockSpeechRecognition
        | undefined;
      if (!recognition?.onresult) return;

      const event = {
        results: {
          length: 1,
          item: (_i: number) => ({
            isFinal: true,
            length: 1,
            0: { transcript, confidence: 1 },
          }),
          0: {
            isFinal: true,
            length: 1,
            0: { transcript, confidence: 1 },
          },
        },
      };

      recognition.onresult(event);
      recognition.onend?.();
    };
  });
}
