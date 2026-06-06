import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SymptomService, StoredSymptomConfig } from '../../journal/services/symptom.service';
import type { SymptomCategory } from '../../../core/models/entities/symptom.entity';

interface ConfigItem {
  id: string;
  key: string;
  label: string;
  order: number;
  active: boolean;
  custom: boolean;
  category: SymptomCategory;
  inputMode?: 'intensity' | 'frequency' | 'boolean';
  editing: boolean;
  editLabel: string;
}

/**
 * Paramétrage personnalisé des symptômes : activation, renommage, réordonnancement, ajout et réinitialisation.
 *
 * @remarks
 * Respecte §1.4.6 — 5 capacités : masquer, renommer, ajouter avec mode de saisie, réordonner, réinitialiser.
 * Passe par SymptomService (SRP) au lieu d'accéder à StorageService directement.
 * Sauvegarde automatique après chaque action (debounce 300 ms).
 */
@Component({
  selector: 'app-symptoms-config',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
    DragDropModule,
  ],
  templateUrl: './symptoms-config.component.html',
  styleUrl: './symptoms-config.component.scss',
})
export class SymptomsConfigComponent implements OnInit, OnDestroy {
  private readonly symptomSvc = inject(SymptomService);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _items = signal<ConfigItem[]>([]);

  protected readonly digestiveItems = computed(() =>
    this._items().filter(i => i.category === 'digestive').sort((a, b) => a.order - b.order),
  );
  protected readonly systemicItems = computed(() =>
    this._items().filter(i => i.category === 'systemic').sort((a, b) => a.order - b.order),
  );
  protected readonly wellbeingItems = computed(() =>
    this._items().filter(i => i.category === 'wellbeing').sort((a, b) => a.order - b.order),
  );

  protected showAddForm = false;
  protected newLabel = '';
  protected newCategory: SymptomCategory = 'digestive';
  protected newInputMode: 'intensity' | 'frequency' | 'boolean' = 'intensity';

  async ngOnInit(): Promise<void> {
    const configs = await this.symptomSvc.getAllConfigs();
    this._items.set(configs.map(c => ({ ...c, editing: false, editLabel: c.label })));
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  protected onDrop(event: CdkDragDrop<ConfigItem[]>, category: SymptomCategory): void {
    const catItems = [...this._items().filter(i => i.category === category).sort((a, b) => a.order - b.order)];
    moveItemInArray(catItems, event.previousIndex, event.currentIndex);
    const reordered = catItems.map((item, idx) => ({ ...item, order: idx }));
    this._items.update(all => [...all.filter(i => i.category !== category), ...reordered]);
    this.autoSave();
  }

  protected onToggle(item: ConfigItem): void {
    this._items.update(all => all.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
    this.autoSave();
  }

  protected startEdit(item: ConfigItem): void {
    this._items.update(all => all.map(i => i.id === item.id ? { ...i, editing: true, editLabel: i.label } : i));
    setTimeout(() => {
      const el = document.getElementById('edit-label-' + item.id);
      if (el) (el as HTMLInputElement).focus();
    }, 0);
  }

  protected confirmEdit(item: ConfigItem): void {
    const trimmed = item.editLabel.trim();
    if (!trimmed) { this.cancelEdit(item); return; }
    this._items.update(all => all.map(i => i.id === item.id ? { ...i, label: trimmed, editing: false } : i));
    this.autoSave();
  }

  protected cancelEdit(item: ConfigItem): void {
    this._items.update(all => all.map(i => i.id === item.id ? { ...i, editing: false } : i));
  }

  protected onAddCustom(): void {
    const label = this.newLabel.trim();
    if (!label) return;
    const catItems = this._items().filter(i => i.category === this.newCategory);
    const newItem: ConfigItem = {
      id: crypto.randomUUID(),
      key: label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      label,
      order: catItems.length,
      active: true,
      custom: true,
      category: this.newCategory,
      inputMode: this.newInputMode,
      editing: false,
      editLabel: label,
    };
    this._items.update(all => [...all, newItem]);
    this.newLabel = '';
    this.showAddForm = false;
    this.autoSave();
  }

  protected onDeleteCustom(item: ConfigItem): void {
    this._items.update(all => all.filter(i => i.id !== item.id));
    this.autoSave();
  }

  protected async onReset(): Promise<void> {
    if (!window.confirm('Réinitialiser la liste à la configuration par défaut ? Vos personnalisations (symptômes custom, renommages, ordre) seront perdus.')) return;
    await this.symptomSvc.resetToDefault();
    const configs = await this.symptomSvc.getAllConfigs();
    this._items.set(configs.map(c => ({ ...c, editing: false, editLabel: c.label })));
  }

  private autoSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const configs: StoredSymptomConfig[] = this._items().map(item => ({
        id: item.id,
        key: item.key,
        label: item.label,
        order: item.order,
        active: item.active,
        custom: item.custom,
        category: item.category,
        inputMode: item.inputMode,
      }));
      void this.symptomSvc.saveConfigs(configs);
    }, 300);
  }
}
