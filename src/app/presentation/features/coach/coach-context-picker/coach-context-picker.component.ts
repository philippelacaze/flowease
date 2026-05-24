import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';

import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import {
  StartCoachSessionUseCase,
  type StartCoachSessionResult,
} from '../../../../application/coach/start-coach-session.usecase';
import type { CoachContextWindow } from '../../../../domain/entities/coach-session.entity';

interface ContextOption {
  readonly key: CoachContextWindow;
  readonly label: string;
  readonly description: string;
  readonly estimatedTokens: string;
  readonly icon: string;
}

/**
 * Bottom sheet de sélection du contexte de données pour la session Coach.
 *
 * @remarks
 * Respecte SRP : sélection du contexte et démarrage de session uniquement.
 * S'affiche automatiquement au démarrage d'une nouvelle session Coach.
 * Délègue la création de session à StartCoachSessionUseCase et se ferme
 * avec le StartCoachSessionResult pour que le parent récupère le sessionId.
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
