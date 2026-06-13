import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { TreatmentsComponent } from './treatments.component';
import { StorageService } from '../../../core/services/storage.service';
import { SettingsService } from '../services/settings.service';
import type { TreatmentEntity } from '../../../core/models/entities/treatment.entity';

function makeTreatment(overrides: Partial<TreatmentEntity> = {}): TreatmentEntity {
  return {
    id: 'treat-1',
    name: 'Rifaximine',
    category: 'antibiotic',
    mode: 'oral',
    dosage: '550',
    unit: 'mg',
    frequency: 2,
    reminder: { enabled: true, times: ['08:00', '20:00'], soundEnabled: false },
    notes: 'À prendre au repas',
    active: true,
    startedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

type ComponentProtected = {
  onEdit(t: TreatmentEntity): void;
  onCancelForm(): void;
  onSave(): Promise<void>;
  showForm(): boolean;
  editingTreatmentId(): string | null;
  reminderTimes(): string[];
  form: {
    value: Record<string, unknown>;
    patchValue(v: Record<string, unknown>): void;
  };
};

function makeStorageMock(initial: TreatmentEntity[]) {
  const treatments = [...initial];
  return {
    store: treatments,
    getAll: vi.fn().mockImplementation(async () => [...treatments]),
    save: vi.fn().mockImplementation(async (_store: string, entity: TreatmentEntity) => {
      const idx = treatments.findIndex(t => t.id === entity.id);
      if (idx >= 0) treatments[idx] = entity;
      else treatments.push(entity);
      return entity.id;
    }),
    delete: vi.fn().mockImplementation(async (_store: string, id: string) => {
      const idx = treatments.findIndex(t => t.id === id);
      if (idx >= 0) treatments.splice(idx, 1);
    }),
  };
}

async function createComponent(initial: TreatmentEntity[] = []) {
  const storage = makeStorageMock(initial);
  await TestBed.configureTestingModule({
    imports: [TreatmentsComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: StorageService, useValue: storage },
      { provide: SettingsService, useValue: { getCures: vi.fn().mockResolvedValue([]) } },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TreatmentsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, storage };
}

describe('TreatmentsComponent', () => {
  describe('bouton de modification', () => {
    it('affiche un bouton modifier pour chaque traitement', async () => {
      const { fixture } = await createComponent([makeTreatment()]);
      expect(fixture.nativeElement.querySelector('[data-testid="edit-treat-1"]')).not.toBeNull();
    });
  });

  describe('ouverture du formulaire en édition', () => {
    it('onEdit pré-remplit le formulaire avec les valeurs du traitement', async () => {
      const { fixture } = await createComponent([makeTreatment()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;

      comp.onEdit(makeTreatment());

      expect(comp.showForm()).toBe(true);
      expect(comp.editingTreatmentId()).toBe('treat-1');
      expect(comp.form.value['name']).toBe('Rifaximine');
      expect(comp.form.value['dosage']).toBe('550');
      expect(comp.form.value['frequency']).toBe(2);
      expect(comp.reminderTimes()).toEqual(['08:00', '20:00']);
    });

    it('le titre du formulaire devient "Modifier le traitement"', async () => {
      const { fixture } = await createComponent([makeTreatment()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;

      comp.onEdit(makeTreatment());
      fixture.detectChanges();

      const heading = fixture.nativeElement.querySelector('[data-testid="add-form"] h2') as HTMLElement;
      expect(heading.textContent?.trim()).toBe('Modifier le traitement');
    });
  });

  describe('enregistrement d\'une modification', () => {
    it('onSave met à jour le traitement existant sans créer de doublon', async () => {
      const { fixture, storage } = await createComponent([makeTreatment()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;

      comp.onEdit(makeTreatment());
      comp.form.patchValue({ name: 'Rifaximine 550', dosage: '600' });
      await comp.onSave();

      const saved = storage.save.mock.calls.at(-1)?.[1] as TreatmentEntity;
      expect(saved.id).toBe('treat-1');
      expect(saved.name).toBe('Rifaximine 550');
      expect(saved.dosage).toBe('600');
      // champs immuables préservés
      expect(saved.createdAt).toEqual(new Date('2026-01-01'));
      expect(saved.active).toBe(true);
      // pas de doublon
      expect(storage.store.filter(t => t.id === 'treat-1')).toHaveLength(1);
      expect(comp.showForm()).toBe(false);
      expect(comp.editingTreatmentId()).toBeNull();
    });

    it('préserve les rappels existants lors de l\'édition des autres champs', async () => {
      const { fixture, storage } = await createComponent([makeTreatment()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;

      comp.onEdit(makeTreatment());
      comp.form.patchValue({ notes: 'Nouvelle note' });
      await comp.onSave();

      const saved = storage.save.mock.calls.at(-1)?.[1] as TreatmentEntity;
      expect(saved.reminder.enabled).toBe(true);
      expect(saved.reminder.times).toEqual(['08:00', '20:00']);
    });
  });

  describe('annulation', () => {
    it('onCancelForm ferme le formulaire et réinitialise le mode édition', async () => {
      const { fixture } = await createComponent([makeTreatment()]);
      const comp = fixture.componentInstance as unknown as ComponentProtected;

      comp.onEdit(makeTreatment());
      comp.onCancelForm();

      expect(comp.showForm()).toBe(false);
      expect(comp.editingTreatmentId()).toBeNull();
    });
  });
});
