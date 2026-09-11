import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { isEntraConfigured } from '../../core/auth/msal.config';

@Component({
  selector: 'app-inicio',
  template: `
    <section class="login">
      <div class="card login-card">
        <span class="login-mark" aria-hidden="true">H</span>
        <h1>Hotel Admin</h1>
        <p class="muted">
          Panel interno para administradores y empleados del hotel. Ingresa con tu cuenta de Microsoft Entra ID.
        </p>

        @if (!configured) {
          <p class="alert alert-warning">
            Falta configurar Entra ID: completa <code>src/environments/entra.config.ts</code> (ver README).
          </p>
        }
        @if (auth.error(); as error) {
          <p class="alert alert-error">{{ error }}</p>
        }

        <button type="button" class="btn" [disabled]="!configured" (click)="auth.login()">
          Iniciar sesión con Microsoft
        </button>
      </div>
    </section>
  `,
  styles: `
    .login {
      display: grid;
      place-items: center;
      min-height: 100vh;
      padding: 1rem;
      background: linear-gradient(160deg, var(--navy) 0%, var(--navy-soft) 55%, var(--bg) 55%);
    }
    .login-card {
      width: min(420px, 100%);
      padding: 2rem;
      text-align: center;
    }
    .login-card h1 {
      margin: 0.75rem 0 0.5rem;
    }
    .login-card .btn {
      width: 100%;
      margin-top: 0.5rem;
    }
    .login-mark {
      display: inline-grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: var(--brand);
      color: #fff;
      font-size: 1.4rem;
      font-weight: 700;
    }
  `,
})
export class Inicio {
  protected readonly auth = inject(AuthService);
  protected readonly configured = isEntraConfigured();
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) void this.router.navigate(['/dashboard']);
    });
  }
}
