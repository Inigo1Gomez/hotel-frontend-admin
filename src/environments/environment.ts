import { entraConfig } from './entra.config';
import { AppEnvironment } from './environment.model';

// Producción (GitHub Pages / S3): el navegador llama directo al API Gateway de AWS.
export const environment: AppEnvironment = {
  production: true,
  auth: entraConfig,
  api: {
    usuarios: 'https://TU_API_ID.execute-api.us-east-1.amazonaws.com/usuarios',
    reservas: 'https://TU_API_ID.execute-api.us-east-1.amazonaws.com/reservas',
  },
};
