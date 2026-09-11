import { decodeJwtPayload, rolesFrom, scopesFrom } from './jwt';

function base64Url(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tokenCon(payload: object): string {
  return `${base64Url({ alg: 'RS256', typ: 'JWT' })}.${base64Url(payload)}.firma`;
}

describe('decodeJwtPayload', () => {
  it('lee roles, scopes y textos con tildes del payload', () => {
    const claims = decodeJwtPayload(tokenCon({ name: 'Iñigo Gómez', roles: ['ADMIN'], scp: 'access_as_user' }));

    expect(claims?.name).toBe('Iñigo Gómez');
    expect(rolesFrom(claims)).toEqual(['ADMIN']);
    expect(scopesFrom(claims)).toEqual(['access_as_user']);
  });

  it('devuelve null si el token está mal formado', () => {
    expect(decodeJwtPayload('no-es-un-jwt')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });

  it('tolera tokens sin roles ni scopes', () => {
    const claims = decodeJwtPayload(tokenCon({ aud: 'api' }));
    expect(rolesFrom(claims)).toEqual([]);
    expect(scopesFrom(claims)).toEqual([]);
  });
});
