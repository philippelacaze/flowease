import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
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
  imports: [NgFor, NgIf, MatListModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker-header">
      <h3>Choisir le contexte de données</h3>
      <p class="picker-subtitle">Plus de contexte = réponses plus précises = plus de tokens</p>
    </div>

    <mat-nav-list>
      <mat-list-item
        *ngFor="let option of contextOptions"
        (click)="onSelect(option)"
        [attr.data-testid]="'context-option-' + option.key"
        [attr.aria-label]="option.label + ' — ' + option.description + ', estimation ' + option.estimatedTokens"
        class="context-option">
        <mat-icon matListItemIcon aria-hidden="true">{{ option.icon }}</mat-icon>
        <span matListItemTitle>{{ option.label }}</span>
        <span matListItemLine>{{ option.description }}</span>
        <span matListItemMeta class="token-estimate">{{ option.estimatedTokens }}</span>
      </mat-list-item>
    </mat-nav-list>

    <div *ngIf="loading()" class="loading-overlay" role="status" aria-live="polite">
      <span>Démarrage de la session...</span>
    </div>
  `,
  styles: [`
    .picker-header {
      padding: 16px 16px 8px;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 500;
    }
    .picker-subtitle {
      margin: 0;
      font-size: 13px;
      color: var(--mat-sys-outline);
    }
    .context-option {
      min-height: 64px;
    }
    .token-estimate {
      font-size: 11px;
      color: var(--mat-sys-outline);
    }
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--mat-sys-surface-rgb, 255 255 255) / 0.85);
      font-size: 14px;
    }
  `],
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
