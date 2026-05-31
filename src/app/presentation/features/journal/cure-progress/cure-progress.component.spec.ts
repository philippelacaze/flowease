import { TestBed } from '@angular/core/testing';
import { CureProgressComponent } from './cure-progress.component';
import type { CureProgressVO } from '../../../../application/journal/get-active-cures.usecase';

const SAMPLE_CURES: CureProgressVO[] = [
  { id: 'c1', name: 'Rifaximine', currentDay: 8, totalDays: 14, progressPercent: 57 },
];

async function createComponent(cures: CureProgressVO[] = []) {
  const fixture = TestBed.createComponent(CureProgressComponent);
  fixture.componentRef.setInput('cures', cures);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('CureProgressComponent', () => {
  describe('sans cures', () => {
    it('n\'affiche aucun item', async () => {
      const fixture = await createComponent([]);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="cure-progress-item"]')).toBeNull();
    });
  });

  describe('avec une cure active', () => {
    it('affiche le nom de la cure', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Rifaximine');
    });

    it('affiche le label Jour 8/14', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Jour 8/14');
    });

    it('la barre a aria-valuenow = 8', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      const bar = el.querySelector('[role="progressbar"]');
      expect(bar?.getAttribute('aria-valuenow')).toBe('8');
    });

    it('la barre a aria-valuemax = 14', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      const bar = el.querySelector('[role="progressbar"]');
      expect(bar?.getAttribute('aria-valuemax')).toBe('14');
    });

    it('la barre a aria-valuemin = 1', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      const bar = el.querySelector('[role="progressbar"]');
      expect(bar?.getAttribute('aria-valuemin')).toBe('1');
    });

    it('la fill est à 57% de largeur', async () => {
      const fixture = await createComponent(SAMPLE_CURES);
      const el = fixture.nativeElement as HTMLElement;
      const fill = el.querySelector<HTMLElement>('.cure-fill');
      expect(fill?.style.width).toBe('57%');
    });
  });

  describe('avec plusieurs cures', () => {
    const twoCures: CureProgressVO[] = [
      { id: 'c1', name: 'Rifaximine', currentDay: 8, totalDays: 14, progressPercent: 57 },
      { id: 'c2', name: 'Probiotic', currentDay: 1, totalDays: 30, progressPercent: 3 },
    ];

    it('affiche deux items', async () => {
      const fixture = await createComponent(twoCures);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('[data-testid="cure-progress-item"]').length).toBe(2);
    });
  });
});
