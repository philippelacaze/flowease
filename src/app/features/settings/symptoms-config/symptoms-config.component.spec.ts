import { TestBed } from '@angular/core/testing';
import { ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SymptomsConfigComponent } from './symptoms-config.component';
import { SymptomService, StoredSymptomConfig } from '../../journal/services/symptom.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

const makeConfig = (overrides: Partial<StoredSymptomConfig> & { id: string; key: string; category: StoredSymptomConfig['category'] }): StoredSymptomConfig => ({
  label: overrides.key,
  order: 0,
  custom: false,
  active: true,
  ...overrides,
});

const MOCK_CONFIGS: StoredSymptomConfig[] = [
  makeConfig({ id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur abdominale', order: 0, category: 'digestive' }),
  makeConfig({ id: 'bloating',       key: 'bloating',       label: 'Ballonnements',      order: 1, category: 'digestive' }),
  makeConfig({ id: 'fatigue',        key: 'fatigue',        label: 'Fatigue',             order: 0, category: 'systemic'  }),
  makeConfig({ id: 'mood',           key: 'mood',           label: 'Humeur / anxiété',    order: 0, category: 'wellbeing' }),
  makeConfig({ id: 'energy',         key: 'energy',         label: 'Énergie globale',     order: 1, category: 'wellbeing', active: false }),
];

function makeSymptomSvcMock() {
  return {
    getAllConfigs:   vi.fn().mockResolvedValue([...MOCK_CONFIGS]),
    saveConfigs:    vi.fn().mockResolvedValue(undefined),
    resetToDefault: vi.fn().mockResolvedValue(undefined),
    getActiveConfigs: vi.fn().mockResolvedValue([]),
  };
}

describe('SymptomsConfigComponent', () => {
  let fixture: ComponentFixture<SymptomsConfigComponent>;
  let symptomSvc: ReturnType<typeof makeSymptomSvcMock>;

  beforeEach(async () => {
    symptomSvc = makeSymptomSvcMock();

    await TestBed.configureTestingModule({
      imports: [SymptomsConfigComponent, NoopAnimationsModule],
      providers: [
        { provide: SymptomService, useValue: symptomSvc },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SymptomsConfigComponent);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('affiche 3 sections (Digestifs, Systémiques, Bien-être)', () => {
    const sections = fixture.nativeElement.querySelectorAll('.bloc-section') as NodeListOf<HTMLElement>;
    expect(sections.length).toBe(3);
    expect(sections[0].textContent).toContain('Digestifs');
    expect(sections[1].textContent).toContain('Systémiques');
    expect(sections[2].textContent).toContain('Bien-être');
  });

  it('affiche les symptômes dans leur section respective', () => {
    const digestiveSection = fixture.nativeElement.querySelector('[data-testid="bloc-digestive"]') as HTMLElement;
    expect(digestiveSection.textContent).toContain('Douleur abdominale');
    expect(digestiveSection.textContent).toContain('Ballonnements');

    const systemicSection = fixture.nativeElement.querySelector('[data-testid="bloc-systemic"]') as HTMLElement;
    expect(systemicSection.textContent).toContain('Fatigue');

    const wellbeingSection = fixture.nativeElement.querySelector('[data-testid="bloc-wellbeing"]') as HTMLElement;
    expect(wellbeingSection.textContent).toContain('Humeur / anxiété');
    expect(wellbeingSection.textContent).toContain('Énergie globale');
  });

  it('toggle inactive → SymptomService.saveConfigs appelé (après debounce)', async () => {
    const toggleBtn = fixture.nativeElement.querySelector('[data-testid="toggle-abdominal_pain"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    await new Promise(r => setTimeout(r, 400));

    expect(symptomSvc.saveConfigs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'abdominal_pain', active: false }),
      ]),
    );
  });

  it('clic edit → affiche input de renommage pré-rempli', async () => {
    const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-abdominal_pain"]') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('[data-testid="edit-label-abdominal_pain"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Douleur abdominale');
  });

  it('renommage d\'un symptôme standard persiste le nouveau label', async () => {
    // Ouvrir le mode édition
    const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-abdominal_pain"]') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    // Simuler la saisie via le composant (ngModel binding sur l'objet item)
    const component = fixture.componentInstance as unknown as {
      digestiveItems: () => Array<{ id: string; editLabel: string }>;
      confirmEdit: (item: unknown) => void;
    };
    const item = component.digestiveItems().find(i => i.id === 'abdominal_pain')!;
    item.editLabel = 'Douleur au ventre';
    component.confirmEdit(item);
    fixture.detectChanges();

    await new Promise(r => setTimeout(r, 400));

    expect(symptomSvc.saveConfigs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'abdominal_pain', label: 'Douleur au ventre' }),
      ]),
    );
  });

  it('annulation renommage → label original conservé', () => {
    const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-abdominal_pain"]') as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      cancelEdit: (item: unknown) => void;
      digestiveItems: () => unknown[];
    };
    component.cancelEdit(component.digestiveItems().find((i: unknown) => (i as { id: string }).id === 'abdominal_pain'));
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('[data-testid="symptom-abdominal_pain"] .symptom-label') as HTMLElement;
    expect(label.textContent?.trim()).toBe('Douleur abdominale');
  });

  it('ajout custom avec mode frequency → inputMode persisté dans saveConfigs', async () => {
    const component = fixture.componentInstance as unknown as {
      newLabel: string;
      newInputMode: string;
      newCategory: string;
      onAddCustom: () => void;
    };
    component.newLabel = 'Crampes';
    component.newInputMode = 'frequency';
    component.newCategory = 'digestive';
    component.onAddCustom();
    fixture.detectChanges();

    await new Promise(r => setTimeout(r, 400));

    expect(symptomSvc.saveConfigs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: 'crampes', inputMode: 'frequency', custom: true }),
      ]),
    );
  });

  it('réinitialiser appelle SymptomService.resetToDefault après confirmation', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    const resetBtn = fixture.nativeElement.querySelector('[data-testid="reset-btn"]') as HTMLButtonElement;
    resetBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(symptomSvc.resetToDefault).toHaveBeenCalled();
  });

  it('réinitialiser ne fait rien si l\'utilisateur annule', async () => {
    window.confirm = vi.fn().mockReturnValue(false);

    const resetBtn = fixture.nativeElement.querySelector('[data-testid="reset-btn"]') as HTMLButtonElement;
    resetBtn.click();
    await fixture.whenStable();

    expect(symptomSvc.resetToDefault).not.toHaveBeenCalled();
  });

  it('recharge les configs depuis le service après réinitialisation', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const callCountBefore = symptomSvc.getAllConfigs.mock.calls.length;

    const resetBtn = fixture.nativeElement.querySelector('[data-testid="reset-btn"]') as HTMLButtonElement;
    resetBtn.click();
    await fixture.whenStable();

    expect(symptomSvc.getAllConfigs.mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it('les symptômes inactifs (energy) apparaissent dans la config bien-être', () => {
    const wellbeingSection = fixture.nativeElement.querySelector('[data-testid="bloc-wellbeing"]') as HTMLElement;
    expect(wellbeingSection.textContent).toContain('Énergie globale');
    const energyItem = fixture.nativeElement.querySelector('[data-testid="symptom-energy"]') as HTMLElement;
    expect(energyItem.classList).toContain('inactive');
  });

  it('suppression d\'un custom supprime l\'item et sauvegarde', async () => {
    // Ajouter un item custom d'abord
    const component = fixture.componentInstance as unknown as {
      newLabel: string;
      newCategory: string;
      newInputMode: string;
      onAddCustom: () => void;
      onDeleteCustom: (item: unknown) => void;
      digestiveItems: () => Array<{ id: string; custom: boolean }>;
    };
    component.newLabel = 'Mon symptôme custom';
    component.newCategory = 'digestive';
    component.newInputMode = 'intensity';
    component.onAddCustom();
    fixture.detectChanges();

    const customItem = component.digestiveItems().find(i => i.custom);
    expect(customItem).toBeTruthy();

    component.onDeleteCustom(customItem);
    fixture.detectChanges();

    await new Promise(r => setTimeout(r, 400));

    expect(component.digestiveItems().find(i => i.custom)).toBeUndefined();
    expect(symptomSvc.saveConfigs).toHaveBeenCalled();
  });

  it('annuler le formulaire d\'ajout ferme le formulaire sans sauvegarder', async () => {
    const toggleBtn = fixture.nativeElement.querySelector('[data-testid="toggle-add-form"]') as HTMLButtonElement;
    toggleBtn.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('[data-testid="add-form"]') as HTMLElement;
    expect(form).toBeTruthy();

    const cancelBtn = fixture.nativeElement.querySelector('button[aria-label="Annuler l\'ajout"]') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    const formAfter = fixture.nativeElement.querySelector('[data-testid="add-form"]') as HTMLElement;
    expect(formAfter).toBeNull();
    expect(symptomSvc.saveConfigs).not.toHaveBeenCalled();
  });
});
