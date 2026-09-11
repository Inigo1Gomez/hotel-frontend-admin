import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenClaims } from '../auth/jwt';
import { Reserva } from '../models/reserva';

/** hotel-ms-reservas: por ahora valida reservas (sin persistirlas) y expone /me para probar el token. */
@Injectable({ providedIn: 'root' })
export class ReservasApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.reservas}/api/v1`;

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.reservas}/health`);
  }

  crear(reserva: Reserva): Observable<Reserva> {
    return this.http
      .post<{ data: Reserva }>(`${this.baseUrl}/user/reservas`, reserva)
      .pipe(map((response) => response.data));
  }

  /** Devuelve los claims que el microservicio obtuvo al validar el token (passport-azure-ad). */
  me(): Observable<TokenClaims> {
    return this.http.get<{ claims: TokenClaims }>(`${this.baseUrl}/me`).pipe(map((response) => response.claims));
  }
}
