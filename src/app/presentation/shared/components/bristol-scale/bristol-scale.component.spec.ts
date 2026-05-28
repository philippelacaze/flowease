import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BristolScaleComponent } from './bristol-scale.component';

async function createComponent(value: number | null = null, collapsed = true) {
  await TestBed.configureTestingModule({
    imports: [BristolScaleComponent, NoopAnimationsModule],
  }).compileComponents();

  const fixture = TestBed.createComponent(BristolScaleComponent);
  fixture.componentInstance.value = value as never;
  fixture.componentInstance.collapsed = collapsed;
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('BristolScaleComponent', () => {
  describe('état collapsed', () => {
    it('affiche le bouton collapsed par défaut', async () => {
      const fixture = await createComponent(null, true);
      expect(fixture.nativeElement.querySelector('[data-testid="bristol-collapsed-btn"]')).not.toBeNull();
    });

    it('affiche "Non renseigné" quand aucune valeur', async () => {
      const fixture = await createComponent(null, true);
      expect(fixture.nativeElement.textContent).toContain('Non renseigné');
    });

    it('affiche "Type 4 — …" quand une valeur est sélectionnée', async () => {
      const fixture = await createComponent(4, true);
      expect(fixture.nativeElement.textContent).toContain('Type 4');
    });

    it('n\'affiche pas la grille quand collapsed', async () => {
      const fixture = await createComponent(null, true);
      expect(fixture.nativeElement.querySelector('.bristol-scale')).toBeNull();
    });
  });

  describe('toggle', () => {
    it('ouvre la grille au clic sur le bouton collapsed', async () => {
      const fixture = await createComponent(null, true);
      fixture.nativeElement.querySelector('[data-testid="bristol-collapsed-btn"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.bristol-scale')).not.toBeNull();
    });

    it('referme la grille après sélection d\'un type', async () => {
      const fixture = await createComponent(null, false);
      const items = fixture.nativeElement.querySelectorAll('.bristol-item');
      items[3].click(); // Type 4
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="bristol-collapsed-btn"]')).not.toBeNull();
    });
  });

  describe('état expanded', () => {
    it('affiche 7 boutons dans la grille', async () => {
      const fixture = await createComponent(null, false);
      const items = fixture.nativeElement.querySelectorAll('.bristol-item');
      expect(items).toHaveLength(7);
    });

    it('affiche la légende (Constipation / Normal / Diarrhée)', async () => {
      const fixture = await createComponent(null, false);
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Constipation');
      expect(text).toContain('Normal');
      expect(text).toContain('Diarrhée');
    });

    it('marque le type sélectionné avec bristol-item--selected', async () => {
      const fixture = await createComponent(3, false);
      const selected = fixture.nativeElement.querySelector('.bristol-item--selected');
      expect(selected).not.toBeNull();
      expect(selected.querySelector('.bristol-type-num').textContent.trim()).toBe('3');
    });

    it('émet valueChange quand on sélectionne un type', async () => {
      const fixture = await createComponent(null, false);
      const emitted: number[] = [];
      fixture.componentInstance.valueChange.subscribe((v: number) => emitted.push(v));
      fixture.nativeElement.querySelectorAll('.bristol-item')[2].click();
      expect(emitted).toEqual([3]);
    });
  });

  describe('labelFor', () => {
    it('retourne le label pour un type valide', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { labelFor(t: number): string };
      expect(comp.labelFor(4)).toBeTruthy();
    });

    it('retourne une chaîne vide pour null', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { labelFor(t: null): string };
      expect(comp.labelFor(null)).toBe('');
    });
  });
});
