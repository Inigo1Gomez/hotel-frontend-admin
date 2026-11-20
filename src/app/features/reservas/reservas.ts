import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorInfo, describeApiError } from '../../core/api/api-error';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { ReservasApi } from '../../core/api/reservas.api';
import { Disponibilidad, Habitacion, Hotel } from '../../core/models/catalogo';
import { Pagina, totalPaginas } from '../../core/models/pagina';
import {
  claseEstado,
  ESTADOS_INICIALES,
  ESTADOS_RESERVA,
  EstadoReserva,
  FiltrosReserva,
  Reserva,
  TRANSICIONES,
} from '../../core/models/reserva';
import { refrescoPeriodico } from '../../core/refresco/refresco-periodico';
import { RefrescoControl } from '../../shared/refresco-control';

const TAMANO_PAGINA = 20;

/** Texto del botón para cada estado destino. */
const ACCIONES: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmar',
  CANCELADA: 'Cancelar',
  COMPLETADA: 'Completar',
};

/**
 * Reservas guardadas en hotel-ms-reservas (MySQL). Admin y Operador pueden registrar reservas,
 * filtrarlas y cambiarles el estado; cada cambio publica un evento en el tópico "reservas" de Kafka.
 */
@Component({
  selector: 'app-reservas',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, RefrescoControl],
  templateUrl: './reservas.html',
})
export class Reservas {
  private readonly api = inject(ReservasApi);
  private readonly catalogoApi = inject(CatalogoApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly estados = ESTADOS_RESERVA;
  protected readonly estadosIniciales = ESTADOS_INICIALES;
  protected readonly transiciones = TRANSICIONES;
  protected readonly acciones = ACCIONES;
  protected readonly refrescoMs = environment.refrescoMs.reservas;

  // ---------- Catálogo (para elegir la habitación y su precio) ----------
  protected readonly hoteles = signal<Hotel[]>([]);
  protected readonly errorCatalogo = signal<string | null>(null);
  private readonly habitacionPorId = computed(
    () => new Map(this.hoteles().flatMap((hotel) => hotel.habitaciones.map((habitacion) => [habitacion.id, habitacion] as const))),
  );

  // ---------- Listado ----------
  protected readonly filtrosForm = this.fb.group({
    estado: this.fb.control<EstadoReserva | ''>(''),
    idHabitacion: [''],
    email: [''],
    desde: [''],
    hasta: [''],
  });
  private readonly filtros = signal<FiltrosReserva>({ pagina: 1, tamano: TAMANO_PAGINA });
  protected readonly pagina = signal<Pagina<Reserva> | null>(null);
  protected readonly totalPaginas = computed(() => {
    const pagina = this.pagina();
    return pagina ? totalPaginas(pagina) : 1;
  });
  protected readonly cargando = signal(false);
  protected readonly ultima = signal<Date | null>(null);
  protected readonly autoRefresco = signal(true);
  protected readonly errorLista = signal<ApiErrorInfo | null>(null);
  protected readonly cambiando = signal<string | null>(null);
  private readonly recargar$ = new Subject<void>();

  // ---------- Nueva reserva ----------
  protected readonly enviando = signal(false);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly form = this.fb.group({
    codigo: [nuevoCodigo(), Validators.required],
    idHabitacion: ['', Validators.required],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    fechaEntrada: ['', Validators.required],
    fechaSalida: ['', Validators.required],
    cantidadHuespedes: [1, [Validators.required, Validators.min(1)]],
    estado: this.fb.control<EstadoReserva>('PENDIENTE'),
    precioPorNoche: [0, [Validators.required, Validators.min(0)]],
    observaciones: [''],
  });

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly noches = computed(() => nochesEntre(this.valores().fechaEntrada, this.valores().fechaSalida));
  protected readonly total = computed(() => this.noches() * (Number(this.valores().precioPorNoche) || 0));
  protected readonly habitacionElegida = computed(() => this.habitacionPorId().get(this.valores().idHabitacion ?? ''));

  /** Unidades libres en esas fechas según hotel-ms-catalogo (lo actualiza el consumer group "disponibilidad"). */
  protected readonly disponibilidad = toSignal(
    toObservable(
      computed(() => {
        const { idHabitacion, fechaEntrada, fechaSalida } = this.valores();
        return this.habitacionElegida() && nochesEntre(fechaEntrada, fechaSalida) > 0
          ? `${idHabitacion}|${fechaEntrada}|${fechaSalida}`
          : '';
      }),
    ).pipe(
      distinctUntilChanged(),
      debounceTime(300),
      switchMap((clave) => {
        if (!clave) return of(null);
        const [id, desde, hasta] = clave.split('|') as [string, string, string];
        return this.catalogoApi.disponibilidad(id, desde, hasta).pipe(catchError(() => of(null)));
      }),
    ),
    { initialValue: null as Disponibilidad | null },
  );

  constructor() {
    this.catalogoApi
      .hoteles()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (hoteles) => this.hoteles.set(hoteles),
        error: (error: unknown) => this.errorCatalogo.set(describeApiError(error).mensaje),
      });

