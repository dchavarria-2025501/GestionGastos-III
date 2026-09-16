import { pool } from '../config/db';
import { Movimiento, CategoriaMovimiento } from '../models/movimiento.model';

interface MovimientoRow {
  id: string;
  usuario_id: string;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: string; // numeric llega como string desde pg
  fecha: string;
}

function mapRowToMovimiento(row: MovimientoRow): Movimiento {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    categoria: row.categoria,
    descripcion: row.descripcion,
    monto: Number(row.monto),
    fecha: row.fecha,
  };
}

export async function listarPorUsuario(usuarioId: string): Promise<Movimiento[]> {
  const { rows } = await pool.query<MovimientoRow>(
    `SELECT id, usuario_id, categoria, descripcion, monto, fecha
     FROM movimientos
     WHERE usuario_id = $1
     ORDER BY fecha DESC`,
    [usuarioId]
  );
  return rows.map(mapRowToMovimiento);
}

interface CrearMovimientoInput {
  usuarioId: string;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
}

export async function crearMovimiento(datos: CrearMovimientoInput): Promise<Movimiento> {
  const { rows } = await pool.query<MovimientoRow>(
    `INSERT INTO movimientos (usuario_id, categoria, descripcion, monto)
     VALUES ($1, $2, $3, $4)
     RETURNING id, usuario_id, categoria, descripcion, monto, fecha`,
    [datos.usuarioId, datos.categoria, datos.descripcion, datos.monto]
  );
  return mapRowToMovimiento(rows[0]);
}

export async function eliminarMovimiento(id: string, usuarioId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM movimientos WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return (rowCount ?? 0) > 0;
}

export interface TotalesPorCategoria {
  ingresos: number;
  gastos: number;
  impuestos: number;
  fondo_emergencia: number;
}

/**
 * Suma, en una sola consulta, cuanto lleva registrado el usuario en cada
 * categoria. Se usa para validar que no se registren mas egresos (gastos,
 * impuestos, fondo de emergencia) que ingresos disponibles.
 */
export async function totalesPorUsuario(usuarioId: string): Promise<TotalesPorCategoria> {
  const { rows } = await pool.query<{ categoria: CategoriaMovimiento; total: string }>(
    `SELECT categoria, COALESCE(SUM(monto), 0) AS total
     FROM movimientos
     WHERE usuario_id = $1
     GROUP BY categoria`,
    [usuarioId]
  );

  const totales: TotalesPorCategoria = { ingresos: 0, gastos: 0, impuestos: 0, fondo_emergencia: 0 };
  for (const row of rows) {
    totales[row.categoria] = Number(row.total);
  }
  return totales;
}
