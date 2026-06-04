import { Component, inject, signal } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';

import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SettingsService, ImportValidationError } from '../services/settings.service';
import type { ImportMode } from '../services/settings.service';

const STORES_TO_CLEAR = [
  'meals', 'symptoms', 'intakes', 'notes', 'treatments', 'cures',
  'insights', 'reports', 'coach-sessions', 'symptom-config', 'user-profile',
] as const;

/**
 * Page de gestion des données et de la confidentialité.
 *
 * @remarks
 * Respecte SRP — orchestre ExportDataUseCase et ImportDataUseCase.
 * La suppression totale requiert une double confirmation pour prévenir
 * les destructions accidentelles de données médicales.
 */
@Component({
  selector: 'app-data-privacy',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
],
  templateUrl: './data-privacy.component.html',
  styleUrl: './data-privacy.component.scss',
})
export class DataPrivacyComponent {
  private readonly settings = inject(SettingsService);
  private readonly storage = inject(StorageService);
  private readonly snackBar = inject(MatSnackBar);

  protected exporting = signal(false);
  protected importing = signal(false);
  protected pendingImportJson = signal<string | null>(null);

  protected async onExport(): Promise<void> {
    this.exporting.set(true);
    try {
      const json = await this.settings.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowease-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.snackBar.open('Export téléchargé', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erreur lors de l\'export', 'OK', { duration: 3000 });
    } finally {
      this.exporting.set(false);
    }
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      this.pendingImportJson.set(json);
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  protected cancelImport(): void {
    this.pendingImportJson.set(null);
  }

  protected async confirmImport(mode: ImportMode): Promise<void> {
    const json = this.pendingImportJson();
    if (!json) return;

    this.pendingImportJson.set(null);
    this.importing.set(true);
    try {
      await this.settings.importData(json, mode);
      const msg = mode === 'merge'
        ? 'Données fusionnées avec succès'
        : 'Données importées avec succès';
      this.snackBar.open(msg, 'OK', { duration: 3000 });
    } catch (err) {
      const msg = err instanceof ImportValidationError
        ? err.message
        : 'Erreur lors de l\'import';
      this.snackBar.open(msg, 'OK', { duration: 4000 });
    } finally {
      this.importing.set(false);
    }
  }

  protected async onDeleteAll(): Promise<void> {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer TOUTES vos données ?\nCette action est irréversible.',
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'Dernière confirmation : toutes vos données FlowEase seront supprimées définitivement.',
    );
    if (!doubleConfirm) return;

    try {
      await Promise.all(STORES_TO_CLEAR.map(store => this.storage.clear(store)));
      this.snackBar.open('Toutes les données ont été supprimées', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erreur lors de la suppression', 'OK', { duration: 3000 });
    }
  }
}