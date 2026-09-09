import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Movimiento, MovimientoService } from '../../core/services/movimiento.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

interface CategoriaRapida {
  etiqueta: string;
  emoji: string;
}

// Atajos para no tener que escribir la descripcion desde cero cada vez.
const CATEGORIAS_RAPIDAS: CategoriaRapida[] = [
  { etiqueta: 'Salario', emoji: '💵' },
  { etiqueta: 'Freelance', emoji: '💻' },
  { etiqueta: 'Bono', emoji: '🎁' },
  { etiqueta: 'Venta', emoji: '🏷️' },
  { etiqueta: 'Reembolso', emoji: '↩️' },
];

@Component({
  selector: 'app-ingresos',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebarComponent],
  templateUrl: './ingresos.component.html',
})
export class IngresosComponent implements OnInit {
  ingresos: Movimiento[] = [];
  cargando = true;

  categoriasRapidas = CATEGORIAS_RAPIDAS;
  categoriaActiva: string | null = null;

  descripcionNueva = '';
  montoNuevo: number | null = null;
  guardando = false;
  error = '';

  // Para que el numero del resumen "cuente" al cargar, en vez de aparecer
  // ya calculado de golpe.
  totalAnimado = 0;

  constructor(public auth: AuthService, private movimientoService: MovimientoService) {}

  ngOnInit(): void {
    this.cargarIngresos();
  }

  private cargarIngresos(): void {
    this.cargando = true;
    this.movimientoService.listar().subscribe({
      next: (res) => {
        this.ingresos = res.movimientos
          .filter((m) => m.categoria === 'ingresos')
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        this.cargando = false;
        this.animarTotal();
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  private animarTotal(): void {
    const destino = this.totalIngresos;
    const duracionMs = 700;
    const inicio = performance.now();

    const paso = (ahora: number) => {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs);
      // easeOutCubic: arranca rapido y desacelera al final.
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      this.totalAnimado = destino * suavizado;
      if (progreso < 1) {
        requestAnimationFrame(paso);
      } else {
        this.totalAnimado = destino;
      }
    };

    requestAnimationFrame(paso);
  }

  get totalIngresos(): number {
    return this.ingresos.reduce((suma, i) => suma + i.monto, 0);
  }

  get totalAnimadoFormateado(): string {
    return this.totalAnimado.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get promedioIngreso(): string {
    if (this.ingresos.length === 0) {
      return '0.00';
    }
    return (this.totalIngresos / this.ingresos.length).toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatearMonto(monto: number): string {
    return monto.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  elegirCategoriaRapida(cat: CategoriaRapida): void {
    this.categoriaActiva = cat.etiqueta;
    this.descripcionNueva = cat.etiqueta;
  }

  agregarIngreso(): void {
    this.error = '';

    if (!this.descripcionNueva.trim()) {
      this.error = 'Escribe una descripcion o elige una categoria rapida.';
      return;
    }
    if (!this.montoNuevo || this.montoNuevo <= 0) {
      this.error = 'El monto debe ser mayor a 0.';
      return;
    }

    this.guardando = true;
    this.movimientoService.crear('ingresos', this.descripcionNueva.trim(), this.montoNuevo).subscribe({
      next: (res) => {
        this.guardando = false;
        this.ingresos = [res.movimiento, ...this.ingresos];
        this.descripcionNueva = '';
        this.montoNuevo = null;
        this.categoriaActiva = null;
        this.animarTotal();
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.message || 'No se pudo guardar el ingreso.';
      },
    });
  }

  eliminarIngreso(id: string): void {
    this.movimientoService.eliminar(id).subscribe({
      next: () => {
        this.ingresos = this.ingresos.filter((i) => i.id !== id);
        this.animarTotal();
      },
    });
  }
}
