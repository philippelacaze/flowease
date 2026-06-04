import { Component } from '@angular/core';
import { ShellComponent } from './shared/layout/shell/shell.component';

/**
 * @author Philippe Lacaze
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent],
  template: '<app-shell />',
})
export class App {}
