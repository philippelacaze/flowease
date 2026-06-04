import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
} from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CoachService } from '../services/coach.service';
import type { StoredCoachSession } from '../services/coach.service';
import type { CoachContextWindow } from '../../../core/models/entities/coach-session.entity';

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
    DatePipe,
    SlicePipe,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coach-history.component.html',
  styleUrl: './coach-history.component.scss',
})
export class CoachHistoryComponent implements OnInit {
  protected sessions: StoredCoachSession[] = [];

  private readonly coach = inject(CoachService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    this.sessions = await this.coach.getHistory();
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
    await this.coach.deleteAllHistory();
    this.sessions = [];
    this.cdr.markForCheck();
  }
}
