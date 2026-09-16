import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, Usuario } from '../models/user.model';
import { SessionService } from './session.service';

const API_URL = `${environment.apiUrl}/auth`;
const TOKEN_KEY = 'gg_token';
const USER_KEY = 'gg_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal reactiva con el usuario actual (o null si no hay sesion)
  currentUser = signal<Usuario | null>(this.readUserFromStorage());

  constructor(private http: HttpClient, private router: Router, private session: SessionService) {
    const token = this.getToken();
    if (token) {
      this.session.iniciarVigilancia();
      this.programarVencimientoToken(token);
    }
  }

  private readUserFromStorage(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }

  register(nombre: string, email: string, password: string): Observable<{ user: Usuario }> {
    return this.http.post<{ user: Usuario }>(`${API_URL}/register`, { nombre, email, password });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.session.iniciarVigilancia();
        this.programarVencimientoToken(res.token);
      })
    );
  }

  /** Inicia sesion (o crea la cuenta si es la primera vez) con el token de Google. */
  loginConGoogle(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/google`, { credential }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.session.iniciarVigilancia();
        this.programarVencimientoToken(res.token);
      })
    );
  }

  logout(): void {
    this.limpiarSesionLocal();
    this.session.detenerVigilancia();
    this.router.navigate(['/login']);
  }

  /** Sube/actualiza la foto de perfil (como data URL base64) del usuario actual. */
  updateAvatar(avatarData: string): Observable<{ user: Usuario }> {
    return this.http.put<{ user: Usuario }>(`${API_URL}/avatar`, { avatarData }).pipe(
      tap((res) => {
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  /** Usado por el interceptor cuando el backend indica que el token vencio o es invalido. */
  limpiarPorExpiracion(): void {
    this.limpiarSesionLocal();
  }

  private limpiarSesionLocal(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Lee el "exp" (fecha de vencimiento) del JWT y le avisa al SessionService
   * el tiempo exacto que falta para que venza, para que la alerta de sesion
   * vencida aparezca automaticamente aunque el usuario no haga ninguna
   * peticion al backend mientras tanto.
   */
  private programarVencimientoToken(token: string): void {
    const exp = this.obtenerExpiracionToken(token);
    if (exp === null) {
      return;
    }
    const msRestantes = exp * 1000 - Date.now();
    this.session.programarExpiracionToken(msRestantes);
  }

  private obtenerExpiracionToken(token: string): number | null {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }
}
