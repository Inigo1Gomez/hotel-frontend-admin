import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CambiosHabitacion, Disponibilidad, Habitacion, HabitacionNueva, Hotel } from '../models/catalogo';

/**
 * hotel-ms-catalogo: la lectura es pública y crear o editar habitaciones exige el rol ADMIN.
 * Cada cambio publica el estado completo de la habitación en el tópico compactado "catalogo".
 */
@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.api.catalogo}/api/v1/catalogo`;

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.catalogo}/health`);
  }

  hoteles(): Observable<Hotel[]> {
    return this.http.get<{ data: Hotel[] }>(`${this.baseUrl}/hoteles`).pipe(map((response) => response.data));
  }

  disponibilidad(idHabitacion: string, desde: string, hasta: string): Observable<Disponibilidad> {
    return this.http
      .get<{ data: Disponibilidad }>(`${this.baseUrl}/habitaciones/${encodeURIComponent(idHabitacion)}/disponibilidad`, {
        params: { desde, hasta },
      })
      .pipe(map((response) => response.data));
  }

  crearHabitacion(habitacion: HabitacionNueva): Observable<Habitacion> {
    return this.http
      .post<{ data: Habitacion }>(`${this.baseUrl}/habitaciones`, habitacion)
      .pipe(map((response) => response.data));
  }

  actualizarHabitacion(id: string, cambios: CambiosHabitacion): Observable<Habitacion> {
    return this.http
      .patch<{ data: Habitacion }>(`${this.baseUrl}/habitaciones/${encodeURIComponent(id)}`, cambios)
      .pipe(map((response) => response.data));
  }
}
