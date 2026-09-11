import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

function crearAuthFalso(logueado: boolean) {
  return {
    isLoggedIn: signal(logueado),
    displayName: signal('Ana Pérez'),
    account: signal(logueado ? { username: 'ana@hotel.cl' } : null),
    roles: signal(['ADMIN']),
    error: signal<string | null>(null),
    init: vi.fn(),
    logout: vi.fn(),
  };
}

async function montar(logueado: boolean) {
  const auth = crearAuthFalso(logueado);
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  }).compileComponents();

  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { auth, element: fixture.nativeElement as HTMLElement };
}

describe('App', () => {
  it('inicializa la sesión de MSAL al arrancar', async () => {
    const { auth } = await montar(false);
    expect(auth.init).toHaveBeenCalledOnce();
  });

  it('sin sesión no muestra el menú lateral', async () => {
    const { element } = await montar(false);
    expect(element.querySelector('.sidebar')).toBeNull();
  });

  it('con sesión muestra usuario, roles y navegación', async () => {
    const { element } = await montar(true);
    expect(element.querySelector('.session-name')?.textContent).toContain('Ana Pérez');
    expect(element.querySelector('.chip')?.textContent).toContain('ADMIN');
    expect(element.querySelectorAll('.nav a').length).toBe(3);
  });
});
