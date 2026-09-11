import { AppEnvironment } from './environment.model';

/*
 * Valores del portal de Microsoft Entra ID (ver README, sección "Configurar Entra ID").
 * No son secretos: una SPA es un cliente público, así que pueden ir en el repositorio.
 * Los usan tanto el entorno local como el de producción.
 */
export const entraConfig: AppEnvironment['auth'] = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  clientId: '00000000-0000-0000-0000-000000000000',
  apiScope: 'api://00000000-0000-0000-0000-000000000000/access_as_user',
  enforceRoles: false,
};