    // Al elegir una habitación del catálogo se toma su precio por noche.
    this.form.controls.idHabitacion.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const habitacion = this.habitacionPorId().get(id);
      if (habitacion) this.form.controls.precioPorNoche.setValue(habitacion.precioPorNoche);
    });

    refrescoPeriodico({
      cadaMs: this.refrescoMs,
      activo: () => this.autoRefresco() && this.cambiando() === null,
      manual$: this.recargar$,
      pedir: () => {
        this.cargando.set(true);
        return this.api.listar(this.filtros()).pipe(finalize(() => this.cargando.set(false)));
      },
    })
      .pipe(takeUntilDestroyed())
      .subscribe((respuesta) => {
        if (respuesta.ok) {
          this.pagina.set(respuesta.valor);
          this.errorLista.set(null);
          this.ultima.set(new Date());
        } else {
          this.errorLista.set(respuesta.error);
        }
      });
  }

  recargar(): void {
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

  cambiarEstado(reserva: Reserva, estado: EstadoReserva): void {
    if (!reserva.id) return;
    if (estado === 'CANCELADA' && !confirm(`¿Cancelar la reserva ${reserva.codigo}? No se puede deshacer.`)) return;

    this.cambiando.set(reserva.id);
    this.error.set(null);
    this.aviso.set(null);
    this.api
      .cambiarEstado(reserva.id, estado)
      .pipe(finalize(() => this.cambiando.set(null)))
      .subscribe({
        next: (actualizada) => {
          this.aviso.set(`La reserva ${actualizada.codigo} quedó ${actualizada.estado}.`);
          this.recargar();
        },
        error: (error: unknown) => {
          this.error.set(describeApiError(error));
          this.recargar();
        },
      });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const telefono = valores.telefono.trim();
    const observaciones = valores.observaciones.trim();
    const reserva: Reserva = {
      codigo: valores.codigo.trim(),
      idHabitacion: valores.idHabitacion.trim(),
      huesped: {
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        email: valores.email.trim(),
        ...(telefono ? { telefono } : {}),
      },
      fechaEntrada: valores.fechaEntrada,
      fechaSalida: valores.fechaSalida,
      cantidadHuespedes: Number(valores.cantidadHuespedes),
      estado: valores.estado,
      precioPorNoche: Number(valores.precioPorNoche),
      precioTotal: this.total(),
      ...(observaciones ? { observaciones } : {}),
    };

    this.enviando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.api
      .crear(reserva)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (creada) => {
          this.aviso.set(`Reserva ${creada.codigo} guardada en estado ${creada.estado}.`);
          this.form.reset();
          this.form.controls.codigo.setValue(nuevoCodigo());
          this.recargar();
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  protected nombreHabitacion(id: string): string {
    return this.habitacionPorId().get(id)?.nombre ?? '';
  }

  protected invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && control.touched;
  }

  protected readonly claseEstado = claseEstado;

  protected habitacionesActivas(hotel: Hotel): Habitacion[] {
    return hotel.habitaciones.filter((habitacion) => habitacion.activa);
  }
}

export function nochesEntre(entrada: string | undefined, salida: string | undefined): number {
  const desde = Date.parse(entrada ?? '');
  const hasta = Date.parse(salida ?? '');
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return 0;
  return Math.max(0, Math.round((hasta - desde) / 86_400_000));
}

function nuevoCodigo(): string {
  return `RES-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
