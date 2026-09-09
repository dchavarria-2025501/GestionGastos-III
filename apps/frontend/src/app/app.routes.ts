import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./user/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('./user/gastos/gastos.component').then((m) => m.GastosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ingresos',
    loadComponent: () => import('./user/ingresos/ingresos.component').then((m) => m.IngresosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'fondo-emergencia',
    loadComponent: () =>
      import('./user/fondo-emergencia/fondo-emergencia.component').then((m) => m.FondoEmergenciaComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./user/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./admin/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard('admin')],
  },
  { path: '**', redirectTo: 'login' },
];
