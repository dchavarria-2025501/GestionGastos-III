import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

// La meta de ahorro es una preferencia personal, no un dato financiero
// sensible del backend: se guarda en este navegador para que el usuario
// pueda fijar su propio objetivo sin necesitar un modulo aparte.
const LLAVE_META = 'gg_meta_fondo_emergencia';
const META_POR_DEFECTO = 10000;

@Component({
  selector: 'app-fondo-emergencia',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebarComponent],
  templateUrl: './fondo-emergencia.component.html',
})
export class FondoEmergenciaComponent implements OnInit {
  aportes: Movimiento[] = [];
  cargando = true;

  meta = META_POR_DEFECTO;
  editandoMeta = false;
  metaTemporal = META_POR_DEFECTO;

  descripcionNueva = 'Aporte al fondo';
  montoNuevo: number | null = null;
  guardando = false;
  error = '';

  constructor(public auth: AuthService, private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    const metaGuardada = localStorage.getItem(LLAVE_META);
    if (metaGuardada) {
      this.meta = Number(metaGuardada);
      this.metaTemporal = this.meta;
    }
    this.cargarAportes();
  }

  private cargarAportes(): void {
    this.cargando = true;
    this.movimientoService.listar().subscribe({
      next: (res) => {
        this.aportes = res.movimientos
          .filter((m) => m.categoria === 'fondo_emergencia')
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  get totalAhorrado(): number {
    return this.aportes.reduce((suma, a) => suma + a.monto, 0);
  }

  get porcentajeMeta(): number {
    if (this.meta <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.totalAhorrado / this.meta) * 1000) / 10);
  }

  get faltaParaMeta(): number {
    return Math.max(0, this.meta - this.totalAhorrado);
  }

  get metaAlcanzada(): boolean {
    return this.totalAhorrado >= this.meta && this.meta > 0;
  }

  formatearQ(monto: number): string {
    return monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  abrirEdicionMeta(): void {
    this.metaTemporal = this.meta;
    this.editandoMeta = true;
  }

  guardarMeta(): void {
    if (this.metaTemporal && this.metaTemporal > 0) {
      this.meta = this.metaTemporal;
      localStorage.setItem(LLAVE_META, String(this.meta));
    }
    this.editandoMeta = false;
  }

  agregarAporte(): void {
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
    this.movimientoService.crear('fondo_emergencia', this.descripcionNueva.trim(), this.montoNuevo).subscribe({
      next: (res) => {
        this.guardando = false;
        this.aportes = [res.movimiento, ...this.aportes];
        this.descripcionNueva = 'Aporte al fondo';
        this.montoNuevo = null;
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message || 'No se pudo guardar el aporte.';
      },
    });
  }

  eliminarAporte(id: string): void {
    this.movimientoService.eliminar(id).subscribe({
      next: () => {
        this.aportes = this.aportes.filter((a) => a.id !== id);
      },
    });
  }
}
