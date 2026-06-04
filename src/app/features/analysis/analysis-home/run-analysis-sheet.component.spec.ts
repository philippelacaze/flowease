import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { RunAnalysisSheetComponent } from './run-analysis-sheet.component';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

const mockSheetRef = { dismiss: vi.fn() };

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [RunAnalysisSheetComponent, NoopAnimationsModule],
    providers: [
      { provide: MatBottomSheetRef, useValue: mockSheetRef },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RunAnalysisSheetComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('RunAnalysisSheetComponent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('affiche 4 options de fenêtre', async () => {
    const fixture = await createComponent();
    const options = fixture.nativeElement.querySelectorAll('.sheet-option');
    expect(options).toHaveLength(4);
  });

  it('ferme la sheet avec 7 quand on sélectionne 7 jours', async () => {
    const fixture = await createComponent();
    const btn = fixture.nativeElement.querySelector('[data-testid="analysis-option-7"]');
    btn.click();
    expect(mockSheetRef.dismiss).toHaveBeenCalledWith(7);
  });

  it('ferme la sheet avec 30 quand on sélectionne 30 jours', async () => {
    const fixture = await createComponent();
    const btn = fixture.nativeElement.querySelector('[data-testid="analysis-option-30"]');
    btn.click();
    expect(mockSheetRef.dismiss).toHaveBeenCalledWith(30);
  });

  it('affiche l\'estimation tokens pour chaque option', async () => {
    const fixture = await createComponent();
    const ests = fixture.nativeElement.querySelectorAll('.sheet-option-est');
    expect(ests[0].textContent).toContain('500');
    expect(ests[2].textContent).toContain('2 500');
  });
});
