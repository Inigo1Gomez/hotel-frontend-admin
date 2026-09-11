import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, EventType, InteractionRequiredAuthError, InteractionStatus } from '@azure/msal-browser';
import { catchError, filter, map, Observable, of, switchMap, take, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { decodeJwtPayload, rolesFrom, scopesFrom, TokenClaims } from './jwt';
import { appUrl, loginScopes } from './msal.config';

/** Estado de la sesión de Entra ID expuesto como signals para las vistas. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly account = signal<AccountInfo | null>(null);
  /** Claims del access token que se envía a la API (no del ID token). */
  readonly apiClaims = signal<TokenClaims | null>(null);
  readonly error = signal<string | null>(null);

  readonly isLoggedIn = computed(() => this.account() !== null);
  readonly displayName = computed(() => this.account()?.name ?? this.account()?.username ?? '');
  readonly scopes = computed(() => scopesFrom(this.apiClaims()));
  /** Roles del access token (app roles de hotel-bff-admin) más los del ID token, si los hubiera. */
  readonly roles = computed(() => {
    const idTokenRoles = rolesFrom(this.account()?.idTokenClaims as TokenClaims | undefined);
    return [...new Set([...rolesFrom(this.apiClaims()), ...idTokenRoles])];
  });

  /** Se llama una vez desde el componente raíz. */
  init(): void {
    this.msal.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result?.account) this.msal.instance.setActiveAccount(result.account);
      },
      error: (error: unknown) => this.error.set(describeMsalError(error)),
    });

    this.broadcast.msalSubject$
      .pipe(
        filter((message) => message.eventType === EventType.LOGIN_SUCCESS || message.eventType === EventType.LOGOUT_SUCCESS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncAccount());

    this.whenIdle()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncAccount();
        if (this.isLoggedIn()) this.loadApiClaims().subscribe();
      });
  }

  /** Emite cada vez que MSAL termina una interacción (login, redirect, logout). */
  whenIdle(): Observable<void> {
    return this.broadcast.inProgress$.pipe(
      filter((status) => status === InteractionStatus.None),
      map(() => undefined),
    );
  }

  login(): void {
    this.error.set(null);
    this.msal.loginRedirect({ scopes: loginScopes, redirectStartPage: appUrl('dashboard') }).subscribe({
      error: (error: unknown) => this.error.set(describeMsalError(error)),
    });
  }

  logout(): void {
    this.msal.logoutRedirect({ account: this.account() ?? undefined, postLogoutRedirectUri: appUrl() }).subscribe();
  }

  /** Pide (o toma de caché) el access token de la API y guarda sus claims para mostrar roles y scopes. */
  loadApiClaims(): Observable<TokenClaims | null> {
    const account = this.msal.instance.getActiveAccount();
    if (!account) return of(null);

    return this.msal.acquireTokenSilent({ scopes: [environment.auth.apiScope], account }).pipe(
      map((result) => decodeJwtPayload(result.accessToken)),
      tap((claims) => this.apiClaims.set(claims)),
      catchError((error: unknown) => {
        // Si hace falta interacción (consentimiento, sesión vencida), el MsalInterceptor la inicia en la próxima llamada a la API.
        if (!(error instanceof InteractionRequiredAuthError)) this.error.set(describeMsalError(error));
        return of(null);
      }),
    );
  }

  /** Espera a que MSAL esté libre, sincroniza la cuenta y devuelve los claims de la API. */
  ensureApiClaims(): Observable<TokenClaims | null> {
    return this.whenIdle().pipe(
      take(1),
      switchMap(() => {
        this.syncAccount();
        const claims = this.apiClaims();
        return claims ? of(claims) : this.loadApiClaims();
      }),
    );
  }

  hasAnyRole(required: string[]): boolean {
    const roles = this.roles();
    return required.some((role) => roles.includes(role));
  }

  private syncAccount(): void {
    const instance = this.msal.instance;
    let account = instance.getActiveAccount();
    if (!account) {
      account = instance.getAllAccounts()[0] ?? null;
      if (account) instance.setActiveAccount(account);
    }
    this.account.set(account);
    if (!account) this.apiClaims.set(null);
  }
}

function describeMsalError(error: unknown): string {
  const code = (error as { errorCode?: string } | null)?.errorCode;
  const hints: Record<string, string> = {
    interaction_in_progress: 'Ya hay un inicio de sesión en curso. Espera unos segundos y vuelve a intentarlo.',
    user_cancelled: 'Se canceló el inicio de sesión.',
    redirect_uri_mismatch: 'La URL de retorno no está registrada en Entra ID (revisa las Redirect URIs de la SPA).',
  };
  if (code && hints[code]) return hints[code];
  return code ? `Error de autenticación (${code}).` : 'Error de autenticación inesperado.';
}
