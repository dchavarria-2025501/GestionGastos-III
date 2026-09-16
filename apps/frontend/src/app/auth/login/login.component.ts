import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  error = '';
  cargando = false;

  // Si no se configuro GOOGLE_CLIENT_ID en environment.ts, el boton de
  // Google simplemente no se muestra (en vez de fallar en silencio).
  googleDisponible = !!environment.googleClientId;

  // Controla si la imagen del logo (assets/logo/logo.png) cargo correctamente.
  // Mientras no se coloque el archivo, se muestra un espacio reservado.
  logoCargado = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogoLoad(): void {
    this.logoCargado = true;
  }

  onLogoError(): void {
    this.logoCargado = false;
  }

  ngAfterViewInit(): void {
    if (!this.googleDisponible || !this.googleBtn) {
      return;
    }

    // El script de Google (cargado en index.html) puede tardar un
    // instante en quedar listo; se reintenta unas cuantas veces en vez
    // de asumir que ya existe apenas carga el componente.
    this.esperarGoogleListo(0);
  }

  private esperarGoogleListo(intento: number): void {
    if (window.google?.accounts?.id) {
      this.inicializarBotonGoogle();
      return;
    }
    if (intento > 20) {
      return;
    }
    setTimeout(() => this.esperarGoogleListo(intento + 1), 150);
  }

  private inicializarBotonGoogle(): void {
    window.google!.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (respuesta) => this.onCredencialGoogle(respuesta.credential),
    });

    window.google!.accounts.id.renderButton(this.googleBtn!.nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 320,
    });
  }

  private onCredencialGoogle(credential: string): void {
    this.error = '';
    this.cargando = true;

    this.auth.loginConGoogle(credential).subscribe({
      next: (res) => {
        this.cargando = false;
        const destino = res.user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
        this.router.navigate([destino]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.message || 'No se pudo iniciar sesion con Google.';
      },
    });
  }

  onSubmit(): void {
    this.error = '';

    if (!this.email || !this.password) {
      this.error = 'Completa email y password.';
      return;
    }

    this.cargando = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.cargando = false;
        const destino = res.user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
        this.router.navigate([destino]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.message || 'No se pudo iniciar sesion.';
      },
    });
  }
}
