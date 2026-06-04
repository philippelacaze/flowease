import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

/**
 * Page d'information sur l'application FlowEase.
 *
 * @remarks
 * Composant statique — aucune injection. Affiche version, liens et
 * mentions légales. Le numéro de version est défini à la compilation.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDividerModule, MatListModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  protected readonly version = '1.0.0';
}
