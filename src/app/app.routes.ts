import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Hotel Admin',
    loadComponent: () => import('./features/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'dashboard',
    title: 'Resumen · Hotel Admin',
    canActivate: [MsalGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'usuarios',
    title: 'Usuarios · Hotel Admin',
    canActivate: [MsalGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
  },
  {
    path: 'reservas',
    title: 'Reservas · Hotel Admin',
    canActivate: [MsalGuard, roleGuard],
    data: { roles: ['ADMIN', 'EMPLOYEE'] },
    loadComponent: () => import('./features/reservas/reservas').then((m) => m.Reservas),
  },
  {
    path: 'no-autorizado',
    title: 'Sin permisos · Hotel Admin',
    canActivate: [MsalGuard],
    loadComponent: () => import('./features/no-autorizado/no-autorizado').then((m) => m.NoAutorizado),
  },
  { path: '**', redirectTo: '' },
];
