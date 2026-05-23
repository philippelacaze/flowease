import { Routes } from '@angular/router';

export const JOURNAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./journal-home/journal-home.component').then(m => m.JournalHomeComponent),
  },
  {
    path: 'meal',
    loadComponent: () =>
      import('./meal-entry/meal-entry.component').then(m => m.MealEntryComponent),
  },
  {
    path: 'symptom',
    loadComponent: () =>
      import('./symptom-entry/symptom-entry.component').then(m => m.SymptomEntryComponent),
  },
  {
    path: 'intake',
    loadComponent: () =>
      import('./intake-entry/intake-entry.component').then(m => m.IntakeEntryComponent),
  },
  {
    path: 'note',
    loadComponent: () =>
      import('./note-entry/note-entry.component').then(m => m.NoteEntryComponent),
  },
];
