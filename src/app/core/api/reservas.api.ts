import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenClaims } from '../auth/jwt';
import { Pagina } from '../models/pagina';
import { ReporteEnCola, SolicitudReporte } from '../models/reporte';
import { EstadoReserva, FiltrosReserva, Reserva } from '../models/reserva';
import { queryParams } from './query-params';

/**
 * hotel-ms-reservas, rutas internas (/api/v1/reservas) protegidas con Entra ID para Admin y Operador.
 * Cada creación o cambio de estado publica un evento en el tópico "reservas" de Kafka.
 * Las solicitudes de informe se publican en RabbitMQ (hotel-ms-notificaciones genera el PDF).
 */
@Injectable({ providedIn: 'root' })
export class ReservasApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.reservas}/api/v1`;

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.reservas}/health`);
  }

  listar(filtros: FiltrosReserva): Observable<Pagina<Reserva>> {
    return this.http.get<Pagina<Reserva>>(`${this.baseUrl}/reservas`, { params: queryParams(filtros) });
  }

  crear(reserva: Reserva): Observable<Reserva> {
    return this.http
      .post<{ data: Reserva }>(`${this.baseUrl}/reservas`, reserva)
      .pipe(map((response) => response.data));
  }

  cambiarEstado(id: string, estado: EstadoReserva): Observable<Reserva> {
    return this.http
      .patch<{ data: Reserva }>(`${this.baseUrl}/reservas/${encodeURIComponent(id)}/estado`, { estado })
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
