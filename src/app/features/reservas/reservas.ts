import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiErrorInfo, describeApiError } from '../../core/api/api-error';
import { ReservasApi } from '../../core/api/reservas.api';
import { ESTADOS_RESERVA, EstadoReserva, Reserva } from '../../core/models/reserva';

// hotel-ms-reservas todavía no guarda reservas: las aceptadas se recuerdan en este navegador.
const STORAGE_KEY = 'hotel-admin.reservas';

@Component({
  selector: 'app-reservas',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './reservas.html',
})
export class Reservas {
  private readonly api = inject(ReservasApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly estados = ESTADOS_RESERVA;
  protected readonly reservas = signal<Reserva[]>(leerReservas());
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
        next: (aceptada) => {
          this.reservas.update((lista) => [aceptada, ...lista]);
          guardarReservas(this.reservas());
          this.aviso.set(`hotel-ms-reservas aceptó la reserva ${aceptada.codigo}.`);
          this.form.reset();
          this.form.controls.codigo.setValue(nuevoCodigo());
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  quitar(reserva: Reserva): void {
    this.reservas.update((lista) => lista.filter((item) => item !== reserva));
    guardarReservas(this.reservas());
  }

  protected invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && control.touched;
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

function leerReservas(): Reserva[] {
  try {
    const guardadas: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(guardadas) ? (guardadas as Reserva[]) : [];
  } catch {
    return [];
  }
}

function guardarReservas(reservas: Reserva[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
}
