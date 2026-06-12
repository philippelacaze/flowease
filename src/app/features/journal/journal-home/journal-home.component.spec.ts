import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { vi } from 'vitest';
import { JournalHomeComponent } from './journal-home.component';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';
import { SettingsService } from '../../settings/services/settings.service';
import type { FoodItemVO, AiFodmapAlert } from '../../../core/models/entities/meal.entity';
import type { JournalEntry } from '../services/intake.service';
import type { SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { MealEntity } from '../../../core/models/entities/meal.entity';
import type { NoteEntity } from '../../../core/models/entities/note.entity';
import type { IntakeEntity } from '../../../core/models/entities/intake.entity';
import { IntakeService } from '../services/intake.service';
import { NoteService } from '../services/note.service';
import { SymptomService } from '../services/symptom.service';


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
  editMeal(data: MealEntity): void;
  editNote(data: NoteEntity): void;
  confirmTag(note: NoteEntity, tag: string): void;
  rejectTag(note: NoteEntity, tag: string): void;
  confirmAllTags(note: NoteEntity): void;
  addFreeTag(note: NoteEntity, inputEl: HTMLInputElement): void;
  treatmentName(id: string): string;
  symptoms: JournalEntry[];
  entries: JournalEntry[];
};

function makeIntakeMock(journalEntries: JournalEntry[] = [], treatments: TreatmentEntity[] = []) {
  return {
    getJournalDay: vi.fn().mockResolvedValue(journalEntries),
    getActiveCures: vi.fn().mockResolvedValue([]),
    getAllTreatments: vi.fn().mockResolvedValue(treatments),
    getSuggestions: vi.fn().mockResolvedValue([]),
    confirm: vi.fn().mockResolvedValue('intake-id'),
    edit: vi.fn().mockResolvedValue(undefined),
    getActiveTreatments: vi.fn().mockResolvedValue([]),
  };
}

