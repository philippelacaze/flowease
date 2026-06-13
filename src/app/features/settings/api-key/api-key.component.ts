import { Component, inject, signal, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { SettingsService } from '../services/settings.service';
import { PromptCatalogService, type ResolvedPrompt } from '../../../core/services/ai/prompt-catalog.service';

type ApiKeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';

interface ModelOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Modèles Claude proposés pour le paramétrage. La même liste alimente les deux
 * sélecteurs (tâches rapides / tâches d'analyse) ; l'utilisateur reste libre de
 * mettre un modèle plus capable sur les tâches rapides ou inversement.
 */
const MODEL_OPTIONS: readonly ModelOption[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — rapide & économique' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — équilibré' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — le plus capable' },
];


/**
 * Page de paramétrage IA : clé API Anthropic et inspection des prompts.
 *
 * @remarks
 * Respecte SRP — seule page autorisée à accéder à LocalSettingsService
 * directement depuis la présentation (exception justifiée : gestion de la clé API).
 * La clé n'est jamais loguée ni affichée en clair après saisie.
 * Les prompts IA sont résolus à l'entrée sur la page (ngOnInit) et affichés en
 * lecture seule à des fins de débogage. Une future version autorisera leur override.
 */
@Component({
  selector: 'app-api-key',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSelectModule
],
  templateUrl: './api-key.component.html',
  styleUrl: './api-key.component.scss',
})
export class ApiKeyComponent implements OnInit {
  private readonly settings = inject(LocalSettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly settingsService = inject(SettingsService);
  private readonly promptCatalog = inject(PromptCatalogService);

  protected apiKeyInput = '';
  protected showKey = false;
  protected hasKey = signal(this.settings.hasApiKey());
  protected testStatus = signal<ApiKeyStatus>('idle');
  protected testError = signal<string | null>(null);
  protected prompts = signal<readonly ResolvedPrompt[]>([]);

  protected readonly modelOptions = MODEL_OPTIONS;
  protected fastModel = signal(this.settings.getFastModel());
  protected analysisModel = signal(this.settings.getAnalysisModel());

  /** Résout les prompts IA à l'entrée sur la page (lecture seule, débogage). */
  async ngOnInit(): Promise<void> {
    this.prompts.set(await this.promptCatalog.resolveAll());
  }

  protected async onTest(): Promise<void> {
    const keyToTest = this.apiKeyInput || this.settings.getApiKey() || '';
    if (!keyToTest) return;
    this.testStatus.set('testing');
    this.testError.set(null);
    const result = await this.settingsService.testApiKey(keyToTest);
    if (result.ok) {
      this.testStatus.set('valid');
    } else {
      this.testStatus.set('invalid');
      this.testError.set(result.errorMessage ?? 'Erreur inconnue');
    }
  }

  protected onSave(): void {
    if (!this.apiKeyInput) return;
    this.settings.setApiKey(this.apiKeyInput);
    this.hasKey.set(true);
    this.apiKeyInput = '';
    this.testStatus.set('idle');
    this.testError.set(null);
    this.snackBar.open('Clé API enregistrée', 'OK', { duration: 2000 });
  }

  protected onRemove(): void {
    this.settings.clearApiKey();
    this.hasKey.set(false);
    this.testStatus.set('idle');
    this.testError.set(null);
    this.snackBar.open('Clé API supprimée', 'OK', { duration: 2000 });
  }

  /** Persiste le modèle des tâches rapides (reconnaissance, tags, résumés). */
  protected onFastModelChange(model: string): void {
    this.settings.setFastModel(model);
    this.fastModel.set(model);
    this.snackBar.open('Modèle rapide enregistré', 'OK', { duration: 2000 });
  }

  /** Persiste le modèle des tâches d'analyse (tendances, rapport, coach). */
  protected onAnalysisModelChange(model: string): void {
    this.settings.setAnalysisModel(model);
    this.analysisModel.set(model);
    this.snackBar.open('Modèle d\'analyse enregistré', 'OK', { duration: 2000 });
  }
}
