import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { IntensitySliderComponent } from './intensity-slider.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('IntensitySliderComponent', () => {
  let fixture: ComponentFixture<IntensitySliderComponent>;
  let component: IntensitySliderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntensitySliderComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(IntensitySliderComponent);
    component = fixture.componentInstance;
  });

  describe('rendu initial', () => {
    it('affiche la valeur initiale dans le label', () => {
      component.value = 7;
      component.label = 'Douleur abdominale';
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('7/10');
    });

    it('affiche le label fourni en Input', () => {
      component.label = 'Intensité des nausées';
      component.value = 3;
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Intensité des nausées');
    });

    it('rend un mat-slider dans le DOM', () => {
      fixture.detectChanges();
      const slider = fixture.debugElement.query(By.css('mat-slider'));
      expect(slider).not.toBeNull();
    });

    it('expose aria-valuemin=1 et aria-valuemax=10 sur le slider', () => {
      fixture.detectChanges();
      const slider = fixture.debugElement.query(By.css('mat-slider')).nativeElement as HTMLElement;
      expect(slider.getAttribute('aria-valuemin')).toBe('1');
      expect(slider.getAttribute('aria-valuemax')).toBe('10');
    });
  });

  describe('émission de valueChange', () => {
    it('émet la nouvelle valeur lors d\'un changement via onValueChange()', () => {
      fixture.detectChanges();
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      (component as unknown as { onValueChange(v: number): void }).onValueChange(8);

      expect(emitted).toEqual([8]);
    });

    it('met à jour la propriété value interne après le changement', () => {
      fixture.detectChanges();
      (component as unknown as { onValueChange(v: number): void }).onValueChange(4);
      expect(component.value).toBe(4);
    });

    it('n\'émet pas de valeur avant interaction', () => {
      fixture.detectChanges();
      const spy = vi.fn();
      component.valueChange.subscribe(spy);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
