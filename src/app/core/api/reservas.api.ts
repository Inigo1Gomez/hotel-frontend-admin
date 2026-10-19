import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenClaims } from '../auth/jwt';
import { ReporteEnCola, SolicitudReporte } from '../models/reporte';
import { Reserva } from '../models/reserva';

/**
 * hotel-ms-reservas: valida reservas y solicitudes de informe y las publica en RabbitMQ
 * (hotel-ms-notificaciones genera los PDF y envía los correos). Expone /me para probar el token.
 */
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

  /** Publica reporte.solicitado (fanout): responde 202 apenas queda en cola, el PDF llega después por correo. */
  solicitarReporte(solicitud: SolicitudReporte): Observable<ReporteEnCola> {
    return this.http
      .post<{ data: ReporteEnCola }>(`${this.baseUrl}/admin/reportes`, solicitud)
      .pipe(map((response) => response.data));
  }

  /** Devuelve los claims que el microservicio obtuvo al validar el token (passport-azure-ad). */
  me(): Observable<TokenClaims> {
    return this.http.get<{ claims: TokenClaims }>(`${this.baseUrl}/me`).pipe(map((response) => response.claims));
  }
}
