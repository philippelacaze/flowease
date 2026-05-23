import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ExportDataUseCase } from '../../../../application/settings/export-data.usecase';
import { ImportDataUseCase, ImportValidationError } from '../../../../application/settings/import-data.usecase';
import type { StorageRepository } from '../../../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../../../../application/tokens';

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
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="data-privacy-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Données & confidentialité</h1>
      </header>

      <div class="sections">

        <!-- Export -->
        <section class="data-section">
          <div class="section-icon-title">
            <mat-icon class="section-icon">download</mat-icon>
            <div>
              <h2 class="section-title">Exporter mes données</h2>
              <p class="section-desc">
                Télécharge toutes vos données en JSON. La clé API n'est pas incluse.
              </p>
            </div>
          </div>
          <button
            mat-raised-button
            color="primary"
            (click)="onExport()"
            [disabled]="exporting()"
            aria-label="Exporter toutes mes données en JSON"
            data-testid="export-btn"
            class="action-btn">
            @if (exporting()) {
              <mat-spinner diameter="20" />
            } @else {
              <mat-icon>download</mat-icon>
            }
            Exporter en JSON
          </button>
        </section>

        <mat-divider />

        <!-- Import -->
        <section class="data-section">
          <div class="section-icon-title">
            <mat-icon class="section-icon">upload</mat-icon>
            <div>
              <h2 class="section-title">Importer des données</h2>
              <p class="section-desc">
                Restaure un export JSON. Les données existantes seront remplacées.
              </p>
            </div>
          </div>
          <button
            mat-stroked-button
            (click)="fileInput.click()"
            [disabled]="importing()"
            aria-label="Importer des données depuis un fichier JSON"
            data-testid="import-btn"
            class="action-btn">
            @if (importing()) {
              <mat-spinner diameter="20" />
            } @else {
              <mat-icon>upload</mat-icon>
            }
            Importer JSON
          </button>
          <input
            #fileInput
            type="file"
            accept=".json,application/json"
            aria-label="Sélectionner un fichier JSON"
            data-testid="file-input"
            style="display:none"
            (change)="onFileSelected($event)" />
        </section>

        <mat-divider />

        <!-- Suppression -->
        <section class="data-section danger-section">
          <div class="section-icon-title">
            <mat-icon class="section-icon danger-icon">delete_forever</mat-icon>
            <div>
              <h2 class="section-title">Supprimer toutes mes données</h2>
              <p class="section-desc">
                Supprime définitivement toutes les données de l'application.
                Cette action est irréversible.
              </p>
            </div>
          </div>
          <button
            mat-stroked-button
            color="warn"
            (click)="onDeleteAll()"
            aria-label="Supprimer définitivement toutes mes données"
            data-testid="delete-all-btn"
            class="action-btn">
            <mat-icon>delete_forever</mat-icon>
            Supprimer tout
          </button>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .data-privacy-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .sections {
      display: flex;
      flex-direction: column;
    }
    .data-section {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-icon-title {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .section-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--mat-sys-primary);
      margin-top: 2px;
    }
    .danger-icon {
      color: var(--mat-sys-error);
    }
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }
    .section-desc {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }
    .action-btn {
      min-height: 44px;
      align-self: flex-start;
    }
    .danger-section .section-title {
      color: var(--mat-sys-error);
    }
  `],
})
export class DataPrivacyComponent {
  private readonly exportData = inject(ExportDataUseCase);
  private readonly importData = inject(ImportDataUseCase);
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);
  private readonly snackBar = inject(MatSnackBar);

  protected exporting = signal(false);
  protected importing = signal(false);

  protected async onExport(): Promise<void> {
    this.exporting.set(true);
    try {
      const json = await this.exportData.execute();
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
    reader.onload = async (e) => {
      const json = e.target?.result as string;
      this.importing.set(true);
      try {
        await this.importData.execute(json);
        this.snackBar.open('Données importées avec succès', 'OK', { duration: 3000 });
      } catch (err) {
        const msg = err instanceof ImportValidationError
          ? err.message
          : 'Erreur lors de l\'import';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      } finally {
        this.importing.set(false);
        (event.target as HTMLInputElement).value = '';
      }
    };
    reader.readAsText(file);
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
