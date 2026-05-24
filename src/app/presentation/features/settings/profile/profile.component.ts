import { Component, inject, OnInit, signal } from '@angular/core';

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
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule
],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
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
