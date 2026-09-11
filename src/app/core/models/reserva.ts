// Espejo de IReserva en hotel-ms-reservas (src/config/models/IReserva.ts); las fechas viajan como texto ISO.
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA';

export const ESTADOS_RESERVA: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'];

export interface Huesped {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
}

export interface Reserva {
  id?: string;
  codigo: string;
  idHabitacion: string;
  huesped: Huesped;
  fechaEntrada: string;
  fechaSalida: string;
  cantidadHuespedes: number;
  estado: EstadoReserva;
  precioPorNoche: number;
  precioTotal: number;
  observaciones?: string;
}
