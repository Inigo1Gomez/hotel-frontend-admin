import { catchError, filter, map, merge, Observable, of, startWith, switchMap, timer } from 'rxjs';
import { ApiErrorInfo, describeApiError } from '../api/api-error';

export type Respuesta<T> = { ok: true; valor: T } | { ok: false; error: ApiErrorInfo };

export interface OpcionesRefresco<T> {
  /** Cada cuánto se vuelve a consultar (environment.refrescoMs). */
  cadaMs: number;
  /** Si es false (casilla desmarcada o pestaña oculta) el timer no consulta. */
  activo: () => boolean;
  /** Consultas pedidas a mano: botón "Actualizar", cambio de filtros o de página. */
  manual$: Observable<unknown>;
  pedir: () => Observable<T>;
}

/**
 * Las pantallas de KPIs y auditoría se actualizan solas consultando cada pocos segundos (polling).
 * El API Gateway HTTP API no mantiene conexiones abiertas (SSE o WebSocket), así que el panel pregunta y
 * el backend responde con lo que los consumer groups de Kafka ya proyectaron.
 *
 * Consulta al iniciar, en cada pedido manual y en cada tick del timer mientras esté activo.
 * Si llega un pedido nuevo mientras otro está en curso, el anterior se cancela (switchMap).
 * Un error no corta el refresco: se emite como respuesta y el siguiente tick vuelve a intentar.
 */
export function refrescoPeriodico<T>(opciones: OpcionesRefresco<T>): Observable<Respuesta<T>> {
  const automatico$ = timer(opciones.cadaMs, opciones.cadaMs).pipe(filter(() => opciones.activo() && paginaVisible()));
  return merge(opciones.manual$.pipe(startWith(undefined)), automatico$).pipe(
    switchMap(() =>
      opciones.pedir().pipe(
        map((valor): Respuesta<T> => ({ ok: true, valor })),
        catchError((error: unknown) => of<Respuesta<T>>({ ok: false, error: describeApiError(error) })),
      ),
    ),
  );
}

function paginaVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}
