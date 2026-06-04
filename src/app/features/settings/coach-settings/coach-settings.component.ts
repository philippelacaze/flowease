import { Component, inject, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import type { CoachContextWindow } from '../../../core/models/entities/coach-session.entity';

interface CoachPreferences {
  mode: string;
  defaultContext: CoachContextWindow;
  showTokenCounter: boolean;
  showSuggestions: boolean;
  language: string;
}

/**
 * Page de préférences du Coach IA.
 *
 * @remarks
 * Respecte SRP — persiste les préférences Coach via LocalSettingsService.
 * Le mode Coach contrôle le niveau de détail des réponses de l'IA.
 */
@Component({
  selector: 'app-coach-settings',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule
],
  templateUrl: './coach-settings.component.html',
  styleUrl: './coach-settings.component.scss',
})
export class CoachSettingsComponent implements OnInit {
  private readonly settings = inject(LocalSettingsService);
  private readonly snackBar = inject(MatSnackBar);

  protected prefs: CoachPreferences = {
    mode: 'standard',
    defaultContext: '7d',
    showTokenCounter: false,
    showSuggestions: false,
    language: 'fr',
  };

  ngOnInit(): void {
    this.prefs = {
      mode: this.settings.getCoachMode(),
      defaultContext: this.settings.getDefaultContextWindow(),
      showTokenCounter: this.settings.getShowTokenCounter(),
      showSuggestions: this.settings.getCoachSuggestions(),
      language: this.settings.getLanguage(),
    };
  }

  protected onSave(): void {
    this.settings.setCoachMode(this.prefs.mode);
    this.settings.setDefaultContextWindow(this.prefs.defaultContext);
    this.settings.setShowTokenCounter(this.prefs.showTokenCounter);
    this.settings.setCoachSuggestions(this.prefs.showSuggestions);
    this.settings.setLanguage(this.prefs.language);
    this.snackBar.open('Préférences enregistrées', 'OK', { duration: 2000 });
  }
}
