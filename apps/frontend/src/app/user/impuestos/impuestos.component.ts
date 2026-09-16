import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaMovimiento, Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

interface TipoImpuesto {
  etiqueta: string;
}

const TIPOS_IMPUESTO: TipoImpuesto[] = [
  { etiqueta: 'IVA' },
  { etiqueta: 'ISR' },
  { etiqueta: 'IUSI' },
  { etiqueta: 'Circulación' },
  { etiqueta: 'Otro' },
];

// Umbrales orientativos de carga fiscal (impuestos / ingresos) para darle
// color y un mensaje al medidor. No son un consejo legal ni contable,
// solo una referencia visual.
const LIMITE_SALUDABLE = 20;
const LIMITE_ALTO = 35;

@Component({
  selector: 'app-impuestos',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebarComponent],
  templateUrl: './impuestos.component.html',
})
export class ImpuestosComponent implements OnInit {
  movimientos: Movimiento[] = [];
  cargando = true;

  tiposImpuesto = TIPOS_IMPUESTO;
  tipoActivo: string | null = null;

  descripcionNueva = '';
  montoNuevo: number | null = null;
  guardando = false;
  error = '';

  constructor(public auth: AuthService, private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    this.cargando = true;
    this.movimientoService.listar().subscribe({
      next: (res) => {
        this.movimientos = res.movimientos;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  private totalPorCategoria(categoria: CategoriaMovimiento): number {
    return this.movimientos
      .filter((m) => m.categoria === categoria)
      .reduce((suma, m) => suma + m.monto, 0);
  }

  get impuestos(): Movimiento[] {
    return this.movimientos
      .filter((m) => m.categoria === 'impuestos')
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  get totalImpuestos(): number {
    return this.totalPorCategoria('impuestos');
  }

  get totalIngresos(): number {
    return this.totalPorCategoria('ingresos');
  }

  get disponible(): number {
    return this.movimientoService.calcularDisponible(this.movimientos);
  }

  /** Que % de los ingresos se ha ido en impuestos (la "carga fiscal"). */
  get cargaFiscal(): number {
    if (this.totalIngresos <= 0) {
      return 0;
    }
    return Math.round((this.totalImpuestos / this.totalIngresos) * 1000) / 10;
  }

  get cargaFiscalVisual(): number {
    return Math.min(100, this.cargaFiscal);
  }

  get colorMedidor(): string {
    if (this.cargaFiscal <= LIMITE_SALUDABLE) return '#939d82';
    if (this.cargaFiscal <= LIMITE_ALTO) return '#db9c4c';
    return '#c2604a';
  }

  get mensajeMedidor(): string {
    if (this.totalIngresos <= 0) {
      return 'Registra ingresos para calcular tu carga fiscal.';
    }
    if (this.cargaFiscal <= LIMITE_SALUDABLE) return 'Tu carga fiscal luce saludable.';
    if (this.cargaFiscal <= LIMITE_ALTO) return 'Tu carga fiscal es moderada.';
    return 'Una buena parte de tus ingresos se va en impuestos.';
  }

  /** Semicirculo del medidor: relleno de -90deg hasta el % actual. */
  get gradienteMedidor(): string {
    const fraccionVuelta = (this.cargaFiscalVisual / 100) * 0.5;
    return `conic-gradient(from -90deg, ${this.colorMedidor} 0turn, ${this.colorMedidor} ${fraccionVuelta}turn, rgba(255,255,255,0.12) ${fraccionVuelta}turn, rgba(255,255,255,0.12) 0.5turn, transparent 0.5turn 1turn)`;
  }

  formatearQ(monto: number): string {
    return monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  elegirTipo(tipo: TipoImpuesto): void {
    this.tipoActivo = tipo.etiqueta;
    this.descripcionNueva = tipo.etiqueta;
  }

  agregarImpuesto(): void {
    this.error = '';

    if (!this.descripcionNueva.trim()) {
      this.error = 'Escribe una descripcion o elige un tipo de impuesto.';
      return;
    }
    if (!this.montoNuevo || this.montoNuevo <= 0) {
      this.error = 'El monto debe ser mayor a 0.';
      return;
    }

    this.guardando = true;
    this.movimientoService.crear('impuestos', this.descripcionNueva.trim(), this.montoNuevo).subscribe({
      next: (res) => {
        this.guardando = false;
        this.movimientos = [res.movimiento, ...this.movimientos];
        this.descripcionNueva = '';
        this.montoNuevo = null;
        this.tipoActivo = null;
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message || 'No se pudo guardar el impuesto.';
      },
    });
  }

  eliminarImpuesto(id: string): void {
    this.movimientoService.eliminar(id).subscribe({
      next: () => {
        this.movimientos = this.movimientos.filter((m) => m.id !== id);
      },
    });
  }
}
