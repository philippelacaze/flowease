import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { JournalHomeComponent } from './journal-home.component';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { FoodItemVO } from '../../../../domain/entities/meal.entity';

const LOW_ITEMS: FoodItemVO[] = [
  { name: 'Riz', fodmap: { level: 'low' }, confirmed: true },
  { name: 'Poulet', fodmap: { level: 'low' }, confirmed: true },
];
const HIGH_ITEMS: FoodItemVO[] = [
  { name: 'Oignon', fodmap: { level: 'high' }, confirmed: true },
  { name: 'Riz', fodmap: { level: 'low' }, confirmed: true },
];

type ComponentProtected = {
  hasFodmapHigh(items: ReadonlyArray<FoodItemVO>): boolean;
  startVoice(event: Event): void;
  startSymptomVoice(event: Event): void;
  startIntakeVoice(event: Event): void;
  startNoteVoice(event: Event): void;
};

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [JournalHomeComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: GetJournalDayUseCase, useValue: { execute: vi.fn().mockResolvedValue([]) } },
      { provide: LOCAL_SETTINGS_PORT, useValue: { getLanguage: () => 'fr', getApiKey: () => null } },
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
});
