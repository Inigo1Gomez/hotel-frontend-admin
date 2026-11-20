import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorInfo } from '../../core/api/api-error';
import { ReportesApi } from '../../core/api/reportes.api';
import { Kpis as KpisDto } from '../../core/models/kpis';
import { claseEstado } from '../../core/models/reserva';
import { refrescoPeriodico } from '../../core/refresco/refresco-periodico';
import { RefrescoControl } from '../../shared/refresco-control';

const CANALES: Partial<Record<string, string>> = { WEB_HUESPEDES: 'Web de huéspedes', PANEL_ADMIN: 'Panel admin' };

/**
 * KPIs de hotel-ms-reportes. Los calcula el consumer group "reportes" (3 miembros) a medida que lee el
 * tópico "reservas"; esta pantalla consulta cada pocos segundos y marca cuando entró un evento nuevo.
 */
@Component({
  selector: 'app-kpis',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, RefrescoControl],
  templateUrl: './kpis.html',
})
export class Kpis {
  private readonly api = inject(ReportesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly refrescoMs = environment.refrescoMs.kpis;
  protected readonly canales = CANALES;
  protected readonly claseEstado = claseEstado;

  protected readonly filtrosForm = this.fb.group({ desde: [''], hasta: [''] });
  private filtro: { desde?: string; hasta?: string } = {};

  protected readonly kpis = signal<KpisDto | null>(null);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly cargando = signal(false);
  protected readonly ultima = signal<Date | null>(null);
  protected readonly autoRefresco = signal(true);
  /** true durante unos segundos cuando la proyección recibió un evento nuevo de Kafka. */
  protected readonly hayNuevo = signal(false);
  private readonly recargar$ = new Subject<void>();
  private avisoNuevo?: ReturnType<typeof setTimeout>;

  protected readonly maximoEstado = computed(() => Math.max(1, ...(this.kpis()?.porEstado.map((fila) => fila.cantidad) ?? [])));
  protected readonly totalCanales = computed(() => (this.kpis()?.porCanal ?? []).reduce((suma, fila) => suma + fila.cantidad, 0));

  constructor() {
    refrescoPeriodico({
      cadaMs: this.refrescoMs,
      activo: () => this.autoRefresco(),
      manual$: this.recargar$,
      pedir: () => {
        this.cargando.set(true);
        return this.api.kpis(this.filtro).pipe(finalize(() => this.cargando.set(false)));
      },
    })
      .pipe(takeUntilDestroyed())
      .subscribe((respuesta) => {
        if (!respuesta.ok) {
          this.error.set(respuesta.error);
          return;
        }
        const anterior = this.kpis();
        if (anterior && respuesta.valor.ultimaActualizacion !== anterior.ultimaActualizacion) this.marcarNuevo();
        this.kpis.set(respuesta.valor);
        this.error.set(null);
        this.ultima.set(new Date());
      });
    this.destroyRef.onDestroy(() => clearTimeout(this.avisoNuevo));
  }

  recargar(): void {
    this.recargar$.next();
  }

  filtrar(): void {
    const { desde, hasta } = this.filtrosForm.getRawValue();
    this.filtro = { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) };
    this.kpis.set(null);
    this.recargar();
  }

  limpiar(): void {
    this.filtrosForm.reset();
    this.filtrar();
  }

  protected porcentaje(cantidad: number, total: number): number {
    return total > 0 ? (cantidad / total) * 100 : 0;
  }

  private marcarNuevo(): void {
    this.hayNuevo.set(true);
    clearTimeout(this.avisoNuevo);
    this.avisoNuevo = setTimeout(() => this.hayNuevo.set(false), 3000);
  }
}
