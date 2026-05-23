import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SaveUserProfileUseCase } from '../../../../application/settings/save-user-profile.usecase';
import type { MedicalCondition, FodmapProtocol, AppLanguage, AppTheme } from '../../../../domain/entities/user-profile.entity';
import type { StorageRepository } from '../../../../domain/repositories/storage.repository';
import type { UserProfileEntity } from '../../../../domain/entities/user-profile.entity';
import { STORAGE_PORT, LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';
import { ThemeService } from '../../../core/theme.service';

const CONDITION_LABELS: Record<MedicalCondition, string> = {
  sibo_hydrogen: 'SIBO hydrogène',
  sibo_methane: 'SIBO méthane',
  sibo_hydrogen_sulfide: 'SIBO H₂S',
  gastroparesis: 'Gastroparésie',
  ibs: 'Syndrome de l\'intestin irritable',
  crohn: 'Maladie de Crohn',
  colitis: 'Colite',
  gerd: 'RGO',
  other: 'Autre',
};

/**
 * Formulaire de profil médical de l'utilisateur.
 *
 * @remarks
 * Respecte SRP — délègue la persistance à SaveUserProfileUseCase.
 * Charge le profil existant depuis IndexedDB au démarrage.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div class="profile-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Mon profil</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSave()" class="profile-form">

        <!-- Prénom -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Prénom (facultatif)</mat-label>
          <input
            matInput
            formControlName="firstName"
            aria-label="Prénom"
            data-testid="first-name" />
        </mat-form-field>

        <mat-divider />

        <!-- Conditions médicales -->
        <section class="form-section">
          <h2 class="section-title">Conditions médicales</h2>
          <div class="conditions-grid">
            @for (entry of conditionEntries; track entry.key) {
              <mat-checkbox
                [checked]="isConditionChecked(entry.key)"
                (change)="onConditionChange(entry.key, $event.checked)"
                [attr.aria-label]="entry.label"
                [attr.data-testid]="'condition-' + entry.key">
                {{ entry.label }}
              </mat-checkbox>
            }
          </div>
        </section>

        <mat-divider />

        <!-- Protocole FODMAP -->
        <section class="form-section">
          <h2 class="section-title">Protocole alimentaire</h2>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Protocole FODMAP</mat-label>
            <mat-select formControlName="protocol" aria-label="Protocole FODMAP" data-testid="protocol-select">
              <mat-option value="strict">Strict (élimination)</mat-option>
              <mat-option value="reintroduction">Réintroduction</mat-option>
              <mat-option value="maintenance">Maintenance</mat-option>
              <mat-option value="none">Aucun</mat-option>
            </mat-select>
          </mat-form-field>
        </section>

        <mat-divider />

        <!-- Préférences -->
        <section class="form-section">
          <h2 class="section-title">Préférences</h2>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Langue de l'interface</mat-label>
            <mat-select formControlName="language" aria-label="Langue" data-testid="language-select">
              <mat-option value="fr">Français</mat-option>
              <mat-option value="en">English</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Thème visuel</mat-label>
            <mat-select formControlName="theme" aria-label="Thème" data-testid="theme-select">
              <mat-option value="auto">Automatique (système)</mat-option>
              <mat-option value="light">Clair</mat-option>
              <mat-option value="dark">Sombre</mat-option>
            </mat-select>
          </mat-form-field>
        </section>

        <div class="form-actions">
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="saving()"
            aria-label="Enregistrer le profil"
            data-testid="save-profile-btn"
            class="save-btn">
            <mat-icon>save</mat-icon>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .form-section {
      padding: 16px 0;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
    }
    .conditions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .full-width {
      width: 100%;
    }
    .form-actions {
      padding: 16px 0;
      display: flex;
      justify-content: flex-end;
    }
    .save-btn {
      min-height: 44px;
      min-width: 140px;
    }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly saveProfile = inject(SaveUserProfileUseCase);
  private readonly storage = inject<StorageRepository<UserProfileEntity>>(STORAGE_PORT as never);
  private readonly localSettings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);
  private readonly themeService = inject(ThemeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected saving = signal(false);
  protected selectedConditions = signal<MedicalCondition[]>([]);

  protected readonly conditionEntries = Object.entries(CONDITION_LABELS).map(
    ([key, label]) => ({ key: key as MedicalCondition, label }),
  );

  protected readonly form = this.fb.group({
    firstName: [''],
    protocol: ['none' as FodmapProtocol, Validators.required],
    language: ['fr' as AppLanguage, Validators.required],
    theme: ['auto' as AppTheme, Validators.required],
    showTokenCounter: [false],
    defaultCoachContext: ['14'],
  });

  async ngOnInit(): Promise<void> {
    const profile = await this.storage.get('user-profile', 'singleton') as UserProfileEntity | null;
    if (profile) {
      this.form.patchValue({
        firstName: profile.firstName ?? '',
        protocol: profile.protocol,
        language: profile.language,
        theme: profile.theme,
        showTokenCounter: profile.showTokenCounter,
        defaultCoachContext: profile.defaultCoachContext,
      });
      this.selectedConditions.set([...profile.conditions]);
    }
  }

  protected isConditionChecked(key: MedicalCondition): boolean {
    return this.selectedConditions().includes(key);
  }

  protected onConditionChange(key: MedicalCondition, checked: boolean): void {
    const current = this.selectedConditions();
    if (checked) {
      this.selectedConditions.set([...current, key]);
    } else {
      this.selectedConditions.set(current.filter(c => c !== key));
    }
  }

  protected async onSave(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    try {
      const { firstName, protocol, language, theme, showTokenCounter, defaultCoachContext } = this.form.value;
      const resolvedTheme = (theme ?? 'auto') as AppTheme;
      await this.saveProfile.execute({
        firstName: firstName || undefined,
        conditions: this.selectedConditions(),
        protocol: (protocol ?? 'none') as FodmapProtocol,
        language: (language ?? 'fr') as AppLanguage,
        theme: resolvedTheme,
        showTokenCounter: showTokenCounter ?? false,
        defaultCoachContext: defaultCoachContext ?? '14',
      });
      // Persiste dans localStorage pour effet immédiat et rechargement instantané
      this.localSettings.setTheme(resolvedTheme);
      this.themeService.apply(resolvedTheme);
      this.snackBar.open('Profil enregistré', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
