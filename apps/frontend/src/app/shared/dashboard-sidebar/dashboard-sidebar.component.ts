import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  // Cual item resaltar como activo: 'dashboard' | 'gastos' | 'ingresos' | 'fondo-emergencia'
  @Input() activo: 'dashboard' | 'gastos' | 'ingresos' | 'fondo-emergencia' = 'dashboard';

  @Output() proximamente = new EventEmitter<void>();

  logoCargado = false;

  constructor(public auth: AuthService) {}

  onLogoLoad(): void {
    this.logoCargado = true;
  }

  onLogoError(): void {
    this.logoCargado = false;
  }

  avisarProximamente(): void {
    this.proximamente.emit();
  }

  logout(): void {
    this.auth.logout();
  }
}
