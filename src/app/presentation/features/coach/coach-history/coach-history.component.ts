import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
} from '@angular/core';
import { NgFor, NgIf, DatePipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GetCoachHistoryUseCase } from '../../../../application/coach/get-coach-history.usecase';
import type { StoredCoachSession } from '../../../../application/coach/coach-session.types';
import type { CoachContextWindow } from '../../../../domain/entities/coach-session.entity';

const CONTEXT_LABELS: Record<CoachContextWindow, string> = {
  today: "Aujourd'hui",
  '7d': '7 derniers jours',
  '14d': '14 derniers jours',
  '30d': '30 derniers jours',
  profile_only: 'Profil uniquement',
};

/**
 * Affiche l'historique des sessions Coach avec leurs résumés.
 *
 * @remarks
 * Respecte SRP : affichage de l'historique uniquement.
 * La suppression globale requiert une confirmation native (window.confirm)
 * pour respecter la règle "2 étapes pour les destructions de données".
 * Utilise GetCoachHistoryUseCase pour ne pas accéder à IndexedDB directement.
 */
@Component({
  selector: 'app-coach-history',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    SlicePipe,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-wrapper">

      <!-- Header -->
      <div class="history-header">
        <button
          mat-icon-button
          aria-label="Retour au coach"
          data-testid="btn-back"
          (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="history-title">Historique Coach</h2>
        <button
          mat-icon-button
          aria-label="Supprimer tout l'historique des sessions"
          data-testid="btn-delete-all"
          matTooltip="Supprimer tout l'historique"
          [disabled]="sessions.length === 0"
          (click)="onDeleteAll()">
          <mat-icon>delete_sweep</mat-icon>
        </button>
      </div>

      <!-- État vide -->
      <div *ngIf="sessions.length === 0" class="empty-state" role="status">
        <mat-icon aria-hidden="true" class="empty-icon">forum</mat-icon>
        <p>Aucune session enregistrée</p>
      </div>

      <!-- Liste des sessions -->
      <mat-list *ngIf="sessions.length > 0" role="list">
        <ng-container *ngFor="let session of sessions; let i = index">
          <mat-list-item
            class="session-item"
            role="listitem"
            [attr.data-testid]="'session-item-' + i"
            [attr.aria-label]="getAriaLabel(session)">
            <mat-icon matListItemIcon aria-hidden="true">
              {{ session.endedAt ? 'chat' : 'chat_bubble' }}
            </mat-icon>
            <span matListItemTitle>{{ getContextLabel(session.contextWindow) }}</span>
            <span matListItemLine class="session-meta">
              {{ session.startedAt | date:'d MMM yyyy HH:mm' }}
              &bull; {{ session.messages.length }} messages
              &bull; ~{{ session.totalTokens }} tokens
            </span>
            <span
              *ngIf="session.summary"
              matListItemLine
              class="session-summary"
              [attr.aria-label]="'Résumé : ' + session.summary.content">
              {{ session.summary.content | slice:0:130 }}{{ session.summary.content.length > 130 ? '…' : '' }}
            </span>
          </mat-list-item>
          <mat-divider *ngIf="i < sessions.length - 1"></mat-divider>
        </ng-container>
      </mat-list>

    </div>
  `,
  styles: [`
    .history-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .history-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }
    .history-title {
      flex: 1;
      font-size: 18px;
      font-weight: 500;
      margin: 0;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 64px 16px;
      color: var(--mat-sys-outline);
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; }
    .session-item { min-height: 72px; }
    .session-meta { font-size: 12px; opacity: 0.8; }
    .session-summary {
      font-size: 12px;
      font-style: italic;
      opacity: 0.7;
      white-space: normal;
      line-height: 1.4;
    }
  `],
})
export class CoachHistoryComponent implements OnInit {
  protected sessions: StoredCoachSession[] = [];

  private readonly getHistoryUseCase = inject(GetCoachHistoryUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    this.sessions = await this.getHistoryUseCase.execute();
    this.cdr.markForCheck();
  }

  protected goBack(): void {
    this.router.navigate(['/coach']);
  }

  protected getContextLabel(window: CoachContextWindow): string {
    return CONTEXT_LABELS[window] ?? window;
  }

  protected getAriaLabel(session: StoredCoachSession): string {
    return `Session Coach — ${this.getContextLabel(session.contextWindow)}, ${session.messages.length} messages`;
  }

  protected async onDeleteAll(): Promise<void> {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      'Supprimer tout l\'historique des sessions Coach ? Cette action est irréversible.',
    );
    if (!confirmed) return;
    await this.getHistoryUseCase.deleteAll();
    this.sessions = [];
    this.cdr.markForCheck();
  }
}
