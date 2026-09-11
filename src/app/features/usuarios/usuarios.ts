import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiErrorInfo, describeApiError } from '../../core/api/api-error';
import { UsuariosApi } from '../../core/api/usuarios.api';
import { AuthService } from '../../core/auth/auth.service';
import { Admin, AdminInput, AdminRole } from '../../core/models/admin';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly api = inject(UsuariosApi);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly admins = signal<Admin[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<ApiErrorInfo | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly formAbierto = signal(false);
  /** Administrador en edición; null cuando el formulario crea uno nuevo. */
  protected readonly editando = signal<Admin | null>(null);

  protected readonly form = this.fb.group({
    entraId: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: this.fb.control<AdminRole>('EMPLOYEE'),
    active: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (admins) => this.admins.set(admins),
        error: (error: unknown) => this.error.set(describeApiError(error)),
      });
  }

  nuevo(): void {
    this.editando.set(null);
    this.form.reset({ entraId: '', name: '', email: '', role: 'EMPLOYEE', active: true });
    this.formAbierto.set(true);
  }

  editar(admin: Admin): void {
    this.editando.set(admin);
    this.form.reset({
      entraId: admin.entraId,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      active: admin.active,
    });
    this.formAbierto.set(true);
  }

  /** Rellena el formulario con la cuenta que inició sesión (oid, nombre y correo del ID token). */
  usarMiCuenta(): void {
    const account = this.auth.account();
    if (!account) return;
    this.form.patchValue({ entraId: account.localAccountId, name: account.name ?? '', email: account.username });
  }

  cancelar(): void {
    this.formAbierto.set(false);
    this.editando.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const input: AdminInput = this.form.getRawValue();
    const editando = this.editando();
    const peticion = editando ? this.api.actualizar(editando.id, input) : this.api.crear(input);

    this.guardando.set(true);
    this.error.set(null);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (guardado) => {
        this.admins.update((lista) =>
          editando ? lista.map((admin) => (admin.id === guardado.id ? guardado : admin)) : [guardado, ...lista],
        );
        this.aviso.set(editando ? `Se actualizó a ${guardado.name}.` : `Se creó a ${guardado.name}.`);
        this.cancelar();
      },
      error: (error: unknown) => this.error.set(describeApiError(error)),
    });
  }

  alternarActivo(admin: Admin): void {
    this.error.set(null);
    this.api.actualizar(admin.id, { active: !admin.active }).subscribe({
      next: (guardado) => this.admins.update((lista) => lista.map((item) => (item.id === guardado.id ? guardado : item))),
      error: (error: unknown) => this.error.set(describeApiError(error)),
    });
  }

  eliminar(admin: Admin): void {
    if (!confirm(`¿Eliminar a ${admin.name}? Esta acción no se puede deshacer.`)) return;
    this.error.set(null);
    this.api.eliminar(admin.id).subscribe({
      next: () => {
        this.admins.update((lista) => lista.filter((item) => item.id !== admin.id));
        this.aviso.set(`Se eliminó a ${admin.name}.`);
      },
      error: (error: unknown) => this.error.set(describeApiError(error)),
    });
  }

  protected invalido(campo: keyof AdminInput): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }
}