async function createComponent(journalEntries: JournalEntry[] = [], treatments: TreatmentEntity[] = []) {
  await TestBed.configureTestingModule({
    imports: [JournalHomeComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: IntakeService, useValue: makeIntakeMock(journalEntries, treatments) },
      { provide: NoteService, useValue: { confirmTags: vi.fn().mockResolvedValue(undefined) } },
      { provide: SymptomService, useValue: { getAllConfigs: vi.fn().mockResolvedValue([
        { key: 'bloating',           label: 'Ballonnements' },
        { key: 'wellbeing_score',    label: 'Score de bien-être' },
        { key: 'abdominal_pain',     label: 'Douleur abdominale' },
      ]) } },

      { provide: SettingsService, useValue: { scheduleReminders: vi.fn().mockResolvedValue(undefined) } },
      { provide: NotificationService, useValue: { getPermissionStatus: () => 'default', scheduleReminders: vi.fn(), cancelReminders: vi.fn(), requestPermission: vi.fn() } },
      { provide: LocalSettingsService, useValue: { getLanguage: () => 'fr', getApiKey: () => null } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(JournalHomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function makeMealEntry(items: FoodItemVO[], aiFodmapFlags?: AiFodmapAlert[]): JournalEntry {
  return {
    kind: 'meal',
    data: {
      id: 'meal-1',
      occurredAt: new Date(),
      createdAt: new Date(),
      type: 'lunch',
      inputMode: 'photo',
      items,
      aiFodmapFlags,
    } as MealEntity,
  };
}

function makeNoteEntry(): JournalEntry {
  return {
    kind: 'note',
    data: {
      id: 'note-1',
      createdAt: new Date(),
      occurredAt: new Date(),
      inputMode: 'text',
      content: 'Contenu de test',
      tags: [],
      summary: '',
      linkedEntries: [],
    } as NoteEntity,
  };
}

function makeNoteWithSuggestions(suggestions: string[]): JournalEntry {
  return {
    kind: 'note',
    data: {
      id: 'note-suggestions',
      createdAt: new Date(),
      occurredAt: new Date(),
      inputMode: 'text',
      content: 'Note avec suggestions IA',
      tags: [],
      aiTagSuggestions: suggestions,
      summary: 'Résumé IA',
      linkedEntries: [],
    } as NoteEntity,
  };
}

function makeIntakeEntry(): JournalEntry {
  return {
    kind: 'intake',
    data: {
      id: 'intake-1',
      treatmentId: 'treatment-1',
      scheduledAt: new Date(),
      confirmedAt: new Date(),
      createdAt: new Date(),
      status: 'taken',
    } as IntakeEntity,
  };
}

describe('JournalHomeComponent', () => {
  describe('restauration de la date depuis le router state', () => {
    afterEach(() => history.replaceState({}, ''));

    it('currentDate est restaurée depuis history.state.journalDate au chargement', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      history.replaceState({ journalDate: yesterday.toISOString() }, '');

      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { currentDate: Date };
      expect(comp.currentDate.toDateString()).toBe(yesterday.toDateString());
    });

    it('currentDate reste aujourd\'hui si history.state ne contient pas journalDate', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { currentDate: Date };
      expect(comp.currentDate.toDateString()).toBe(new Date().toDateString());
    });
  });

  describe('treatmentName — résolution id → nom', () => {
    it('retourne le nom du traitement quand l\'id est dans la map', async () => {
      const treatment: TreatmentEntity = {
        id: 'treat-abc',
        name: 'Rifaximine 550mg',
        category: 'antibiotic',
        mode: 'oral',
        dosage: '550',
        unit: 'mg',
        frequency: 2,
        reminder: { enabled: false, times: [], soundEnabled: false },
        notes: '',
        active: true,
        startedAt: new Date(),
        createdAt: new Date(),
      };
      const fixture = await createComponent([], [treatment]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.treatmentName('treat-abc')).toBe('Rifaximine 550mg');
    });

    it('retourne l\'id comme fallback quand le traitement est inconnu', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.treatmentName('unknown-id')).toBe('unknown-id');
    });

    it('affiche le nom dans la carte prise en lieu et place de l\'id', async () => {
      const treatment: TreatmentEntity = {
        id: 'treat-xyz',
        name: 'Magnésium',
        category: 'supplement',
        mode: 'oral',
        dosage: '300',
        unit: 'mg',
        frequency: 1,
        reminder: { enabled: false, times: [], soundEnabled: false },
        notes: '',
        active: true,
        startedAt: new Date(),
        createdAt: new Date(),
      };
      const intake: JournalEntry = {
        kind: 'intake',
        data: {
          id: 'intake-1',
          treatmentId: 'treat-xyz',
          scheduledAt: new Date(),
          confirmedAt: new Date(),
          createdAt: new Date(),
          status: 'taken',
        } as IntakeEntity,
      };
      const fixture = await createComponent([intake], [treatment]);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('[data-testid="intake-entry"] .entry-label') as HTMLElement;
      expect(label.textContent?.trim()).toBe('Magnésium');
    });

    it('affiche le nom libre pour une prise ponctuelle (medicationName, sans treatmentId)', async () => {
      const intake: JournalEntry = {
        kind: 'intake',
        data: {
          id: 'adhoc-1',
          medicationName: 'Spasfon',
          actualDose: '2 cp',
          scheduledAt: new Date(),
          confirmedAt: new Date(),
          createdAt: new Date(),
          status: 'taken',
        } as IntakeEntity,
      };
      const fixture = await createComponent([intake], []);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('[data-testid="intake-entry"] .entry-label') as HTMLElement;
      expect(label.textContent?.trim()).toBe('Spasfon');
      const dose = fixture.nativeElement.querySelector('[data-testid="intake-dose"]') as HTMLElement;
      expect(dose.textContent?.trim()).toBe('2 cp');
    });
  });

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


  describe('alertes FODMAP IA dans les cartes repas', () => {
    it('affiche une alerte danger quand aiFodmapFlags contient un élément severity danger', async () => {
      const flags: AiFodmapAlert[] = [
        { item: 'Oignon', reason: 'Contient des fructanes', severity: 'danger' },
      ];
      const fixture = await createComponent([makeMealEntry(HIGH_ITEMS, flags)]);
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('.fodmap-alert--danger');
      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain('Oignon');
    });

    it('affiche une alerte warning quand aiFodmapFlags contient un élément severity warning', async () => {
      const flags: AiFodmapAlert[] = [
        { item: 'Blé', reason: 'Fructanes à dose modérée', severity: 'warning' },
      ];
      const fixture = await createComponent([makeMealEntry(LOW_ITEMS, flags)]);
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('.fodmap-alert--warning');
      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain('Blé');
    });

    it('n\'affiche aucune alerte quand aiFodmapFlags est absent', async () => {
      const fixture = await createComponent([makeMealEntry(LOW_ITEMS)]);
      fixture.detectChanges();
      const alerts = fixture.nativeElement.querySelectorAll('.fodmap-alert');
      expect(alerts).toHaveLength(0);
    });

    it('n\'affiche aucune alerte quand aiFodmapFlags est un tableau vide', async () => {
      const fixture = await createComponent([makeMealEntry(LOW_ITEMS, [])]);
      fixture.detectChanges();
      const alerts = fixture.nativeElement.querySelectorAll('.fodmap-alert');
      expect(alerts).toHaveLength(0);
    });

    it('affiche autant d\'alertes que d\'éléments dans aiFodmapFlags', async () => {
      const flags: AiFodmapAlert[] = [
        { item: 'Oignon', reason: 'Fructanes', severity: 'danger' },
        { item: 'Ail', reason: 'Fructanes élevés', severity: 'danger' },
      ];
      const fixture = await createComponent([makeMealEntry(HIGH_ITEMS, flags)]);
      fixture.detectChanges();
      const alerts = fixture.nativeElement.querySelectorAll('.fodmap-alert');
      expect(alerts).toHaveLength(2);
    });
  });

  describe('boutons d\'édition', () => {
    it('affiche un bouton édition sur les cartes repas', async () => {
      const fixture = await createComponent([makeMealEntry(LOW_ITEMS)]);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="edit-meal-btn"]');
      expect(btn).not.toBeNull();
    });

    it('affiche un bouton édition sur les cartes notes', async () => {
      const fixture = await createComponent([makeNoteEntry()]);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="edit-note-btn"]');
      expect(btn).not.toBeNull();
    });

    it('affiche un bouton édition sur les cartes prises', async () => {
      const fixture = await createComponent([makeIntakeEntry()]);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="edit-intake-btn"]');
      expect(btn).not.toBeNull();
    });

    it('le clic sur edit-meal-btn appelle editMeal', async () => {
      const fixture = await createComponent([makeMealEntry(LOW_ITEMS)]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const spy = vi.spyOn(comp as never, 'editMeal' as never);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="edit-meal-btn"]');
      btn.click();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('le clic sur edit-note-btn appelle editNote', async () => {
      const fixture = await createComponent([makeNoteEntry()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const spy = vi.spyOn(comp as never, 'editNote' as never);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="edit-note-btn"]');
      btn.click();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('getter symptoms', () => {
    it('inclut les entrées wellbeing dans le bloc Symptômes', async () => {
      const fixture = await createComponent([makeWellbeingEntry(7), makeRegularSymptomEntry()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      expect(comp.symptoms).toHaveLength(2);
    });

    it('inclut tous les symptômes quelle que soit leur catégorie', async () => {
      const fixture = await createComponent([makeWellbeingEntry(7), makeRegularSymptomEntry()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const categories = comp.symptoms.map(e => (e as Extract<JournalEntry, { kind: 'symptom' }>).data.category);
      expect(categories).toContain('wellbeing');
      expect(categories).toContain('digestive');
    });
  });

  describe('suggestions IA sur les notes', () => {
    it('affiche la section suggestions si aiTagSuggestions est non vide', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes', 'sibo'])]);
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector('[data-testid="note-ai-suggestions"]');
      expect(section).not.toBeNull();
    });

    it('n\'affiche pas la section suggestions si aiTagSuggestions est absent', async () => {
      const fixture = await createComponent([makeNoteEntry()]);
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector('[data-testid="note-ai-suggestions"]');
      expect(section).toBeNull();
    });

    it('affiche autant de chips que de suggestions', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes', 'sibo', 'post-repas'])]);
      fixture.detectChanges();
      const chips = fixture.nativeElement.querySelectorAll('[data-testid^="note-ai-chip-"]');
      expect(chips).toHaveLength(3);
    });

    it('affiche un bouton valider et un bouton rejeter par suggestion', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes'])]);
      fixture.detectChanges();
      const confirm = fixture.nativeElement.querySelector('[data-testid="note-ai-confirm-crampes"]');
      const reject = fixture.nativeElement.querySelector('[data-testid="note-ai-reject-crampes"]');
      expect(confirm).not.toBeNull();
      expect(reject).not.toBeNull();
    });

    it('affiche le bouton "Tout valider"', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes'])]);
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="note-ai-confirm-all-btn"]');
      expect(btn).not.toBeNull();
    });

    it('confirmTag ajoute le tag à tags[] et le retire de aiTagSuggestions', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes', 'sibo'])]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const note = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      comp.confirmTag(note, 'crampes');
      const updatedNote = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      expect(updatedNote.tags).toContain('crampes');
      expect(updatedNote.aiTagSuggestions).not.toContain('crampes');
      expect(updatedNote.aiTagSuggestions).toContain('sibo');
    });

    it('rejectTag retire le tag de aiTagSuggestions sans l\'ajouter à tags[]', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes', 'sibo'])]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const note = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      comp.rejectTag(note, 'crampes');
      const updatedNote = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      expect(updatedNote.tags).not.toContain('crampes');
      expect(updatedNote.aiTagSuggestions).not.toContain('crampes');
    });

    it('confirmAllTags déplace toutes les suggestions dans tags[] et vide aiTagSuggestions', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes', 'sibo'])]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const note = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      comp.confirmAllTags(note);
      const updatedNote = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      expect(updatedNote.tags).toEqual(['crampes', 'sibo']);
      expect(updatedNote.aiTagSuggestions).toEqual([]);
    });

    it('addFreeTag ajoute un tag dans tags[] sans modifier aiTagSuggestions', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes'])]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const note = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      const fakeInput = { value: 'douleur', trim: () => 'douleur' } as unknown as HTMLInputElement;
      Object.defineProperty(fakeInput, 'value', { get: () => 'douleur', set: vi.fn() });
      comp.addFreeTag(note, fakeInput);
      const updatedNote = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      expect(updatedNote.tags).toContain('douleur');
      expect(updatedNote.aiTagSuggestions).toContain('crampes');
    });

    it('addFreeTag ignore un tag vide', async () => {
      const fixture = await createComponent([makeNoteWithSuggestions(['crampes'])]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;
      const note = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      const fakeInput = { value: '   ' } as unknown as HTMLInputElement;
      comp.addFreeTag(note, fakeInput);
      const updatedNote = (comp.entries[0] as Extract<JournalEntry, { kind: 'note' }>).data;
      expect(updatedNote.tags).toHaveLength(0);
    });
  });
});
