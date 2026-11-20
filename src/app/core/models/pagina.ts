/** Respuesta paginada de los microservicios: { data, total, pagina, tamano }. */
export interface Pagina<T> {
  data: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export function totalPaginas(pagina: Pick<Pagina<unknown>, 'total' | 'tamano'>): number {
  return Math.max(1, Math.ceil(pagina.total / pagina.tamano));
}
