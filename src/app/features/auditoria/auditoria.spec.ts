import { RegistroAuditoria } from '../../core/models/auditoria';
import { filasNuevas } from './auditoria';

const registro = (eventoId: string) => ({ eventoId }) as RegistroAuditoria;

describe('filasNuevas', () => {
  it('devuelve solo los eventos que no estaban en la consulta anterior', () => {
    expect(filasNuevas([registro('a'), registro('b')], [registro('c'), registro('a'), registro('b')])).toEqual(['c']);
  });

  it('sin cambios no marca nada', () => {
    expect(filasNuevas([registro('a')], [registro('a')])).toEqual([]);
  });
});
