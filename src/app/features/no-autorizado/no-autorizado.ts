import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-no-autorizado',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1>Sin permisos</h1>
        <p>Tu token no incluye el rol que exige esta sección.</p>
      </div>
    </header>

    <section class="card">
      <dl class="claims">
        <dt>requiere</dt>
        <dd>{{ requeridos.join(' o ') || '—' }}</dd>
        <dt>tus roles</dt>
        <dd>{{ auth.roles().join(', ') || 'ninguno' }}</dd>
      </dl>
      <p class="muted small">
        Un administrador del tenant debe asignarte el rol en Entra ID → Aplicaciones empresariales →
        hotel-bff-admin → Usuarios y grupos. Después cierra sesión y vuelve a entrar para recibir un token nuevo.
      </p>
      <a class="btn btn-ghost" routerLink="/dashboard">Volver al resumen</a>
    </section>
  `,
})
export class NoAutorizado {
  protected readonly auth = inject(AuthService);
  protected readonly requeridos = (inject(ActivatedRoute).snapshot.queryParamMap.get('requiere') ?? '')
    .split(',')
    .filter(Boolean);
}
