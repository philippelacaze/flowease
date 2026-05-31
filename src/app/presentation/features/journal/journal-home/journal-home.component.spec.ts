import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { JournalHomeComponent } from './journal-home.component';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';
import { GetActiveCuresUseCase } from '../../../../application/journal/get-active-cures.usecase';
import { SaveWellbeingScoreUseCase } from '../../../../application/journal/save-wellbeing-score.usecase';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { FoodItemVO } from '../../../../domain/entities/meal.entity';
import type { JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import type { SymptomEntity } from '../../../../domain/entities/symptom.entity';

const LOW_ITEMS: FoodItemVO[] = [
  { name: 'Riz', fodmap: { level: 'low' }, confirmed: true },
  { name: 'Poulet', fodmap: { level: 'low' }, confirmed: true },
];
const HIGH_ITEMS: FoodItemVO[] = [
  { name: 'Oignon', fodmap: { level: 'high' }, confirmed: true },
  { name: 'Riz', fodmap: { level: 'low' }, confirmed: true },
];

function makeWellbeingEntry(intensity: number): JournalEntry {
  return {
    kind: 'symptom',
    data: {
      id: 'wb-1',
      category: 'wellbeing',
      symptomKey: 'wellbeing_score',
      intensity,
      occurredAt: new Date(),
      createdAt: new Date(),
    } as SymptomEntity,
  };
}

function makeRegularSymptomEntry(): JournalEntry {
  return {
    kind: 'symptom',
    data: {
      id: 'sym-1',
      category: 'digestive',
      symptomKey: 'bloating',
      intensity: 5,
      occurredAt: new Date(),
      createdAt: new Date(),
    } as SymptomEntity,
  };
}

type ComponentProtected = {
  hasFodmapHigh(items: ReadonlyArray<FoodItemVO>): boolean;
  startVoice(event: Event): void;
  startSymptomVoice(event: Event): void;
  startIntakeVoice(event: Event): void;
  startNoteVoice(event: Event): void;
  wellbeingScore: number | null;
  symptoms: JournalEntry[];
};

const DEFAULT_PROVIDERS = [
  provideRouter([]),
  { provide: GetActiveCuresUseCase, useValue: { execute: vi.fn().mockResolvedValue([]) } },
  { provide: SaveWellbeingScoreUseCase, useValue: { execute: vi.fn().mockResolvedValue('wb-id') } },
  { provide: LOCAL_SETTINGS_PORT, useValue: { getLanguage: () => 'fr', getApiKey: () => null } },
];

async function createComponent(journalEntries: JournalEntry[] = []) {
  await TestBed.configureTestingModule({
    imports: [JournalHomeComponent, NoopAnimationsModule],
    providers: [
      ...DEFAULT_PROVIDERS,
      { provide: GetJournalDayUseCase, useValue: { execute: vi.fn().mockResolvedValue(journalEntries) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(JournalHomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('JournalHomeComponent', () => {
  describe('hasFodmapHigh', () => {
    it('retourne true quand au moins un aliment est FODMAP high', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.hasFodmapHigh(HIGH_ITEMS)).toBe(true);
    });

    it('retourne false quand aucun aliment est FODMAP high', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.hasFodmapHigh(LOW_ITEMS)).toBe(false);
    });

    it('retourne false pour une liste vide', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.hasFodmapHigh([])).toBe(false);
    });
  });

  describe('boutons vocaux', () => {
    it('startSymptomVoice stoppe la propagation de l\'événement', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      comp.startSymptomVoice(event);
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    });

    it('startIntakeVoice stoppe la propagation de l\'événement', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      comp.startIntakeVoice(event);
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    });

    it('startNoteVoice stoppe la propagation de l\'événement', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      comp.startNoteVoice(event);
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    });

    it('startVoice stoppe la propagation de l\'événement', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const event = { stopPropagation: vi.fn() } as unknown as Event;
      comp.startVoice(event);
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    });
  });

  describe('bouton vocal repas QC', () => {
    it('le bouton qc-meal-voice appelle startVoice sur click', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const spy = vi.spyOn(comp, 'startVoice');
      const btn = fixture.nativeElement.querySelector('[data-testid="qc-meal-voice"]');
      btn.click();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('le bouton affiche "Vocal" par défaut (hors enregistrement)', async () => {
      const fixture = await createComponent();
      const btn = fixture.nativeElement.querySelector('[data-testid="qc-meal-voice"]');
      expect(btn.textContent).toContain('Vocal');
    });
  });

  describe('pré-remplissage du score de bien-être', () => {
    it('pré-remplit wellbeingScore depuis les entrées du jour', async () => {
      const fixture = await createComponent([makeWellbeingEntry(8)]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.wellbeingScore).toBe(8);
    });

    it('wellbeingScore reste null si aucune entrée de bien-être', async () => {
      const fixture = await createComponent([]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.wellbeingScore).toBeNull();
    });
  });

  describe('getter symptoms', () => {
    it('exclut les entrées wellbeing du bloc Symptômes', async () => {
      const fixture = await createComponent([makeWellbeingEntry(7), makeRegularSymptomEntry()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.symptoms.every(e => e.kind === 'symptom' && (e as Extract<JournalEntry, { kind: 'symptom' }>).data.category !== 'wellbeing')).toBe(true);
    });

    it('inclut les symptômes non-wellbeing', async () => {
      const fixture = await createComponent([makeWellbeingEntry(7), makeRegularSymptomEntry()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.symptoms).toHaveLength(1);
    });
  });
});
