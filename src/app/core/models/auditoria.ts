// Espejo de RegistroAuditoria en hotel-ms-auditoria (repositories/auditoriaRepository.ts).
export type Entidad = 'RESERVA' | 'HABITACION';

export const TIPOS_EVENTO = [
  'RESERVA_CREADA',
  'RESERVA_CONFIRMADA',
  'RESERVA_CANCELADA',
  'RESERVA_COMPLETADA',
  'HABITACION_CREADA',
  'HABITACION_ACTUALIZADA',
  'DISPONIBILIDAD_CAMBIADA',
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface RegistroAuditoria {
  eventoId: string;
  tipo: TipoEvento;
  entidad: Entidad;
  ocurridoEn: string;
  actor: { tipo: 'INVITADO' | 'CLIENTE' | 'INTERNO' | 'SISTEMA'; id: string; nombre?: string; roles: string[] };
  origen: { canal: string; ip?: string };
  objetivo: { id: string; referencia: string; idHabitacion: string; estado?: string; estadoAnterior?: string };
  /** Qué cambió, en texto (por ejemplo "precioPorNoche: 248000 → 260000"). */
  detalle?: string;
  kafka: { topico: string; particion: number; offset: string };
  registradoEn: string;
}

export interface FiltrosAuditoria {
  usuario?: string;
  tipo?: TipoEvento | '';
  entidad?: Entidad | '';
  codigo?: string;
  desde?: string;
  hasta?: string;
  pagina: number;
  tamano: number;
}
