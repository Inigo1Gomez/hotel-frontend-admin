import { EstadoReserva } from './reserva';

// Espejo de Kpis en hotel-ms-reportes (repositories/reporteRepository.ts).
export interface Kpis {
  totalReservas: number;
  porEstado: { estado: EstadoReserva; cantidad: number }[];
  /** Reservas confirmadas o completadas. */
  ingresos: number;
  nochesVendidas: number;
  huespedes: number;
  /** Porcentaje de reservas canceladas (0–100). */
  tasaCancelacion: number;
  /** Minutos promedio entre que se crea una reserva y se confirma. */
  minutosPromedioConfirmacion: number | null;
  porCanal: { canal: string; cantidad: number }[];
  topHabitaciones: { idHabitacion: string; reservas: number; ingresos: number }[];
  /** Cuándo llegó el último evento de Kafka a la proyección. */
  ultimaActualizacion: string | null;
}
