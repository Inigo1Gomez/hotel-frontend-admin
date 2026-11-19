import { entraConfig } from './entra.config';
import { AppEnvironment } from './environment.model';

// Producción (GitHub Pages / S3): el navegador llama directo al API Gateway de AWS.
export const environment: AppEnvironment = {
  production: true,
  auth: entraConfig,
  api: {
    usuarios: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/usuarios',
    reservas: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/reservas',
    // Rutas nuevas del API Gateway (se crean en la fase 11, igual que /usuarios y /reservas).
    catalogo: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/catalogo',
    reportes: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/reportes',
    auditoria: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/auditoria',
  },
  // API Gateway HTTP API no permite mantener una conexión abierta (SSE/WebSocket), así que se consulta cada pocos segundos.
  refrescoMs: { kpis: 5000, auditoria: 5000, reservas: 15000 },
};
