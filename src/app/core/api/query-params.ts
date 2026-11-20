import { HttpParams } from '@angular/common/http';

/** Arma los query params omitiendo los filtros vacíos (el backend valida los que llegan). */
export function queryParams(filtros: object): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null) continue;
    const texto = String(valor).trim();
    if (texto) params = params.set(clave, texto);
  }
  return params;
}
