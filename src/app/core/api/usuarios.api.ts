import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Admin, AdminInput } from '../models/admin';

interface ApiData<T> {
  data: T;
}

/** hotel-ms-usuarios: CRUD de administradores (rutas /api/v1/users/admin protegidas con Entra ID). */
@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.api.usuarios}/api/v1/users/admin`;

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.usuarios}/health`);
  }

  listar(): Observable<Admin[]> {
    return this.http.get<ApiData<Admin[]>>(this.adminUrl).pipe(map((response) => response.data));
  }

  crear(input: AdminInput): Observable<Admin> {
    return this.http.post<ApiData<Admin>>(this.adminUrl, input).pipe(map((response) => response.data));
  }

  actualizar(id: string, cambios: Partial<AdminInput>): Observable<Admin> {
    return this.http
      .patch<ApiData<Admin>>(`${this.adminUrl}/${encodeURIComponent(id)}`, cambios)
      .pipe(map((response) => response.data));
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${encodeURIComponent(id)}`);
  }
}
