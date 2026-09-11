export interface AppEnvironment {
  production: boolean;
  auth: {
    /** Directory (tenant) ID de Microsoft Entra ID. */
    tenantId: string;
    /** Application (client) ID del registro SPA "hotel-frontend-admin". */
    clientId: string;
    /** Scope expuesto por el registro de la API "hotel-bff-admin", p. ej. api://<id>/access_as_user. */
    apiScope: string;
    /** Si es true, las rutas exigen los app roles (ADMIN / EMPLOYEE) que vienen en el token. */
    enforceRoles: boolean;
  };
  api: {
    /** Base de hotel-ms-usuarios (sin barra final). */
    usuarios: string;
    /** Base de hotel-ms-reservas (sin barra final). */
    reservas: string;
  };
}
