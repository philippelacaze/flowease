import { Routes } from '@angular/router';

export const COACH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./coach-chat/coach-chat.component').then(m => m.CoachChatComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./coach-history/coach-history.component').then(m => m.CoachHistoryComponent),
  },
];
