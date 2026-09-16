import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSidebarComponent } from '../../shared/dashboard-sidebar/dashboard-sidebar.component';

const LLAVE_CONGELADA = 'gg_tarjeta_congelada';

@Component({
  selector: 'app-mi-tarjeta',
  standalone: true,
  imports: [CommonModule, DashboardSidebarComponent],
  templateUrl: './mi-tarjeta.component.html',
})
export class MiTarjetaComponent implements OnInit {
  volteada = false;
  numeroVisible = false;
  congelada = false;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.congelada = localStorage.getItem(LLAVE_CONGELADA) === '1';
  }

  /**
   * El numero, la fecha de vencimiento y el CVV no vienen de ningun banco
   * real: se generan de forma deterministica a partir del id del usuario,
   * para que la tarjeta se vea consistente cada vez que este entra, sin
   * necesitar guardar nada nuevo en la base de datos.
   */
  private semillaNumerica(): number {
    const id = this.auth.currentUser()?.id || 'controla';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  get numeroCompleto(): string {
    const semilla = this.semillaNumerica();
    const catorce = String(semilla % 100_000_000_000_000).padStart(14, '0');
    // Prefijo ficticio "40" solo para que se vea como una tarjeta real;
    // no corresponde a ninguna red de pago existente.
    const numero = '40' + catorce;
    return numero.match(/.{1,4}/g)!.join(' ');
  }

  get ultimosCuatro(): string {
    return this.numeroCompleto.slice(-4);
  }

  get numeroMostrado(): string {
    return this.numeroVisible ? this.numeroCompleto : `•••• •••• •••• ${this.ultimosCuatro}`;
  }

  get cvv(): string {
    const semilla = this.semillaNumerica();
    return String(100 + (semilla % 900));
  }

  get vencimiento(): string {
    const creado = this.auth.currentUser()?.createdAt;
    const base = creado ? new Date(creado) : new Date();
    base.setFullYear(base.getFullYear() + 4);
    const mes = String(base.getMonth() + 1).padStart(2, '0');
    const anio = String(base.getFullYear()).slice(-2);
    return `${mes}/${anio}`;
  }

  get nombreTitular(): string {
    return (this.auth.currentUser()?.nombre || '').toUpperCase();
  }

  voltear(): void {
    this.volteada = !this.volteada;
  }

  alternarNumeroVisible(): void {
    if (this.congelada) {
      return;
    }
    this.numeroVisible = !this.numeroVisible;
  }

  alternarCongelada(): void {
    this.congelada = !this.congelada;
    if (this.congelada) {
      this.numeroVisible = false;
    }
    localStorage.setItem(LLAVE_CONGELADA, this.congelada ? '1' : '0');
  }
}
