// Espejo de IReserva en hotel-ms-reservas (src/config/models/IReserva.ts); las fechas viajan como texto ISO.
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA';

export const ESTADOS_RESERVA: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'];

/** Desde el panel una reserva puede partir pendiente o ya confirmada (el invitado siempre parte en PENDIENTE). */
export const ESTADOS_INICIALES: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA'];

/** Igual que estadosReserva.ts en hotel-ms-reservas: el backend rechaza cualquier otro cambio con 409. */
export const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['COMPLETADA', 'CANCELADA'],
  CANCELADA: [],
  COMPLETADA: [],
};

/** Clase del badge de cada estado (verde, rojo o gris). */
export function claseEstado(estado: string | undefined): string {
  switch (estado) {
    case 'CONFIRMADA':
    case 'COMPLETADA':
      return 'badge-ok';
    case 'CANCELADA':
      return 'badge-off';
    default:
      return 'badge-wait';
  }
}

export type CanalReserva = 'WEB_HUESPEDES' | 'PANEL_ADMIN';

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
  /** Quién la creó: oid de Entra ID o "invitado". Lo pone el backend. */
  creadaPor?: string;
  canal?: CanalReserva;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiltrosReserva {
  estado?: EstadoReserva | '';
  idHabitacion?: string;
  email?: string;
  desde?: string;
  hasta?: string;
  pagina: number;
  tamano: number;
}
