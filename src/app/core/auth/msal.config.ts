import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  InteractionType,
  IPublicClientApplication,
  LogLevel,
  PublicClientApplication,
} from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/** URL absoluta dentro de la app respetando el <base href> (en GitHub Pages es /hotel-frontend-admin/). */
export function appUrl(path = ''): string {
  return new URL(path, document.baseURI).href;
}

/** Scopes que se piden al iniciar sesión: identidad + acceso a la API del hotel. */
export const loginScopes = ['openid', 'profile', environment.auth.apiScope];

export function isEntraConfigured(): boolean {
  const zeroGuid = '00000000-0000-0000-0000-000000000000';
  return environment.auth.clientId !== zeroGuid && environment.auth.tenantId !== zeroGuid;
}

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.auth.clientId,
      authority: `https://login.microsoftonline.com/${environment.auth.tenantId}`,
      // Página estática con el redirect bridge de MSAL v5 (public/redirect.html).
      redirectUri: appUrl('redirect.html'),
      postLogoutRedirectUri: appUrl(),
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
        loggerCallback: (level, message) => {
          if (level === LogLevel.Error) console.error(message);
          else if (level === LogLevel.Warning) console.warn(message);
        },
      },
    },
  });
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: { scopes: loginScopes },
    loginFailedRoute: '/',
  };
}

/**
 * El MsalInterceptor adjunta "Authorization: Bearer <access token>" a toda llamada
 * que calce con estas URLs; el resto de peticiones sale sin token.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const apiScopes = [environment.auth.apiScope];
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      [`${environment.api.usuarios}/*`, apiScopes],
      [`${environment.api.reservas}/*`, apiScopes],
    ]),
    strictMatching: true,
  };
}
