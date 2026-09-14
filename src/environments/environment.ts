import { entraConfig } from './entra.config';
import { AppEnvironment } from './environment.model';

// Producción (GitHub Pages / S3): el navegador llama directo al API Gateway de AWS.
export const environment: AppEnvironment = {
  production: true,
  auth: entraConfig,
  api: {
    usuarios: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/usuarios',
    reservas: 'https://v5bzsbqtk7.execute-api.us-east-1.amazonaws.com/reservas',
  },
};
