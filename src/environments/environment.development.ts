import { entraConfig } from './entra.config';
import { AppEnvironment } from './environment.model';

// Local (ng serve): proxy.conf.json reenvía /api/usuarios -> :8082 y /api/reservas -> :8081, así no hace falta CORS.
// El prefijo /api evita chocar con las rutas de página /usuarios y /reservas.
export const environment: AppEnvironment = {
  production: false,
  auth: entraConfig,
  api: {
    usuarios: '/api/usuarios',
    reservas: '/api/reservas',
  },
};
