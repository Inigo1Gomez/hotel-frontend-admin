import { HttpErrorResponse } from '@angular/common/http';
import { describeApiError } from './api-error';

describe('describeApiError', () => {
  it('traduce los códigos de error de los microservicios', () => {
    const info = describeApiError(new HttpErrorResponse({ status: 401, error: { error: 'TOKEN_INVALIDO' } }));
    expect(info.codigo).toBe('TOKEN_INVALIDO');
    expect(info.mensaje).toContain('rechazó el token');
  });

  it('conserva los detalles de validación de hotel-ms-reservas', () => {
    const detalles = [{ campo: 'fechaSalida', mensaje: 'Debe ser posterior a la fecha de entrada' }];
    const info = describeApiError(
      new HttpErrorResponse({ status: 400, error: { error: 'VALIDACION_RESERVA', detalles } }),
    );
    expect(info.detalles).toEqual(detalles);
  });

  it('reconoce las respuestas propias del API Gateway', () => {
    const info = describeApiError(new HttpErrorResponse({ status: 503, error: { message: 'Service Unavailable' } }));
    expect(info.mensaje).toContain('EC2');
  });

  it('explica cuando no hubo respuesta (backend caído o CORS)', () => {
    const info = describeApiError(new HttpErrorResponse({ status: 0 }));
    expect(info.mensaje).toContain('CORS');
  });
});
