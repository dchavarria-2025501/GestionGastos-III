import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  exito = '';
  cargando = false;

  // Controla si los campos de password se muestran en texto plano (ojito).
  mostrarPassword = false;
  mostrarConfirmPassword = false;

  // Mismo mecanismo que en el login: si assets/logo/logo.png todavia no
  // existe, se evita mostrar una imagen rota.
  logoCargado = false;

  googleDisponible = !!environment.googleClientId;

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
      text: 'signup_with',
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
        this.error = err?.error?.message || 'No se pudo continuar con Google.';
      },
    });
  }

  onSubmit(): void {
    this.error = '';
    this.exito = '';

    if (!this.nombre || !this.email || !this.password) {
      this.error = 'Todos los campos son obligatorios.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;
    this.auth.register(this.nombre, this.email, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = 'Cuenta creada. Redirigiendo al login...';
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.message || 'No se pudo completar el registro.';
      },
    });
  }
}
