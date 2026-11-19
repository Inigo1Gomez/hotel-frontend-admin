import { DatePipe } from '@angular/common';
import { Component, input, model, output } from '@angular/core';

/** Casilla "Actualizar solo", hora de la última consulta y botón para consultar a mano. */
@Component({
  selector: 'app-refresco-control',
  imports: [DatePipe],
  template: `
    <div class="refresco">
      <label class="field-check small">
        <input type="checkbox" [checked]="activo()" (change)="activo.set($any($event.target).checked)" />
        Actualizar solo cada {{ cadaMs() / 1000 }} s
      </label>
      <span class="muted small">
        @if (cargando()) {
          Consultando…
        } @else if (ultima(); as ultima) {
          Actualizado {{ ultima | date: 'HH:mm:ss' }}
        }
      </span>
      <button type="button" class="btn btn-ghost btn-sm" [disabled]="cargando()" (click)="actualizar.emit()">Actualizar</button>
    </div>
  `,
})
export class RefrescoControl {
  readonly activo = model(true);
  readonly cadaMs = input.required<number>();
  readonly ultima = input<Date | null>(null);
  readonly cargando = input(false);
  readonly actualizar = output<void>();
}
