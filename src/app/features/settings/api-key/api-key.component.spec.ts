import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ApiKeyComponent } from './api-key.component';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { SettingsService } from '../services/settings.service';
import { PromptCatalogService, type ResolvedPrompt } from '../../../core/services/ai/prompt-catalog.service';

const MOCK_PROMPTS: ResolvedPrompt[] = [
  { id: 'meal_photo', label: 'Analyse photo de repas (A.1)', description: 'desc 1', resolved: true, placeholders: [], text: 'PROMPT PHOTO RÉSOLU' },
  { id: 'analysis', label: 'Analyse de tendances (A.4)', description: 'desc 2', resolved: false, placeholders: ['{{WINDOW_DAYS}}'], text: 'PROMPT ANALYSE PATTERN' },
];

function makeSettingsMock() {
  return {
    hasApiKey: vi.fn().mockReturnValue(false),
    getApiKey: vi.fn().mockReturnValue(null),
    setApiKey: vi.fn(),
    clearApiKey: vi.fn(),
  };
}

describe('ApiKeyComponent', () => {
  let fixture: ComponentFixture<ApiKeyComponent>;
  let catalog: { resolveAll: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    catalog = { resolveAll: vi.fn().mockResolvedValue([...MOCK_PROMPTS]) };

    await TestBed.configureTestingModule({
      imports: [ApiKeyComponent, NoopAnimationsModule],
      providers: [
        { provide: LocalSettingsService, useValue: makeSettingsMock() },
        { provide: SettingsService, useValue: { testApiKey: vi.fn() } },
        { provide: PromptCatalogService, useValue: catalog },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('affiche le titre de page "IA"', () => {
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent?.trim()).toBe('IA');
  });

  it('résout les prompts à l\'entrée sur la page', () => {
    expect(catalog.resolveAll).toHaveBeenCalledTimes(1);
  });

  it('rend un textarea en lecture seule par prompt résolu', () => {
    const textareas = fixture.nativeElement.querySelectorAll('[data-testid^="prompt-textarea-"]') as NodeListOf<HTMLTextAreaElement>;
    expect(textareas.length).toBe(MOCK_PROMPTS.length);
    for (const ta of textareas) {
      expect(ta.readOnly).toBe(true);
    }
  });

  it('affiche le texte résolu de chaque prompt dans son textarea', () => {
    const photo = fixture.nativeElement.querySelector('[data-testid="prompt-textarea-meal_photo"]') as HTMLTextAreaElement;
    expect(photo.value).toBe('PROMPT PHOTO RÉSOLU');
  });

  it('liste les variables injectées d\'un pattern', () => {
    const analysisCard = fixture.nativeElement.querySelector('[data-testid="prompt-analysis"]') as HTMLElement;
    expect(analysisCard.textContent).toContain('{{WINDOW_DAYS}}');
  });
});
