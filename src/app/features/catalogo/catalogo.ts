import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErrorInfo, describeApiError } from '../../core/api/api-error';
import { CatalogoApi } from '../../core/api/catalogo.api';
import { AuthService } from '../../core/auth/auth.service';
import { CambiosHabitacion, Habitacion, Hotel } from '../../core/models/catalogo';

/**
 * Catálogo (entidad secundaria) desde hotel-ms-catalogo. Todos lo ven; solo Admin cambia precios,
 * unidades o crea habitaciones. Cada cambio publica la habitación completa en el tópico compactado "catalogo".
 */
@Component({
  selector: 'app-catalogo',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, NgTemplateOutlet],
  templateUrl: './catalogo.html',
})
export class Catalogo {
  private readonly api = inject(CatalogoApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly hoteles = signal<Hotel[]>([]);
  protected readonly cargando = signal(true);
  protected readonly idHotel = signal('');
  protected readonly hotel = computed((): Hotel | undefined => this.hoteles().find((hotel) => hotel.id === this.idHotel()) ?? this.hoteles()[0]);
  protected readonly guardando = signal<string | null>(null);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly aviso = signal<string | null>(null);

  /** El backend es quien decide (403 si no es ADMIN); aquí solo se ocultan los controles. */
  protected readonly puedeEditar = computed(() => !environment.auth.enforceRoles || this.auth.roles().includes('ADMIN'));

  protected readonly form = this.fb.group({
    id: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{2,63}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.maxLength(500)]],
    camas: ['', [Validators.required, Validators.maxLength(150)]],
    capacidad: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
    metrosCuadrados: [20, [Validators.required, Validators.min(1), Validators.max(500)]],
    precioPorNoche: [50000, [Validators.required, Validators.min(1)]],
    unidades: [1, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  constructor() {
    this.api
      .hoteles()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (hoteles) => {
          this.hoteles.set(hoteles);
          if (!this.idHotel() && hoteles[0]) this.idHotel.set(hoteles[0].id);
          this.form.controls.id.setValue(siguienteId(this.hotel()));
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  elegirHotel(id: string): void {
    this.idHotel.set(id);
    this.form.controls.id.setValue(siguienteId(this.hotel()));
  }

  /** Guarda solo lo que cambió (precio y/o unidades) con PATCH. */
  guardar(habitacion: Habitacion, precio: number, unidades: number): void {
    const cambios: CambiosHabitacion = {
      ...(precio !== habitacion.precioPorNoche ? { precioPorNoche: precio } : {}),
      ...(unidades !== habitacion.unidades ? { unidades } : {}),
    };
    if (Object.keys(cambios).length === 0) {
      this.aviso.set(`Sin cambios en ${habitacion.id}.`);
      return;
    }
    this.actualizar(habitacion, cambios);
  }

  alternarActiva(habitacion: Habitacion): void {
    this.actualizar(habitacion, { activa: !habitacion.activa });
  }

  crear(): void {
    const hotel = this.hotel();
    if (this.form.invalid || !hotel) {
      this.form.markAllAsTouched();
      return;
    }
    const valores = this.form.getRawValue();
    this.guardando.set('nueva');
    this.limpiarMensajes();
    this.api
      .crearHabitacion({
        ...valores,
        idHotel: hotel.id,
        capacidad: Number(valores.capacidad),
        metrosCuadrados: Number(valores.metrosCuadrados),
        precioPorNoche: Number(valores.precioPorNoche),
        unidades: Number(valores.unidades),
      })
      .pipe(finalize(() => this.guardando.set(null)))
      .subscribe({
        next: (creada) => {
          this.reemplazar(creada);
          this.aviso.set(`Habitación ${creada.id} creada en ${hotel.nombre}. Se publicó HABITACION_CREADA en "catalogo".`);
          this.form.reset();
          this.form.controls.id.setValue(siguienteId(this.hotel()));
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  protected invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && control.touched;
  }

  private actualizar(habitacion: Habitacion, cambios: CambiosHabitacion): void {
    this.guardando.set(habitacion.id);
    this.limpiarMensajes();
    this.api
      .actualizarHabitacion(habitacion.id, cambios)
      .pipe(finalize(() => this.guardando.set(null)))
      .subscribe({
        next: (actualizada) => {
          this.reemplazar(actualizada);
          this.aviso.set(`Habitación ${actualizada.id} actualizada. Se publicó HABITACION_ACTUALIZADA en "catalogo".`);
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  /** Pone la habitación devuelta por el backend en su hotel y recalcula el "precio desde". */
  private reemplazar(habitacion: Habitacion): void {
    this.hoteles.update((hoteles) =>
      hoteles.map((hotel) => {
        if (hotel.id !== habitacion.idHotel) return hotel;
        const existe = hotel.habitaciones.some((actual) => actual.id === habitacion.id);
        const habitaciones = existe
          ? hotel.habitaciones.map((actual) => (actual.id === habitacion.id ? habitacion : actual))
          : [...hotel.habitaciones, habitacion];
        const precios = habitaciones.filter((actual) => actual.activa).map((actual) => actual.precioPorNoche);
        return { ...hotel, habitaciones, precioDesde: precios.length ? Math.min(...precios) : null };
      }),
    );
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.aviso.set(null);
  }
}

/** Propone el id siguiente con la convención del catálogo: <idHotel>-room-<n>. */
export function siguienteId(hotel: Hotel | undefined): string {
  if (!hotel) return '';
  const numeros = hotel.habitaciones.map((habitacion) => Number(/-room-(\d+)$/.exec(habitacion.id)?.[1] ?? 0));
  return `${hotel.id}-room-${Math.max(0, ...numeros) + 1}`;
}
