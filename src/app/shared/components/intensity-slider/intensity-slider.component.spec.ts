import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    it('affiche "—" quand la valeur est 0 (absent)', () => {
      component.value = 0;
      component.label = 'Douleur';
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('—');
    });

    it('affiche X/10 quand la valeur est > 0', () => {
      component.value = 7;
      component.label = 'Douleur abdominale';
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('7/10');
    });

    it('affiche le label fourni en Input', () => {
      component.label = 'Intensité des nausées';
      component.value = 3;
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Intensité des nausées');
    });

    it('rend un input[type="range"] dans le DOM', () => {
      fixture.detectChanges();
      const range = fixture.nativeElement.querySelector('input[type="range"]');
      expect(range).not.toBeNull();
    });

    it('le range a min=0 et max=10', () => {
      fixture.detectChanges();
      const range = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
      expect(range.min).toBe('0');
      expect(range.max).toBe('10');
    });

    it('affiche la légende Absent/Modéré/Intense par défaut', () => {
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Absent');
      expect(text).toContain('Modéré');
      expect(text).toContain('Intense');
    });
  });

  describe('mode inversé (inverted)', () => {
    beforeEach(() => { component.inverted = true; });

    it('affiche "Très mauvais" et "Très bon" à la place de "Absent" et "Intense"', () => {
      component.value = 0;
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Très mauvais');
      expect(text).toContain('Très bon');
      expect(text).not.toContain('Absent');
      expect(text).not.toContain('Intense');
    });

    it('scoreColor retourne high-dot pour valeur 1–3 (bas = mauvais)', () => {
      component.value = 2;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--fodmap-high-dot)');
    });

    it('scoreColor retourne low-dot pour valeur 7–10 (haut = bon)', () => {
      component.value = 8;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--fodmap-low-dot)');
    });

    it('legendMinColor retourne high-dot (rouge = mauvais côté min)', () => {
      expect((component as unknown as { legendMinColor: string }).legendMinColor).toBe('var(--fodmap-high-dot)');
    });

    it('legendMaxColor retourne low-dot (vert = bon côté max)', () => {
      expect((component as unknown as { legendMaxColor: string }).legendMaxColor).toBe('var(--fodmap-low-dot)');
    });
  });

  describe('scoreColor', () => {
    it('retourne la couleur chip-border pour valeur 0', () => {
      component.value = 0;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--chip-border)');
    });

    it('retourne la couleur low pour valeur 1–3', () => {
      component.value = 2;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--fodmap-low-dot)');
    });

    it('retourne la couleur medium pour valeur 4–6', () => {
      component.value = 5;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--fodmap-medium-dot)');
    });

    it('retourne la couleur high pour valeur 7–10', () => {
      component.value = 9;
      expect((component as unknown as { scoreColor: string }).scoreColor).toBe('var(--fodmap-high-dot)');
    });
  });

  describe('émission de valueChange', () => {
    it('émet la nouvelle valeur lors d\'un changement via onInput()', () => {
      fixture.detectChanges();
      const emitted: number[] = [];
      component.valueChange.subscribe((v: number) => emitted.push(v));

      const event = { target: { value: '8' } } as unknown as Event;
      (component as unknown as { onInput(e: Event): void }).onInput(event);

      expect(emitted).toEqual([8]);
    });

    it('met à jour la propriété value interne après le changement', () => {
      fixture.detectChanges();
      const event = { target: { value: '4' } } as unknown as Event;
      (component as unknown as { onInput(e: Event): void }).onInput(event);
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
