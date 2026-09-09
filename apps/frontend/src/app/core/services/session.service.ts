import { Injectable, signal } from '@angular/core';

// Tiempo de inactividad tras el cual se considera vencida la sesion.
const LIMITE_INACTIVIDAD_MS = 2 * 60 * 1000; // 2 minutos

const EVENTOS_ACTIVIDAD = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

@Injectable({ providedIn: 'root' })
export class SessionService {
  // true cuando la sesion vencio (por inactividad o porque el token JWT vencio)
  sessionExpired = signal(false);

  private temporizadorInactividad: ReturnType<typeof setTimeout> | null = null;
  private temporizadorToken: ReturnType<typeof setTimeout> | null = null;
  private vigilando = false;
  private readonly manejarActividad = () => this.reiniciarTemporizadorInactividad();

  iniciarVigilancia(): void {
    if (this.vigilando) {
      return;
    }
    this.vigilando = true;
    EVENTOS_ACTIVIDAD.forEach((evento) =>
      document.addEventListener(evento, this.manejarActividad)
    );
    this.reiniciarTemporizadorInactividad();
  }

  detenerVigilancia(): void {
    this.vigilando = false;
    EVENTOS_ACTIVIDAD.forEach((evento) =>
      document.removeEventListener(evento, this.manejarActividad)
    );
    this.limpiarTemporizadorInactividad();
    this.limpiarTemporizadorToken();
  }

  /**
   * Programa la expiracion automatica de la sesion en el momento exacto en que
   * vence el JWT (segun su "exp"), aunque el usuario no haga ninguna peticion
   * al backend mientras tanto. msRestantes es el tiempo en milisegundos que
   * falta para que el token expire.
   */
  programarExpiracionToken(msRestantes: number): void {
    this.limpiarTemporizadorToken();

    if (msRestantes <= 0) {
      this.expirarPorToken();
      return;
    }

    this.temporizadorToken = setTimeout(() => this.expirarPorToken(), msRestantes);
  }

  /** Llamado cuando vence el JWT (por temporizador propio o porque el backend lo rechazo). */
  expirarPorToken(): void {
    this.detenerVigilancia();
    this.sessionExpired.set(true);
  }

  /** Llamado cuando el usuario cierra sesion o confirma el aviso de expiracion. */
  reconocerExpiracion(): void {
    this.sessionExpired.set(false);
  }

  private reiniciarTemporizadorInactividad(): void {
    this.limpiarTemporizadorInactividad();
    this.temporizadorInactividad = setTimeout(
      () => this.expirarPorInactividad(),
      LIMITE_INACTIVIDAD_MS
    );
  }

  private limpiarTemporizadorInactividad(): void {
    if (this.temporizadorInactividad) {
      clearTimeout(this.temporizadorInactividad);
      this.temporizadorInactividad = null;
    }
  }

  private limpiarTemporizadorToken(): void {
    if (this.temporizadorToken) {
      clearTimeout(this.temporizadorToken);
      this.temporizadorToken = null;
    }
  }

  private expirarPorInactividad(): void {
    this.detenerVigilancia();
    this.sessionExpired.set(true);
  }
}
