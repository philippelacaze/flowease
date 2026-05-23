import { Routes } from '@angular/router';
import { apiKeyGuard } from './presentation/core/guards/api-key.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'journal',
    pathMatch: 'full',
  },
  {
    path: 'journal',
    loadChildren: () =>
      import('./presentation/features/journal/journal.routes').then(m => m.JOURNAL_ROUTES),
  },
  {
    path: 'analysis',
    loadChildren: () =>
      import('./presentation/features/analysis/analysis.routes').then(m => m.ANALYSIS_ROUTES),
  },
  {
    path: 'report',
    loadChildren: () =>
      import('./presentation/features/report/report.routes').then(m => m.REPORT_ROUTES),
  },
  {
    path: 'coach',
    canActivate: [apiKeyGuard],
    loadChildren: () =>
      import('./presentation/features/coach/coach.routes').then(m => m.COACH_ROUTES),
  },
  {
    path: 'settings',
    loadChildren: () =>
      import('./presentation/features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'journal',
  },
];
