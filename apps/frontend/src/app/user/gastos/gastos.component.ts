import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebarComponent],
  templateUrl: './gastos.component.html',
})
export class GastosComponent implements OnInit {
  gastos: Movimiento[] = [];
  disponible = 0;
  cargando = true;

  descripcionNueva = '';
  montoNuevo: number | null = null;
  guardando = false;
  error = '';

  constructor(public auth: AuthService, private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    this.cargarGastos();
  }

  private cargarGastos(): void {
    this.cargando = true;
    this.movimientoService.listar().subscribe({
      next: (res) => {
        this.gastos = res.movimientos
          .filter((m) => m.categoria === 'gastos')
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.disponible = this.movimientoService.calcularDisponible(res.movimientos);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  get disponibleFormateado(): string {
    return this.disponible.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get totalGastos(): number {
    return this.gastos.reduce((suma, g) => suma + g.monto, 0);
  }

  get totalGastosFormateado(): string {
    return this.totalGastos.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatearMonto(monto: number): string {
    return monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  agregarGasto(): void {
    this.error = '';

    if (!this.descripcionNueva.trim()) {
      this.error = 'Escribe una descripcion.';
      return;
    }
    if (!this.montoNuevo || this.montoNuevo <= 0) {
      this.error = 'El monto debe ser mayor a 0.';
      return;
    }

    this.guardando = true;
    this.movimientoService.crear('gastos', this.descripcionNueva.trim(), this.montoNuevo).subscribe({
      next: (res) => {
        this.guardando = false;
        this.gastos = [res.movimiento, ...this.gastos];
        this.disponible -= res.movimiento.monto;
        this.descripcionNueva = '';
        this.montoNuevo = null;
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message || 'No se pudo guardar el gasto.';
      },
    });
  }

  eliminarGasto(id: string): void {
    const gasto = this.gastos.find((g) => g.id === id);
    this.movimientoService.eliminar(id).subscribe({
      next: () => {
        this.gastos = this.gastos.filter((g) => g.id !== id);
        if (gasto) {
          this.disponible += gasto.monto;
        }
      },
    });
  }
}
