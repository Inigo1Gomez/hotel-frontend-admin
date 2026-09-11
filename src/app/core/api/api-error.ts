import { HttpErrorResponse } from '@angular/common/http';

export interface DetalleValidacion {
  campo: string;
  mensaje: string;
}

export interface ApiErrorInfo {
  status: number;
  codigo?: string;
  mensaje: string;
  detalles: DetalleValidacion[];
}

// Códigos que devuelven hotel-ms-usuarios y hotel-ms-reservas en { "error": "..." }.
const MENSAJES: Record<string, string> = {
  TOKEN_REQUERIDO: 'El microservicio no recibió el token (revisa el protectedResourceMap del MsalInterceptor).',
  TOKEN_INVALIDO: 'El microservicio rechazó el token: firma, issuer o audience no coinciden con su configuración.',
  AUTENTICACION_ENTRA_NO_CONFIGURADA: 'hotel-ms-usuarios no tiene ENTRA_TENANT_ID / ENTRA_AUDIENCE configurados.',
  AUTENTICACION_NO_CONFIGURADA: 'hotel-ms-reservas no tiene AZURE_TENANT_ID / AZURE_CLIENT_ID configurados.',
  USUARIO_NO_ENCONTRADO: 'El usuario ya no existe.',
  USUARIO_DUPLICADO: 'Ya existe un administrador con ese Entra ID.',
  DATOS_ADMIN_INVALIDOS: 'Faltan datos obligatorios: Entra ID, nombre y email.',
  VALIDACION_RESERVA: 'hotel-ms-reservas rechazó la reserva por errores de validación.',
  JSON_INVALIDO: 'El cuerpo enviado no es JSON válido.',
  RUTA_NO_ENCONTRADA: 'La ruta no existe en el microservicio (revisa la URL del API Gateway o del proxy).',
  ERROR_INTERNO: 'Error interno del microservicio (¿la base de datos está disponible?).',
};

// Respuestas propias del API Gateway de AWS, que vienen como { "message": "..." }.
const MENSAJES_GATEWAY: Record<number, string> = {
  401: 'El API Gateway rechazó el token (revisa issuer y audience del JWT authorizer).',
  403: 'El API Gateway denegó la petición.',
  404: 'El API Gateway no tiene una ruta para esa URL.',
  500: 'El API Gateway falló al contactar al microservicio.',
  503: 'El API Gateway no llega a la EC2: ¿instancia apagada, IP cambiada o puerto cerrado?',
  504: 'El microservicio tardó demasiado en responder.',
};

export function describeApiError(error: unknown): ApiErrorInfo {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, mensaje: 'Error inesperado en la aplicación.', detalles: [] };
  }
  if (error.status === 0) {
    return {
      status: 0,
      mensaje: 'Sin respuesta del backend: revisa que esté levantado, la URL configurada y CORS en el API Gateway.',
      detalles: [],
    };
  }

  const body = (typeof error.error === 'object' && error.error !== null ? error.error : {}) as {
    error?: unknown;
    message?: unknown;
    detalles?: unknown;
  };
  const codigo = typeof body.error === 'string' ? body.error : undefined;
  const detalles = Array.isArray(body.detalles) ? (body.detalles as DetalleValidacion[]) : [];

  const mensaje =
    (codigo && MENSAJES[codigo]) ||
    (typeof body.message === 'string' && MENSAJES_GATEWAY[error.status]) ||
    codigo ||
    `Error HTTP ${error.status}.`;

  return { status: error.status, codigo, mensaje, detalles };
}
