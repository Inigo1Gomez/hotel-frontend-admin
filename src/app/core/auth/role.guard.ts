import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Exige alguno de los roles de `route.data.roles`, leídos desde los claims del token.
 * Va después de MsalGuard: espera a que MSAL termine de procesar el login antes de decidir.
 */
export const roleGuard: CanActivateFn = (route) => {
  const required = (route.data['roles'] as string[] | undefined) ?? [];
  if (!environment.auth.enforceRoles || required.length === 0) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureApiClaims().pipe(
    map(() =>
      auth.hasAnyRole(required)
        ? true
        : router.createUrlTree(['/no-autorizado'], { queryParams: { requiere: required.join(',') } }),
    ),
  );
};
