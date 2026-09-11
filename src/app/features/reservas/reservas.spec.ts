import { nochesEntre } from './reservas';

describe('nochesEntre', () => {
  it('cuenta las noches entre entrada y salida', () => {
    expect(nochesEntre('2026-10-01', '2026-10-04')).toBe(3);
  });

  it('devuelve 0 con fechas vacías o invertidas', () => {
    expect(nochesEntre('', '2026-10-04')).toBe(0);
    expect(nochesEntre('2026-10-04', '2026-10-01')).toBe(0);
  });
});
