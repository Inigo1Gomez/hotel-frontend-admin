import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { refrescoPeriodico, Respuesta } from './refresco-periodico';

describe('refrescoPeriodico', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('consulta al iniciar, en cada tick activo y en cada pedido manual', () => {
    const manual$ = new Subject<void>();
    let activo = true;
    let consultas = 0;
    const respuestas: Respuesta<number>[] = [];
    const sub = refrescoPeriodico({ cadaMs: 5000, activo: () => activo, manual$, pedir: () => of(++consultas) }).subscribe(
      (respuesta) => respuestas.push(respuesta),
    );

    expect(consultas).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(consultas).toBe(2);

    activo = false;
    vi.advanceTimersByTime(10000);
    expect(consultas).toBe(2);

    manual$.next();
    expect(consultas).toBe(3);
    expect(respuestas.at(-1)).toEqual({ ok: true, valor: 3 });
    sub.unsubscribe();
  });

  it('un error se entrega como respuesta y el refresco sigue', () => {
    let falla = true;
    const respuestas: Respuesta<string>[] = [];
    const sub = refrescoPeriodico({
      cadaMs: 1000,
      activo: () => true,
      manual$: new Subject<void>(),
      pedir: () => (falla ? throwError(() => new HttpErrorResponse({ status: 0 })) : of('ok')),
    }).subscribe((respuesta) => respuestas.push(respuesta));

    expect(respuestas[0]?.ok).toBe(false);
    falla = false;
    vi.advanceTimersByTime(1000);
    expect(respuestas[1]).toEqual({ ok: true, valor: 'ok' });
    sub.unsubscribe();
  });
});
