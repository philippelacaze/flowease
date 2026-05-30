import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';

import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import {
  StartCoachSessionUseCase,
  type StartCoachSessionResult,
} from '../../../../application/coach/start-coach-session.usecase';
import type { CoachContextWindow } from '../../../../domain/entities/coach-session.entity';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';

interface ContextOption {
  readonly key: CoachContextWindow;
  readonly label: string;
  readonly description: string;
  readonly estimatedTokens: string;
  readonly icon: string;
}

/** Données passées par CoachChatComponent à l'ouverture du picker. */
export interface CoachContextPickerData {
  readonly currentWindow: CoachContextWindow;
}

/**
 * Bottom sheet de sélection du contexte de données pour la session Coach.
 *
 * @remarks
 * Respecte SRP : sélection du contexte et démarrage de session uniquement.
 * Ouvert volontairement par CoachChatComponent (bouton "Modifier").
 * Reçoit via MAT_BOTTOM_SHEET_DATA la fenêtre actuellement active (pré-sélection).
 * L'option correspondant au paramètre par défaut (settings) porte le badge "Défaut".
 * L'option actuellement active porte le badge "Actif".
 * Fermeture sans sélection possible (disableClose: false côté appelant).
 */
@Component({
  selector: 'app-coach-context-picker',
  standalone: true,
  imports: [MatListModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coach-context-picker.component.html',
  styleUrl: './coach-context-picker.component.scss',
})
export class CoachContextPickerComponent {
  protected readonly loading = signal(false);

  private readonly settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);
  private readonly data = inject<CoachContextPickerData>(MAT_BOTTOM_SHEET_DATA as never, { optional: true } as never);

  /** Fenêtre enregistrée comme paramètre par défaut dans les settings. */
  protected readonly defaultKey = signal<CoachContextWindow>(this.settings.getDefaultContextWindow());
  /** Fenêtre actuellement active dans la session en cours (pré-sélection). */
  protected readonly selectedKey = signal<CoachContextWindow>(
    this.data?.currentWindow ?? this.settings.getDefaultContextWindow(),
  );

  protected readonly contextOptions: readonly ContextOption[] = [
    {
      key: 'today',
      label: "Aujourd'hui",
      description: 'Données de la journée en cours',
      estimatedTokens: '~500 tokens',
      icon: 'today',
    },
    {
      key: '7d',
      label: '7 derniers jours',
      description: 'Tendances sur une semaine',
      estimatedTokens: '~2 000 tokens',
      icon: 'date_range',
    },
    {
      key: '14d',
      label: '14 derniers jours',
      description: 'Analyse bi-hebdomadaire',
      estimatedTokens: '~4 000 tokens',
      icon: 'calendar_month',
    },
    {
      key: '30d',
      label: '30 derniers jours',
      description: 'Vue mensuelle complète',
      estimatedTokens: '~8 000 tokens',
      icon: 'event_note',
    },
    {
      key: 'profile_only',
      label: 'Profil uniquement',
      description: 'Sans données de santé récentes',
      estimatedTokens: '~200 tokens',
      icon: 'person',
    },
  ];

  private readonly startSession = inject(StartCoachSessionUseCase);
  private readonly bottomSheetRef =
    inject<MatBottomSheetRef<CoachContextPickerComponent, StartCoachSessionResult>>(
      MatBottomSheetRef,
    );

  async onSelect(option: ContextOption): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    const result = await this.startSession.execute(option.key);
    this.bottomSheetRef.dismiss(result);
  }
}
