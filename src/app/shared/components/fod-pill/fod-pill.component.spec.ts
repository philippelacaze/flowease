import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FodPillComponent } from './fod-pill.component';

describe('FodPillComponent', () => {
  it('affiche 3 niveaux FODMAP', async () => {
    await TestBed.configureTestingModule({
      imports: [FodPillComponent, NoopAnimationsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(FodPillComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.fod-pill-item')).toHaveLength(3);
  });

  it('affiche les labels Faible, Moyen, Élevé', async () => {
    await TestBed.configureTestingModule({
      imports: [FodPillComponent, NoopAnimationsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(FodPillComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Faible');
    expect(text).toContain('Moyen');
    expect(text).toContain('Élevé');
  });

  it('chaque item a un dot avec une couleur de fond', async () => {
    await TestBed.configureTestingModule({
      imports: [FodPillComponent, NoopAnimationsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(FodPillComponent);
    fixture.detectChanges();
    const dots = fixture.nativeElement.querySelectorAll('.fod-pill-dot');
    dots.forEach((dot: HTMLElement) => {
      expect(dot.style.background).toBeTruthy();
    });
  });
});
