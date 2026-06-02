import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { NoteEntryComponent } from './note-entry.component';
import { AddNoteUseCase } from '../../../../application/journal/add-note.usecase';
import { EditNoteUseCase } from '../../../../application/journal/edit-note.usecase';
import { TagNoteUseCase } from '../../../../application/journal/tag-note.usecase';
import { GetJournalDayUseCase } from '../../../../application/journal/get-journal-day.usecase';
import type { NoteInputMode } from '../../../../domain/entities/note.entity';

type ComponentPrivate = {
  mode: NoteInputMode;
  content: string;
  saving: boolean;
  imageBase64: string | null;
  modes: Array<{ key: NoteInputMode; emoji: string; label: string }>;
  canSubmit: boolean;
  setMode(m: NoteInputMode): void;
  submit(): Promise<void>;
};

async function createComponent() {
  const mockAddNote = { execute: vi.fn().mockResolvedValue('note-id') };
  const mockEditNote = { execute: vi.fn().mockResolvedValue(undefined) };
  const mockTagNote = { execute: vi.fn().mockResolvedValue({ tags: ['tag1'] }) };
  const mockGetJournalDay = { execute: vi.fn().mockResolvedValue([]) };
  const mockBottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => ({ toPromise: () => Promise.resolve(undefined) }) }) };

  await TestBed.configureTestingModule({
    imports: [NoteEntryComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: AddNoteUseCase, useValue: mockAddNote },
      { provide: EditNoteUseCase, useValue: mockEditNote },
      { provide: TagNoteUseCase, useValue: mockTagNote },
      { provide: GetJournalDayUseCase, useValue: mockGetJournalDay },
      { provide: MatBottomSheet, useValue: mockBottomSheet },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(NoteEntryComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, mockAddNote, mockTagNote };
}

describe('NoteEntryComponent', () => {

  describe('initialisation', () => {
    it('démarre en mode "text" par défaut', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.mode).toBe('text');
    });

    it('affiche 3 onglets de mode', async () => {
      const { fixture } = await createComponent();
      const tabs = fixture.debugElement.queryAll(By.css('.note-mode-tab'));
      expect(tabs).toHaveLength(3);
    });

    it('le tableau modes contient text, voice et photo dans l\'ordre', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.modes.map(m => m.key)).toEqual(['text', 'voice', 'photo']);
    });

    it('chaque mode a une clé, un emoji et un label', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      for (const m of comp.modes) {
        expect(m.key).toBeTruthy();
        expect(m.emoji).toBeTruthy();
        expect(m.label).toBeTruthy();
      }
    });
  });

  describe('setMode', () => {
    it('change le mode courant', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.setMode('voice');
      expect(comp.mode).toBe('voice');
    });

    it('réinitialise le contenu lors du changement de mode', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'texte existant';
      comp.setMode('voice');
      expect(comp.content).toBe('');
    });

    it('réinitialise imageBase64 lors du changement de mode', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.imageBase64 = 'base64data';
      comp.setMode('text');
      expect(comp.imageBase64).toBeNull();
    });
  });

  describe('canSubmit', () => {
    it('retourne false si content est vide et pas d\'image', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      expect(comp.canSubmit).toBe(false);
    });

    it('retourne true si content est non vide', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'Ma note de test';
      expect(comp.canSubmit).toBe(true);
    });

    it('retourne true si imageBase64 est défini', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.imageBase64 = 'base64data';
      expect(comp.canSubmit).toBe(true);
    });
  });

  describe('soumission', () => {
    it('ne soumet pas si contenu vide', async () => {
      const { fixture, mockAddNote } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      await comp.submit();
      expect(mockAddNote.execute).not.toHaveBeenCalled();
    });

    it('appelle addNote.execute avec le contenu et le mode courant', async () => {
      const { fixture, mockAddNote } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'Ballonnements après déjeuner';
      await comp.submit();
      expect(mockAddNote.execute).toHaveBeenCalledOnce();
      expect(mockAddNote.execute).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Ballonnements après déjeuner', inputMode: 'text' }),
      );
    });

    it('ne re-soumet pas si déjà en cours de saving', async () => {
      const { fixture, mockAddNote } = await createComponent();
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'Note test';
      comp.saving = true;
      await comp.submit();
      expect(mockAddNote.execute).not.toHaveBeenCalled();
    });
  });

  describe('date du journal sélectionnée', () => {
    afterEach(() => history.replaceState({}, ''));

    function daysAgo(n: number): Date {
      const d = new Date();
      d.setDate(d.getDate() - n);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    async function createWithJournalDate(date: Date) {
      history.replaceState({ journalDate: date.toISOString() }, '');
      return createComponent();
    }

    it('occurredAt a le bon jour quand journalDate = il y a 3 jours', async () => {
      const ref = daysAgo(3);
      const { fixture, mockAddNote } = await createWithJournalDate(ref);
      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'Note rétrospective';
      await comp.submit();
      const callArg = mockAddNote.execute.mock.calls[0][0] as { occurredAt: Date };
      expect(callArg.occurredAt.getFullYear()).toBe(ref.getFullYear());
      expect(callArg.occurredAt.getMonth()).toBe(ref.getMonth());
      expect(callArg.occurredAt.getDate()).toBe(ref.getDate());
    });

    it('isRetrospective est vrai quand journalDate est antérieure à aujourd\'hui', async () => {
      const { fixture } = await createWithJournalDate(daysAgo(3));
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(true);
    });

    it('isRetrospective est faux quand journalDate est aujourd\'hui', async () => {
      const { fixture } = await createComponent();
      const comp = fixture.componentInstance as unknown as { isRetrospective: boolean };
      expect(comp.isRetrospective).toBe(false);
    });

    it('affiche data-testid="retrospective-banner" quand journalDate est antérieure', async () => {
      const { fixture } = await createWithJournalDate(daysAgo(3));
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).not.toBeNull();
    });

    it('n\'affiche pas data-testid="retrospective-banner" pour le jour courant', async () => {
      const { fixture } = await createComponent();
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="retrospective-banner"]'));
      expect(banner).toBeNull();
    });

    it('submit navigue vers /journal avec journalDate dans le state', async () => {
      const ref = daysAgo(3);
      const { fixture } = await createWithJournalDate(ref);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const comp = fixture.componentInstance as unknown as ComponentPrivate;
      comp.content = 'Note de retour';
      await comp.submit();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
      );
    });

    it('back() navigue vers /journal avec journalDate dans le state', async () => {
      const ref = daysAgo(3);
      const { fixture } = await createWithJournalDate(ref);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      (fixture.componentInstance as unknown as { back(): void }).back();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/journal'],
        expect.objectContaining({ state: expect.objectContaining({ journalDate: ref.toISOString() }) }),
      );
    });
  });

  describe('éléments DOM', () => {
    it('affiche la textarea data-testid="note-text-input" en mode texte', async () => {
      const { fixture } = await createComponent();
      const input = fixture.debugElement.query(By.css('[data-testid="note-text-input"]'));
      expect(input).not.toBeNull();
    });

    it('affiche le bouton data-testid="submit-note"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="submit-note"]'));
      expect(btn).not.toBeNull();
    });

    it('affiche le bouton data-testid="link-entries-btn"', async () => {
      const { fixture } = await createComponent();
      const btn = fixture.debugElement.query(By.css('[data-testid="link-entries-btn"]'));
      expect(btn).not.toBeNull();
    });

    it('l\'onglet "text" est actif par défaut', async () => {
      const { fixture } = await createComponent();
      const activeTab = fixture.debugElement.query(By.css('.note-mode-tab--active'));
      expect(activeTab).not.toBeNull();
      expect(activeTab.nativeElement.textContent).toContain('Texte');
    });
  });
});
