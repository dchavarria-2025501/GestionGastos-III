import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CategoriaMovimiento, Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

interface SegmentoDistribucion {
  etiqueta: string;
  categoria: CategoriaMovimiento;
  porcentaje: number;
  color: string;
}

interface SegmentoConPosicion extends SegmentoDistribucion {
  left: string;
  top: string;
}

interface FilaGasto {
  cliente: string;
  detalle: string;
  fecha: string;
  cantidad: string;
  resultado: string;
}

// Radio (en % del contenedor del grafico) donde se colocan las etiquetas,
// justo por fuera del borde del pastel.
const RADIO_ETIQUETAS = 40;

const COLORES_CATEGORIA: Record<CategoriaMovimiento, string> = {
  ingresos: '#d0a569',
  gastos: '#a9a49b',
  impuestos: '#939d82',
  fondo_emergencia: '#f4ecdb',
};

const ETIQUETAS_CATEGORIA: Record<CategoriaMovimiento, string> = {
  ingresos: 'Ingresos',
  gastos: 'Gastos',
  impuestos: 'Impuestos',
  fondo_emergencia: 'Fondo Emergencia',
};

// Distribucion y tabla de ejemplo que se muestran unicamente mientras el
// usuario todavia no ha registrado ningun ingreso o gasto propio.
const DISTRIBUCION_DEMO: Record<CategoriaMovimiento, number> = {
  ingresos: 52.7,
  gastos: 24.4,
  impuestos: 16.1,
  fondo_emergencia: 6.8,
};

const BALANCE_DEMO = 25000;

const GASTOS_DEMO: FilaGasto[] = [
  { cliente: 'EGGSA', detalle: 'Empresa Luz', fecha: 'Hoy · Hace 2m', cantidad: 'Q. 450.00', resultado: 'Completado' },
  { cliente: 'Claro', detalle: 'Internet', fecha: 'Hoy · Hace 5m', cantidad: 'Q. 355.00', resultado: 'Completado' },
  { cliente: 'AGUA', detalle: 'Mario Ferguson', fecha: 'Ayer · 7:30 AM', cantidad: 'Q. 500.00', resultado: 'Completado' },
  { cliente: 'Karla Marroquin', detalle: 'Cuenta de Banco', fecha: 'Ayer · 1:18 PM', cantidad: 'Q. 1,000.00', resultado: 'Completado' },
  { cliente: 'Despensa Familia', detalle: 'Empresa', fecha: 'Hace 2D · 4:18 PM', cantidad: 'Q. 500.00', resultado: 'Completado' },
  { cliente: 'Cesar Martinez', detalle: 'Cuenta de Banco', fecha: 'Hace 2D · 10:31 AM', cantidad: 'Q. 1,000.00', resultado: 'Completado' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardSidebarComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  movimientos: Movimiento[] = [];

  constructor(public auth: AuthService, private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    this.movimientoService.listar().subscribe({
      next: (res) => {
        this.movimientos = res.movimientos;
      },
      error: () => {},
    });
  }

  private totalPorCategoria(categoria: CategoriaMovimiento): number {
    return this.movimientos
      .filter((m) => m.categoria === categoria)
      .reduce((suma, m) => suma + m.monto, 0);
  }

  get tieneMovimientos(): boolean {
    return this.movimientos.length > 0;
  }

  get distribucion(): SegmentoDistribucion[] {
    const categorias: CategoriaMovimiento[] = ['ingresos', 'gastos', 'impuestos', 'fondo_emergencia'];

    if (!this.tieneMovimientos) {
      return categorias.map((categoria) => ({
        etiqueta: ETIQUETAS_CATEGORIA[categoria],
        categoria,
        porcentaje: DISTRIBUCION_DEMO[categoria],
        color: COLORES_CATEGORIA[categoria],
      }));
    }

    const totales = categorias.map((categoria) => this.totalPorCategoria(categoria));
    const sumaTotal = totales.reduce((a, b) => a + b, 0);

    return categorias.map((categoria, i) => ({
      etiqueta: ETIQUETAS_CATEGORIA[categoria],
      categoria,
      porcentaje: sumaTotal > 0 ? Math.round((totales[i] / sumaTotal) * 1000) / 10 : 0,
      color: COLORES_CATEGORIA[categoria],
    }));
  }

  get balanceTotal(): number {
    if (!this.tieneMovimientos) {
      return BALANCE_DEMO;
    }
    return (
      this.totalPorCategoria('ingresos') -
      this.totalPorCategoria('gastos') -
      this.totalPorCategoria('impuestos') -
      this.totalPorCategoria('fondo_emergencia')
    );
  }

  get balanceFormateado(): string {
    return this.balanceTotal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get filasGastos(): FilaGasto[] {
    if (!this.tieneMovimientos) {
      return GASTOS_DEMO;
    }

    return this.movimientos
      .filter((m) => m.categoria !== 'ingresos')
      .slice(0, 6)
      .map((m) => ({
        cliente: m.descripcion,
        detalle: ETIQUETAS_CATEGORIA[m.categoria],
        fecha: new Date(m.fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' }),
        cantidad: `Q. ${m.monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        resultado: 'Completado',
      }));
  }

  get gradienteDistribucion(): string {
    let acumulado = 0;
    const tramos = this.distribucion.map((segmento) => {
      const inicio = acumulado;
      acumulado += segmento.porcentaje;
      return `${segmento.color} ${inicio}% ${acumulado}%`;
    });
    return `conic-gradient(${tramos.join(', ')})`;
  }

  // Calcula, para cada segmento, la posicion (left/top en %) de su etiqueta
  // justo por fuera del pastel, en el angulo medio de ese segmento.
  get segmentosConEtiquetas(): SegmentoConPosicion[] {
    let acumulado = 0;
    return this.distribucion.map((segmento) => {
      const medioPorcentaje = acumulado + segmento.porcentaje / 2;
      acumulado += segmento.porcentaje;

      const anguloGrados = (medioPorcentaje / 100) * 360 - 90;
      const anguloRad = (anguloGrados * Math.PI) / 180;

      const left = 50 + RADIO_ETIQUETAS * Math.cos(anguloRad);
      const top = 50 + RADIO_ETIQUETAS * Math.sin(anguloRad);

      return { ...segmento, left: `${left}%`, top: `${top}%` };
    });
  }
}
