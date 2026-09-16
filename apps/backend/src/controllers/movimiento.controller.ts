import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as movimientoRepo from '../repositories/movimiento.repository';
import { CategoriaMovimiento } from '../models/movimiento.model';

const CATEGORIAS_VALIDAS: CategoriaMovimiento[] = ['ingresos', 'gastos', 'impuestos', 'fondo_emergencia'];

export async function listMovimientos(req: AuthRequest, res: Response) {
  const movimientos = await movimientoRepo.listarPorUsuario(req.user!.userId);
  return res.json({ movimientos });
}

export async function createMovimiento(req: AuthRequest, res: Response) {
  const { categoria, descripcion, monto } = req.body;

  if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({
      message: `La categoria debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}`,
    });
  }

  if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
    return res.status(400).json({ message: 'La descripcion es obligatoria' });
  }

  const montoNumerico = Number(monto);
  if (!montoNumerico || Number.isNaN(montoNumerico) || montoNumerico <= 0) {
    return res.status(400).json({ message: 'El monto debe ser un numero mayor a 0' });
  }

  // Regla de negocio: no se puede registrar mas en gastos + impuestos +
  // fondo de emergencia (egresos) que lo que el usuario tiene registrado
  // en ingresos. Un usuario no puede "gastar" dinero que nunca ingreso.
  if (categoria !== 'ingresos') {
    const totales = await movimientoRepo.totalesPorUsuario(req.user!.userId);
    const egresosActuales = totales.gastos + totales.impuestos + totales.fondo_emergencia;
    const disponible = totales.ingresos - egresosActuales;

    if (montoNumerico > disponible) {
      return res.status(400).json({
        message:
          disponible > 0
            ? `No puedes registrar ese monto: solo tienes Q${disponible.toFixed(2)} disponibles de tus ingresos. Registra mas ingresos primero.`
            : 'No puedes registrar mas gastos que ingresos. Registra un ingreso primero.',
      });
    }
  }

  const movimiento = await movimientoRepo.crearMovimiento({
    usuarioId: req.user!.userId,
    categoria,
    descripcion: descripcion.trim(),
    monto: montoNumerico,
  });

  return res.status(201).json({ movimiento });
}

export async function deleteMovimiento(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const eliminado = await movimientoRepo.eliminarMovimiento(id, req.user!.userId);
  if (!eliminado) {
    return res.status(404).json({ message: 'Movimiento no encontrado' });
  }
  return res.status(204).send();
}
