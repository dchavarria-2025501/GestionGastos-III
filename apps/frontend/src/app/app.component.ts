import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { SessionExpiredModalComponent } from './shared/session-expired-modal/session-expired-modal.component';

// Estas rutas ya traen su propio encabezado y sidebar (para que la pantalla
// quede identica al diseño final), asi que ahi se oculta el navbar generico.
const RUTAS_CON_LAYOUT_PROPIO = ['/dashboard', '/gastos', '/ingresos', '/fondo-emergencia'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SessionExpiredModalComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  mostrarNavbarGenerico = signal(true);

  constructor(private router: Router) {
    this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe((evento) => {
      const url = (evento as NavigationEnd).urlAfterRedirects;
      const tieneLayoutPropio = RUTAS_CON_LAYOUT_PROPIO.some((ruta) => url.startsWith(ruta));
      this.mostrarNavbarGenerico.set(!tieneLayoutPropio);
    });
  }
}
