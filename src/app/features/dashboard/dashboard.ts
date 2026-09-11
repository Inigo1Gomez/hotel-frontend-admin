import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { describeApiError } from '../../core/api/api-error';
import { ReservasApi } from '../../core/api/reservas.api';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { AuthService } from '../../core/auth/auth.service';
import { rolesFrom, scopesFrom, TokenClaims } from '../../core/auth/jwt';

interface EstadoServicio {
  nombre: string;
  url: string;
  estado: WritableSignal<'cargando' | 'ok' | 'error'>;
  detalle: WritableSignal<string>;
  health: () => Observable<{ status: string }>;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly usuariosApi = inject(UsuariosApi);
  private readonly reservasApi = inject(ReservasApi);

  protected readonly servicios: EstadoServicio[] = [
    this.servicio('hotel-ms-usuarios', environment.api.usuarios, () => this.usuariosApi.health()),
    this.servicio('hotel-ms-reservas', environment.api.reservas, () => this.reservasApi.health()),
  ];

  protected readonly expira = computed(() => {
    const exp = this.auth.apiClaims()?.exp;
    return exp ? new Date(exp * 1000) : null;
  });

  /** Claims tal como los ve hotel-ms-reservas después de validar el token (GET /api/v1/me). */
  protected readonly claimsBackend = signal<TokenClaims | null>(null);
  protected readonly errorBackend = signal<string | null>(null);
  protected readonly probando = signal(false);
  protected readonly rolesBackend = computed(() => rolesFrom(this.claimsBackend()));
  protected readonly scopesBackend = computed(() => scopesFrom(this.claimsBackend()));

  ngOnInit(): void {
    this.auth.ensureApiClaims().subscribe();
    this.revisarServicios();
    this.probarToken();
  }

  revisarServicios(): void {
    for (const servicio of this.servicios) {
      servicio.estado.set('cargando');
      servicio.health().subscribe({
        next: () => {
          servicio.estado.set('ok');
          servicio.detalle.set('');
        },
        error: (error: unknown) => {
          servicio.estado.set('error');
          servicio.detalle.set(describeApiError(error).mensaje);
        },
      });
    }
  }

  probarToken(): void {
    this.probando.set(true);
    this.errorBackend.set(null);
    this.reservasApi.me().subscribe({
      next: (claims) => {
        this.claimsBackend.set(claims);
        this.probando.set(false);
      },
      error: (error: unknown) => {
        this.claimsBackend.set(null);
        this.errorBackend.set(describeApiError(error).mensaje);
        this.probando.set(false);
      },
    });
  }

  private servicio(nombre: string, url: string, health: EstadoServicio['health']): EstadoServicio {
    return { nombre, url, health, estado: signal('cargando'), detalle: signal('') };
  }
}
