/** Claims que la app lee de los tokens de Entra ID (v2). */
export interface TokenClaims {
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  tid?: string;
  oid?: string;
  sub?: string;
  name?: string;
  preferred_username?: string;
  /** App roles asignados al usuario (p. ej. ADMIN, EMPLOYEE). */
  roles?: string[];
  /** Scopes delegados, separados por espacio (p. ej. "access_as_user"). */
  scp?: string;
  [claim: string]: unknown;
}

/**
 * Lee el payload de un JWT sin validarlo. Solo sirve para mostrar claims en la UI:
 * la validación real (firma, issuer, audience, expiración) la hacen el API Gateway y los microservicios.
 */
export function decodeJwtPayload(token: string): TokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  try {
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof claims === 'object' && claims !== null ? (claims as TokenClaims) : null;
  } catch {
    return null;
  }
}

export function scopesFrom(claims: TokenClaims | null | undefined): string[] {
  return typeof claims?.scp === 'string' ? claims.scp.split(' ').filter(Boolean) : [];
}

export function rolesFrom(claims: TokenClaims | null | undefined): string[] {
  return Array.isArray(claims?.roles) ? claims.roles.filter((role) => typeof role === 'string') : [];
}
