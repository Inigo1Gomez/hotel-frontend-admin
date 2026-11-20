// Espejo de hotel-ms-catalogo (repositories/catalogoRepository.ts y services/catalogoService.ts).
export interface Habitacion {
  id: string;
  idHotel: string;
  nombre: string;
  descripcion: string;
  capacidad: number;
  camas: string;
  metrosCuadrados: number;
  precioPorNoche: number;
  /** Cuántas habitaciones de este tipo tiene el hotel. */
  unidades: number;
  activa: boolean;
  actualizadaEn: string;
}

export interface Hotel {
  id: string;
  slug: string;
  nombre: string;
  tipo: string;
  estrellas: number;
  barrio: string;
  direccion: string;
  precioDesde: number | null;
  habitaciones: Habitacion[];
}

export type HabitacionNueva = Omit<Habitacion, 'activa' | 'actualizadaEn'>;

export type CambiosHabitacion = Partial<
  Pick<Habitacion, 'nombre' | 'descripcion' | 'capacidad' | 'camas' | 'metrosCuadrados' | 'precioPorNoche' | 'unidades' | 'activa'>
>;

export interface Disponibilidad {
  idHabitacion: string;
  desde: string;
  hasta: string;
  unidades: number;
  ocupadas: number;
  disponibles: number;
  disponible: boolean;
}
