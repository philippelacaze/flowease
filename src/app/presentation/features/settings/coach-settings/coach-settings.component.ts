import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { LocalSettingsAdapter } from '../../../../infrastructure/storage/local-settings.adapter';

interface CoachPreferences {
  mode: string;
  defaultContext: string;
  showTokenCounter: boolean;
  language: string;
}

/**
 * Page de préférences du Coach IA.
 *
 * @remarks
 * Respecte SRP — persiste les préférences Coach via LocalSettingsAdapter.
 * Le mode Coach contrôle le niveau de détail des réponses de l'IA.
 */
@Component({
  selector: 'app-coach-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './coach-settings.component.html',
  styleUrl: './coach-settings.component.scss',
})
export class CoachSettingsComponent implements OnInit {
  private readonly settings = inject(LocalSettingsAdapter);
  private readonly snackBar = inject(MatSnackBar);

  protected prefs: CoachPreferences = {
    mode: 'standard',
    defaultContext: '14',
    showTokenCounter: false,
    language: 'fr',
  };

  ngOnInit(): void {
    this.prefs = {
      mode: this.settings.getCoachMode(),
      defaultContext: String(this.settings.getDefaultWindow()),
      showTokenCounter: this.settings.getShowTokenCounter(),
      language: this.settings.getLanguage(),
    };
  }

  protected onSave(): void {
    this.settings.setCoachMode(this.prefs.mode);
    this.settings.setDefaultWindow(Number(this.prefs.defaultContext) || 14);
    this.settings.setShowTokenCounter(this.prefs.showTokenCounter);
    this.settings.setLanguage(this.prefs.language);
    this.snackBar.open('Préférences enregistrées', 'OK', { duration: 2000 });
  }
}
