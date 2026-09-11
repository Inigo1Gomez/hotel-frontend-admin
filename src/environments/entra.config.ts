import { AppEnvironment } from './environment.model';

/*
 * Valores del portal de Microsoft Entra ID (ver README, sección "Configurar Entra ID").
 * No son secretos: una SPA es un cliente público, así que pueden ir en el repositorio.
 * Los usan tanto el entorno local como el de producción.
 */
export const entraConfig: AppEnvironment['auth'] = {
  tenantId: '6fab43c1-0dda-4aaf-a237-a21fec7f41b6', // directorio "Hotel" (HotelOficial.onmicrosoft.com)
  clientId: 'b8db24fe-d8be-4c48-9e17-2f399686c2c1', // hotel-frontend-admin (SPA)
  apiScope: 'api://45f37289-341f-499a-b942-b769bbf68527/access_as_user', // hotel-bff-admin
  enforceRoles: false,
};
