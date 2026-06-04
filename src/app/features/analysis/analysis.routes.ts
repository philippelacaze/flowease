import { Routes } from '@angular/router';

export const ANALYSIS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./analysis-home/analysis-home.component').then(m => m.AnalysisHomeComponent),
  },
];
