import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Kpis } from '../models/kpis';
import { queryParams } from './query-params';

/** hotel-ms-reportes: KPIs calculados por el consumer group "reportes" a partir del tópico "reservas". */
@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${environment.api.reportes}/health`);
  }

  kpis(filtro: { desde?: string; hasta?: string }): Observable<Kpis> {
    return this.http
      .get<{ data: Kpis }>(`${environment.api.reportes}/api/v1/reportes/kpis`, { params: queryParams(filtro) })
      .pipe(map((response) => response.data));
  }
}
