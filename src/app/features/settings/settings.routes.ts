import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings-home/settings-home.component').then(m => m.SettingsHomeComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'api-key',
    loadComponent: () =>
      import('./api-key/api-key.component').then(m => m.ApiKeyComponent),
  },
  {
    path: 'treatments',
    loadComponent: () =>
      import('./treatments/treatments.component').then(m => m.TreatmentsComponent),
  },
  {
    path: 'symptoms-config',
    loadComponent: () =>
      import('./symptoms-config/symptoms-config.component').then(m => m.SymptomsConfigComponent),
  },
  {
    path: 'coach-settings',
    loadComponent: () =>
      import('./coach-settings/coach-settings.component').then(m => m.CoachSettingsComponent),
  },
  {
    path: 'data-privacy',
    loadComponent: () =>
      import('./data-privacy/data-privacy.component').then(m => m.DataPrivacyComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./about/about.component').then(m => m.AboutComponent),
  },
];
