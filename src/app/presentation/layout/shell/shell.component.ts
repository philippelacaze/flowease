import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { SideNavComponent } from '../side-nav/side-nav.component';

/**
 * Composant racine de mise en page de l'application.
 *
 * @remarks
 * Respecte SRP : unique responsabilité = choisir entre layout mobile et desktop.
 * Desktop (≥ 768px) : MatSidenav permanent + SideNavComponent.
 * Mobile (< 768px) : main scrollable + BottomNavComponent fixé en bas.
 * Le router-outlet est positionné dans le contenu principal dans les deux cas.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, BottomNavComponent, SideNavComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly isDesktop = toSignal(
    this.breakpoints.observe('(min-width: 768px)').pipe(map(s => s.matches)),
    { initialValue: false },
  );
}
