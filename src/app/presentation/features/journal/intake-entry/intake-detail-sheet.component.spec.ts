import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { IntakeDetailSheetComponent, type SheetResult } from './intake-detail-sheet.component';

const MOCK_TREATMENT = {
  id: 'treat-1',
  name: 'Rifaximine',
  dosage: 550,
  unit: 'mg',
  frequency: 2,
  active: true,
  category: 'antibiotic',
  mode: 'oral',
  reminder: { enabled: false, times: [], soundEnabled: false },
};

function makeSheetRefMock() {
  return { dismiss: vi.fn() };
}

async function createSheet() {
  const sheetRef = makeSheetRefMock();

  await TestBed.configureTestingModule({
    imports: [IntakeDetailSheetComponent, NoopAnimationsModule],
    providers: [
      { provide: MatBottomSheetRef, useValue: sheetRef },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: { treatment: MOCK_TREATMENT, confirmed: false, skipped: false } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(IntakeDetailSheetComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, sheetRef };
}

type SheetPrivate = {
  showSkipReason: boolean;
  detailNote: string;
  selectedSkipReason: string;
  confirmTaken(): void;
  initiateSkip(): void;
};

describe('IntakeDetailSheetComponent', () => {

  describe('initialisation', () => {
    it('affiche le nom et le dosage du traitement', async () => {
      const { fixture } = await createSheet();
      const name = fixture.nativeElement.querySelector('.sheet-name') as HTMLElement;
      expect(name.textContent?.trim()).toBe('Rifaximine');
    });

    it('showSkipReason est faux par défaut', async () => {
      const { fixture } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      expect(comp.showSkipReason).toBe(false);
    });

    it('le sélecteur de raison n\'est pas affiché par défaut', async () => {
      const { fixture } = await createSheet();
      const select = fixture.debugElement.query(By.css('[data-testid="skip-reason-select"]'));
      expect(select).toBeNull();
    });

    it('affiche le champ note toujours visible', async () => {
      const { fixture } = await createSheet();
      const note = fixture.debugElement.query(By.css('[data-testid="detail-note"]'));
      expect(note).not.toBeNull();
    });
  });

  describe('confirmTaken — bouton "✓ Pris"', () => {
    it('dismiss avec action "taken" et sans notes si vide', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.confirmTaken();
      expect(sheetRef.dismiss).toHaveBeenCalledWith({ action: 'taken' });
    });

    it('dismiss avec action "taken" et la note si renseignée', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.detailNote = 'Pris avec repas léger';
      comp.confirmTaken();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result.action).toBe('taken');
      expect(result.notes).toBe('Pris avec repas léger');
    });

    it('ne transmet pas notes si la note ne contient que des espaces', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.detailNote = '   ';
      comp.confirmTaken();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result['notes']).toBeUndefined();
    });
  });

  describe('initiateSkip — bouton "Sauté" / "Confirmer le saut"', () => {
    it('premier tap révèle le sélecteur de raison sans dismiss', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      expect(comp.showSkipReason).toBe(true);
      expect(sheetRef.dismiss).not.toHaveBeenCalled();
    });

    it('le sélecteur de raison s\'affiche après le premier tap', async () => {
      const { fixture } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      fixture.detectChanges();
      const select = fixture.debugElement.query(By.css('[data-testid="skip-reason-select"]'));
      expect(select).not.toBeNull();
    });

    it('deuxième tap dismiss avec action "skipped"', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      comp.initiateSkip();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result.action).toBe('skipped');
    });

    it('transmet la raison sélectionnée lors du dismiss', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      comp.selectedSkipReason = 'forgot';
      comp.initiateSkip();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result.skipReason).toBe('forgot');
    });

    it('transmet deliberate_choice comme raison de saut', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      comp.selectedSkipReason = 'deliberate_choice';
      comp.initiateSkip();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result.skipReason).toBe('deliberate_choice');
    });

    it('ne transmet pas skipReason si aucune raison sélectionnée', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.initiateSkip();
      comp.selectedSkipReason = '';
      comp.initiateSkip();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result['skipReason']).toBeUndefined();
    });

    it('transmet note et raison ensemble lors du saut', async () => {
      const { fixture, sheetRef } = await createSheet();
      const comp = fixture.componentInstance as unknown as SheetPrivate;
      comp.detailNote = 'Mal au ventre';
      comp.initiateSkip();
      comp.selectedSkipReason = 'side_effects';
      comp.initiateSkip();
      const result = sheetRef.dismiss.mock.calls[0][0] as SheetResult;
      expect(result.action).toBe('skipped');
      expect(result.notes).toBe('Mal au ventre');
      expect(result.skipReason).toBe('side_effects');
    });
  });

  describe('data-testid — navigation par les tests E2E', () => {
    it('affiche data-testid="confirm-taken"', async () => {
      const { fixture } = await createSheet();
      expect(fixture.debugElement.query(By.css('[data-testid="confirm-taken"]'))).not.toBeNull();
    });

    it('affiche data-testid="confirm-skipped"', async () => {
      const { fixture } = await createSheet();
      expect(fixture.debugElement.query(By.css('[data-testid="confirm-skipped"]'))).not.toBeNull();
    });

    it('affiche data-testid="detail-note"', async () => {
      const { fixture } = await createSheet();
      expect(fixture.debugElement.query(By.css('[data-testid="detail-note"]'))).not.toBeNull();
    });
  });
});
