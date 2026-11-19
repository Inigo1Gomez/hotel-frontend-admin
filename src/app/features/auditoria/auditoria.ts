import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorInfo } from '../../core/api/api-error';
import { AuditoriaApi } from '../../core/api/auditoria.api';
import { Entidad, FiltrosAuditoria, RegistroAuditoria, TIPOS_EVENTO, TipoEvento } from '../../core/models/auditoria';
import { Pagina, totalPaginas } from '../../core/models/pagina';
import { refrescoPeriodico } from '../../core/refresco/refresco-periodico';
import { RefrescoControl } from '../../shared/refresco-control';

const TAMANO_PAGINA = 20;

/**
 * Trazabilidad de hotel-ms-auditoria: quién hizo qué, cuándo y desde dónde, con la partición y el offset
 * de Kafka de cada evento. Se actualiza sola y resalta las filas que llegaron desde la última consulta.
 */
@Component({
  selector: 'app-auditoria',
  imports: [ReactiveFormsModule, DatePipe, RefrescoControl],
  templateUrl: './auditoria.html',
})
export class Auditoria {
  private readonly api = inject(AuditoriaApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tipos = TIPOS_EVENTO;
  protected readonly refrescoMs = environment.refrescoMs.auditoria;

  protected readonly filtrosForm = this.fb.group({
    usuario: [''],
    tipo: this.fb.control<TipoEvento | ''>(''),
    entidad: this.fb.control<Entidad | ''>(''),
    codigo: [''],
    desde: [''],
    hasta: [''],
  });
  private readonly filtros = signal<FiltrosAuditoria>({ pagina: 1, tamano: TAMANO_PAGINA });

  protected readonly pagina = signal<Pagina<RegistroAuditoria> | null>(null);
  protected readonly totalPaginas = computed(() => {
    const pagina = this.pagina();
    return pagina ? totalPaginas(pagina) : 1;
  });
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly ultima = signal<Date | null>(null);
  protected readonly autoRefresco = signal(true);
  /** eventoId de las filas que aparecieron en la última consulta automática. */
  protected readonly nuevos = signal<ReadonlySet<string>>(new Set());
  private readonly recargar$ = new Subject<void>();
  private consultaManual = true;
  private limpiarNuevos?: ReturnType<typeof setTimeout>;

  constructor() {
    refrescoPeriodico({
      cadaMs: this.refrescoMs,
      activo: () => this.autoRefresco(),
      manual$: this.recargar$,
      pedir: () => {
        this.cargando.set(true);
        return this.api.buscar(this.filtros()).pipe(finalize(() => this.cargando.set(false)));
      },
    })
      .pipe(takeUntilDestroyed())
      .subscribe((respuesta) => {
        if (!respuesta.ok) {
          this.error.set(respuesta.error);
          return;
        }
        // Al cambiar filtros o página todo es "nuevo": solo se resaltan las filas que trajo el refresco automático.
        if (!this.consultaManual) this.marcarNuevos(filasNuevas(this.pagina()?.data ?? [], respuesta.valor.data));
        this.consultaManual = false;
        this.pagina.set(respuesta.valor);
        this.error.set(null);
        this.ultima.set(new Date());
      });
    this.destroyRef.onDestroy(() => clearTimeout(this.limpiarNuevos));
  }

  recargar(): void {
    this.consultaManual = true;
    this.recargar$.next();
  }

  buscar(): void {
    this.filtros.set({ ...this.filtrosForm.getRawValue(), pagina: 1, tamano: TAMANO_PAGINA });
    this.recargar();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.buscar();
  }

  irAPagina(pagina: number): void {
    this.filtros.update((filtros) => ({ ...filtros, pagina }));
    this.recargar();
  }

  protected actor(registro: RegistroAuditoria): string {
    if (registro.actor.tipo === 'INVITADO') return 'Invitado';
    return registro.actor.nombre ?? registro.actor.id;
  }

  protected claseTipo(tipo: TipoEvento): string {
    if (tipo === 'RESERVA_CANCELADA') return 'badge-off';
    if (tipo === 'RESERVA_CONFIRMADA' || tipo === 'RESERVA_COMPLETADA') return 'badge-ok';
    if (tipo.startsWith('HABITACION') || tipo === 'DISPONIBILIDAD_CAMBIADA') return 'badge-info';
    return 'badge-wait';
  }

  private marcarNuevos(ids: string[]): void {
    if (ids.length === 0) return;
    this.nuevos.set(new Set(ids));
    clearTimeout(this.limpiarNuevos);
    this.limpiarNuevos = setTimeout(() => this.nuevos.set(new Set()), 4000);
  }
}

/** eventoId que están en la consulta nueva y no estaban en la anterior. */
export function filasNuevas(antes: RegistroAuditoria[], ahora: RegistroAuditoria[]): string[] {
  const vistos = new Set(antes.map((registro) => registro.eventoId));
  return ahora.filter((registro) => !vistos.has(registro.eventoId)).map((registro) => registro.eventoId);
}
