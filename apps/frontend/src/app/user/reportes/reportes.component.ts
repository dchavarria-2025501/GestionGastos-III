import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaMovimiento, Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

interface BarraCategoria {
  categoria: CategoriaMovimiento;
  etiqueta: string;
  total: number;
  color: string;
  alturaPct: number;
}

const ETIQUETAS: Record<CategoriaMovimiento, string> = {
  ingresos: 'Ingresos',
  gastos: 'Gastos',
  impuestos: 'Impuestos',
  fondo_emergencia: 'Fondo Emergencia',
};

const COLORES: Record<CategoriaMovimiento, string> = {
  ingresos: '#db9c4c',
  gastos: '#a9a49b',
  impuestos: '#939d82',
  fondo_emergencia: '#f4e8d5',
};

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, DashboardSidebarComponent],
  templateUrl: './reportes.component.html',
})
export class ReportesComponent implements OnInit {
  movimientos: Movimiento[] = [];
  cargando = true;

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

  get totalIngresos(): number {
    return this.totalPorCategoria('ingresos');
  }

  get totalEgresos(): number {
    return this.totalPorCategoria('gastos') + this.totalPorCategoria('impuestos') + this.totalPorCategoria('fondo_emergencia');
  }

  get balanceNeto(): number {
    return this.totalIngresos - this.totalEgresos;
  }

  /** Que porcentaje del total (ingresos + egresos) representa cada lado, para la barra comparativa. */
  get porcentajeIngresos(): number {
    const total = this.totalIngresos + this.totalEgresos;
    return total > 0 ? Math.round((this.totalIngresos / total) * 1000) / 10 : 50;
  }

  get porcentajeEgresos(): number {
    return Math.round((100 - this.porcentajeIngresos) * 10) / 10;
  }

  get barras(): BarraCategoria[] {
    const categorias: CategoriaMovimiento[] = ['ingresos', 'gastos', 'impuestos', 'fondo_emergencia'];
    const totales = categorias.map((c) => this.totalPorCategoria(c));
    const maximo = Math.max(1, ...totales);

    return categorias.map((categoria, i) => ({
      categoria,
      etiqueta: ETIQUETAS[categoria],
      total: totales[i],
      color: COLORES[categoria],
      alturaPct: Math.round((totales[i] / maximo) * 100),
    }));
  }

  get movimientosRecientes(): Movimiento[] {
    return [...this.movimientos]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 8);
  }

  get tieneMovimientos(): boolean {
    return this.movimientos.length > 0;
  }

  formatearQ(monto: number): string {
    return monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  etiquetaCategoria(categoria: CategoriaMovimiento): string {
    return ETIQUETAS[categoria];
  }

  /** Genera y descarga un CSV con todos los movimientos del usuario. */
  exportarCsv(): void {
    const encabezado = ['Categoria', 'Descripcion', 'Monto', 'Fecha'];
    const filas = [...this.movimientos]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .map((m) => [
        ETIQUETAS[m.categoria],
        m.descripcion.replace(/"/g, '""'),
        m.monto.toFixed(2),
        this.formatearFecha(m.fecha),
      ]);

    const contenido = [encabezado, ...filas]
      .map((fila) => fila.map((valor) => `"${valor}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    enlace.href = url;
    enlace.download = `reporte-controla-${fecha}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
