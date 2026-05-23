import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AbdominalMapComponent } from './abdominal-map.component';
import type { AbdominalZone } from '../../../../domain/value-objects/pain-location.vo';

describe('AbdominalMapComponent', () => {
  let fixture: ComponentFixture<AbdominalMapComponent>;
  let component: AbdominalMapComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbdominalMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AbdominalMapComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedZones', []);
    fixture.detectChanges();
  });

  describe('sélection d\'une zone', () => {
    it('émet zonesChange avec une zone lors du premier tap sur un bouton', () => {
      const emitted: AbdominalZone[][] = [];
      component.zonesChange.subscribe((z: AbdominalZone[]) => emitted.push(z));

      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      buttons[0].triggerEventHandler('click', null);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toHaveLength(1);
    });

    it('émet un tableau vide si on désélectionne la seule zone active', () => {
      // Le premier bouton correspond à 'hypochondre_right' dans le tableau zones[]
      fixture.componentRef.setInput('selectedZones', ['hypochondre_right']);
      fixture.detectChanges();

      const emitted: AbdominalZone[][] = [];
      component.zonesChange.subscribe((z: AbdominalZone[]) => emitted.push(z));

      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      buttons[0].triggerEventHandler('click', null); // désélectionne hypochondre_right
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).not.toContain('hypochondre_right');
      expect(emitted[0]).toHaveLength(0);
    });
  });

  describe('multi-sélection', () => {
    it('accumule plusieurs zones après des taps successifs', () => {
      const collected: AbdominalZone[][] = [];
      component.zonesChange.subscribe((z: AbdominalZone[]) => {
        fixture.componentRef.setInput('selectedZones', z);
        collected.push(z);
        fixture.detectChanges();
      });

      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      buttons[0].triggerEventHandler('click', null);
      buttons[1].triggerEventHandler('click', null);

      expect(collected[collected.length - 1]).toHaveLength(2);
    });

    it('dé-sélectionne une zone sans affecter les autres zones actives', () => {
      fixture.componentRef.setInput('selectedZones', ['hypochondre_right', 'periumbilical']);
      fixture.detectChanges();

      const emitted: AbdominalZone[][] = [];
      component.zonesChange.subscribe((z: AbdominalZone[]) => emitted.push(z));

      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      buttons[0].triggerEventHandler('click', null); // désélectionne hypochondre_right

      expect(emitted[0]).not.toContain('hypochondre_right');
      expect(emitted[0]).toContain('periumbilical');
    });
  });

  describe('accessibilité', () => {
    it('chaque bouton de zone possède un aria-label non vide', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(btn => {
        const label = (btn.nativeElement as HTMLElement).getAttribute('aria-label');
        expect(label).toBeTruthy();
      });
    });

    it('aria-pressed est true sur la zone sélectionnée', () => {
      fixture.componentRef.setInput('selectedZones', ['hypochondre_right']);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      const pressedValues = buttons.map(
        btn => (btn.nativeElement as HTMLElement).getAttribute('aria-pressed'),
      );
      expect(pressedValues).toContain('true');
    });

    it('rend 6 boutons de zone (une par zone abdominale)', () => {
      const buttons = fixture.debugElement.queryAll(By.css('.zone-btn'));
      expect(buttons).toHaveLength(6);
    });
  });
});
