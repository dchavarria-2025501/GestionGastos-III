import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-sidebar.component.html',
})
export class DashboardSidebarComponent {
  // Cual item resaltar como activo
  @Input() activo: 'dashboard' | 'gastos' | 'ingresos' | 'fondo-emergencia' | 'impuestos' | 'reportes' | 'mi-tarjeta' = 'dashboard';

  logoCargado = false;

  constructor(public auth: AuthService) {}

  onLogoLoad(): void {
    this.logoCargado = true;
  }

  onLogoError(): void {
    this.logoCargado = false;
  }

  logout(): void {
    this.auth.logout();
  }
}
