import { entraConfig } from './entra.config';
import { AppEnvironment } from './environment.model';

// Local (ng serve): proxy.conf.json reenvía cada /api/<servicio> a su puerto (usuarios :8082, reservas :8081,
// reportes :8086, auditoria :8087, catalogo :8088), así no hace falta CORS.
// El prefijo /api evita chocar con las rutas de página /usuarios y /reservas.
export const environment: AppEnvironment = {
  production: false,
  auth: entraConfig,
  api: {
    usuarios: '/api/usuarios',
    reservas: '/api/reservas',
    catalogo: '/api/catalogo',
    reportes: '/api/reportes',
    auditoria: '/api/auditoria',
  },
  refrescoMs: { kpis: 5000, auditoria: 5000, reservas: 15000 },
};
