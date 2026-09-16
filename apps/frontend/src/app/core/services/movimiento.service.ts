import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CategoriaMovimiento = 'ingresos' | 'gastos' | 'impuestos' | 'fondo_emergencia';

export interface Movimiento {
  id: string;
  usuarioId: string;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
  fecha: string;
}

const API_URL = `${environment.apiUrl}/movimientos`;

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<{ movimientos: Movimiento[] }> {
    return this.http.get<{ movimientos: Movimiento[] }>(API_URL);
  }

  crear(categoria: CategoriaMovimiento, descripcion: string, monto: number): Observable<{ movimiento: Movimiento }> {
    return this.http.post<{ movimiento: Movimiento }>(API_URL, { categoria, descripcion, monto });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  /**
   * Calcula cuanto le queda disponible al usuario para registrar en
   * gastos, impuestos o fondo de emergencia: sus ingresos totales menos
   * lo que ya tiene registrado en esas tres categorias. La misma regla
   * que aplica el backend al crear un movimiento (nunca se puede "gastar"
   * mas de lo que se ha ingresado).
   */
  calcularDisponible(movimientos: Movimiento[]): number {
    let ingresos = 0;
    let egresos = 0;
    for (const m of movimientos) {
      if (m.categoria === 'ingresos') {
        ingresos += m.monto;
      } else {
        egresos += m.monto;
      }
    }
    return ingresos - egresos;
  }
}
