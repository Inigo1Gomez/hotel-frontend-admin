import { rangoPorDefecto } from './informes';

describe('rangoPorDefecto', () => {
  it('va del primer día del mes actual al último del subsiguiente', () => {
    expect(rangoPorDefecto(new Date(2026, 9, 19))).toEqual({ desde: '2026-10-01', hasta: '2026-12-31' });
  });

  it('cruza el año cuando hace falta', () => {
    expect(rangoPorDefecto(new Date(2026, 11, 5))).toEqual({ desde: '2026-12-01', hasta: '2027-02-28' });
  });
});
