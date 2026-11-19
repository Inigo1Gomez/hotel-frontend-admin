import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltrosAuditoria, RegistroAuditoria } from '../models/auditoria';
import { Pagina } from '../models/pagina';
import { queryParams } from './query-params';

/** hotel-ms-auditoria: quién, qué, cuándo y desde dónde, leído de los tópicos "reservas" y "catalogo". */
@Injectable({ providedIn: 'root' })
export class AuditoriaApi {
  private readonly http = inject(HttpClient);

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.auditoria}/health`);
  }

  buscar(filtros: FiltrosAuditoria): Observable<Pagina<RegistroAuditoria>> {
    return this.http.get<Pagina<RegistroAuditoria>>(`${environment.api.auditoria}/api/v1/auditoria`, {
      params: queryParams(filtros),
    });
  }
}
