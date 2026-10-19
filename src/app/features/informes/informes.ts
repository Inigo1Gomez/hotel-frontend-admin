import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiErrorInfo, describeApiError } from '../../core/api/api-error';
import { ReservasApi } from '../../core/api/reservas.api';
import { AuthService } from '../../core/auth/auth.service';
import { ReporteEnCola } from '../../core/models/reporte';

// hotel-ms-reservas no expone un GET de informes: las solicitudes enviadas se recuerdan en este navegador.
const STORAGE_KEY = 'hotel-admin.informes';

// Mismo valor que SIMULAR_FALLO_DOMINIO en hotel-ms-notificaciones (docker-compose).
export const DOMINIO_FALLO_SIMULADO = '@falla.test';

interface SolicitudEnviada extends ReporteEnCola {
  solicitadoEn: string;
}

@Component({
  selector: 'app-informes',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './informes.html',
})
export class Informes {
  private readonly api = inject(ReservasApi);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly dominioFallo = DOMINIO_FALLO_SIMULADO;
  protected readonly solicitudes = signal<SolicitudEnviada[]>(leerSolicitudes());
  protected readonly enviando = signal(false);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly aviso = signal<string | null>(null);

  private readonly rango = rangoPorDefecto();
  protected readonly form = this.fb.group({
    desde: [this.rango.desde, Validators.required],
    hasta: [this.rango.hasta, Validators.required],
    email: ['', Validators.email],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { desde, hasta, email } = this.form.getRawValue();
    const destinatario = email.trim();

    this.enviando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.api
      .solicitarReporte({ desde, hasta, ...(destinatario ? { email: destinatario } : {}) })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (reporte) => {
          this.solicitudes.update((lista) => [{ ...reporte, solicitadoEn: new Date().toISOString() }, ...lista]);
          guardarSolicitudes(this.solicitudes());
          this.aviso.set(mensajeEnCola(reporte));
          this.form.controls.email.reset('');
        },
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  quitar(solicitud: SolicitudEnviada): void {
    this.solicitudes.update((lista) => lista.filter((item) => item !== solicitud));
    guardarSolicitudes(this.solicitudes());
  }

  protected fallaAProposito(email: string): boolean {
    return email.toLowerCase().endsWith(DOMINIO_FALLO_SIMULADO);
  }

  protected invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && control.touched;
  }
}

function mensajeEnCola(reporte: ReporteEnCola): string {
  const email = reporte.solicitadoPor.email;
  if (email.toLowerCase().endsWith(DOMINIO_FALLO_SIMULADO)) {
    return `Informe en cola. El PDF llegará a ${email}, pero el aviso fallará a propósito: tras 3 reintentos termina en hotel.dlq.`;
  }
  return `Informe en cola. Llegarán dos correos a ${email}: el aviso de que se está generando y el PDF.`;
}

function fechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Del primer día del mes actual al último del subsiguiente: incluye las reservas con entrada próxima. */
export function rangoPorDefecto(hoy = new Date()): { desde: string; hasta: string } {
  return {
    desde: fechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: fechaIso(new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)),
  };
}

function leerSolicitudes(): SolicitudEnviada[] {
  try {
    const guardadas: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(guardadas) ? (guardadas as SolicitudEnviada[]) : [];
  } catch {
    return [];
  }
}

function guardarSolicitudes(solicitudes: SolicitudEnviada[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitudes));
}
