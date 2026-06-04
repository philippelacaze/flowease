import { Routes } from '@angular/router';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./report-builder/report-builder.component').then(m => m.ReportBuilderComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./report-history/report-history.component').then(m => m.ReportHistoryComponent),
  },
];
