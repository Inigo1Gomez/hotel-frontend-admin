// Espejo de ISolicitudReporte en hotel-ms-reservas: fechas YYYY-MM-DD, filtradas por fecha de entrada.
export interface SolicitudReporte {
  desde: string;
  hasta: string;
  /** Si no se envía, hotel-ms-reservas usa el email del token. */
  email?: string;
}

/** Respuesta 202 de POST /api/v1/admin/reportes: el informe quedó en cola, todavía no existe. */
export interface ReporteEnCola {
  id: string;
  estado: 'EN_COLA';
  desde: string;
  hasta: string;
  solicitadoPor: { nombre?: string; email: string };
}
