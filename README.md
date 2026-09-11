# hotel-frontend-admin

Panel interno del hotel (administradores y empleados). Angular 21 + **MSAL Angular v5** con login en
**Microsoft Entra ID**. Consume dos microservicios:

| Microservicio       | Qué usa el panel                                         | Validación del token            |
| ------------------- | -------------------------------------------------------- | ------------------------------- |
| `hotel-ms-usuarios` | CRUD de administradores/empleados (`/api/v1/users/admin`) | `jsonwebtoken` + JWKS de Entra  |
| `hotel-ms-reservas` | Registrar reservas (`/api/v1/user/reservas`) y `/api/v1/me` | `passport-azure-ad`             |

```
Navegador (Angular + MSAL)
  1. Login con Entra ID (redirect) -> access token con scope api://<hotel-bff-admin>/access_as_user
  2. MsalInterceptor agrega "Authorization: Bearer <token>" a las llamadas a la API
        |
        |  local:  proxy de ng serve  (/api/usuarios -> :8082, /api/reservas -> :8081)
        |  AWS:    API Gateway HTTPS  (/usuarios -> EC2:8082, /reservas -> EC2:8081) + CORS + JWT authorizer
        v
EC2 con Docker: hotel-ms-usuarios (+ MySQL)  y  hotel-ms-reservas  -> validan firma, issuer, audience y expiración
```

## Qué hay en el código

```
src/
├── environments/
│   ├── entra.config.ts            <- tenant, client ID y scope de Entra ID (lo único que hay que rellenar)
│   ├── environment.ts             <- producción: URLs del API Gateway
│   └── environment.development.ts <- local: URLs del proxy
├── app/
│   ├── app.config.ts              <- providers de MSAL (instancia, MsalGuard, MsalInterceptor)
│   ├── app.routes.ts              <- rutas protegidas con MsalGuard + roleGuard
│   ├── core/auth/
│   │   ├── msal.config.ts         <- configuración de MSAL y protectedResourceMap
│   │   ├── auth.service.ts        <- sesión: cuenta, login/logout, roles y scopes leídos del token
│   │   ├── role.guard.ts          <- exige app roles (ADMIN / EMPLOYEE) desde los claims
│   │   └── jwt.ts                 <- lee los claims del access token para mostrarlos
│   ├── core/api/                  <- clientes HTTP de cada microservicio y traducción de errores
│   └── features/                  <- inicio (login), dashboard, usuarios, reservas, no-autorizado
public/redirect.html               <- redirect bridge de MSAL v5 (es el redirectUri registrado)
proxy.conf.json                    <- proxy local hacia los microservicios (evita CORS en desarrollo)
.github/workflows/deploy-pages.yml <- build + tests + publicación en GitHub Pages
```

- **Resumen**: estado de ambos microservicios, claims del access token (roles, `scp`, `aud`, `iss`, `exp`) y
  prueba en vivo de `/api/v1/me`, donde hotel-ms-reservas devuelve los claims que aceptó.
- **Usuarios**: listar, crear, editar, activar/desactivar y eliminar. "Usar mi cuenta" rellena el formulario con tu
  object ID de Entra.
- **Reservas**: formulario que envía la reserva a hotel-ms-reservas y muestra sus errores de validación campo por campo.
  Ese microservicio todavía no persiste reservas, así que la lista se guarda en el navegador.

## 1. Configurar Microsoft Entra ID

Se usan **dos registros de aplicación**: uno para la API (lo validan los microservicios) y otro para esta SPA.

### 1.1 Registro de la API: `hotel-bff-admin`

1. [Portal de Entra](https://entra.microsoft.com) → **Aplicaciones → Registros de aplicaciones → Nuevo registro**.
   Nombre `hotel-bff-admin`, *Solo cuentas de este directorio*, sin URI de redirección.
2. **Exponer una API** → *URI de id. de aplicación* → **Agregar** (deja `api://<client-id>`) →
   **Agregar un ámbito**: nombre `access_as_user`, *Administradores y usuarios*, completa los textos y guarda.
3. **Roles de aplicación → Crear rol de aplicación** (tipo *Usuarios/Grupos*), dos veces:
   `Administrador` con valor **`ADMIN`** y `Empleado` con valor **`EMPLOYEE`**.
4. **Manifiesto** → busca `"requestedAccessTokenVersion"` (dentro de `"api"`) y ponlo en **`2`**. Guarda.
   En el formato de manifiesto antiguo el campo se llama `"accessTokenAcceptedVersion"`.
   > Sin esto Entra emite tokens v1 (`iss = https://sts.windows.net/...`, `aud = api://...`) y ambos microservicios
   > responden `TOKEN_INVALIDO`, porque esperan `iss = https://login.microsoftonline.com/<tenant>/v2.0` y `aud = <client-id>`.
5. Anota el **Id. de aplicación (cliente)** y el **Id. de directorio (inquilino)**: van en el `.env` del backend
   (`ENTRA_API_CLIENT_ID`, `ENTRA_TENANT_ID`).

### 1.2 Registro de la SPA: `hotel-frontend-admin`

1. **Nuevo registro** → nombre `hotel-frontend-admin`, *Solo cuentas de este directorio*,
   URI de redirección de tipo **Aplicación de página única (SPA)**: `http://localhost:4200/redirect.html`.
2. **Autenticación** → en la plataforma SPA agrega también:
   - `http://localhost:4200/`
   - `https://inigo1gomez.github.io/hotel-frontend-admin/redirect.html`
   - `https://inigo1gomez.github.io/hotel-frontend-admin/`
3. **Permisos de API → Agregar un permiso → Mis API → hotel-bff-admin → Delegados → `access_as_user`** →
   **Conceder consentimiento de administrador**.

### 1.3 Asignar roles a las personas

**Aplicaciones empresariales → hotel-bff-admin → Usuarios y grupos → Agregar usuario/grupo** → elige a la persona y el
rol `Administrador` o `Empleado`. Asigna **usuarios individuales**: asignar grupos exige licencia Entra ID P1, mientras
que todo lo de este README funciona con Entra ID Free. Quien ya tenía sesión debe cerrarla y volver a entrar para
recibir el rol en el token.

### 1.4 Rellenar la app

`src/environments/entra.config.ts`:

```ts
export const entraConfig: AppEnvironment['auth'] = {
  tenantId: '<Id. de directorio>',
  clientId: '<Id. de aplicación de hotel-frontend-admin>',
  apiScope: 'api://<Id. de aplicación de hotel-bff-admin>/access_as_user',
  enforceRoles: false, // ponlo en true cuando ya tengas roles asignados
};
```

Con `enforceRoles: true`, **Usuarios** exige `ADMIN` y **Reservas** exige `ADMIN` o `EMPLOYEE`; sin el rol se muestra
la página *Sin permisos*. Estos IDs no son secretos (una SPA es un cliente público), por eso van en el repositorio.

## 2. Correr en local

Requisitos: Node 22.12 o superior (Angular 21).

1. Levanta los microservicios en `:8082` (usuarios) y `:8081` (reservas). Lo más simple es con Docker:
   `hotel-infra/` trae un `docker-compose.yml` que los construye junto a MySQL.
2. En esta carpeta:

   ```bash
   npm install
   npm start          # http://localhost:4200
   npm test -- --watch=false
   ```

En local el navegador llama a `/api/usuarios/...` y `/api/reservas/...`; `proxy.conf.json` los reenvía a los
microservicios, así que no hace falta CORS.

Si los microservicios ya corren en la EC2, usa `npm run start:ec2`: es lo mismo, pero el proxy
(`proxy.ec2.conf.json`) apunta a la IP elástica `52.201.204.202` en vez de a `localhost`.

## 3. Publicar en GitHub Pages

1. En `src/environments/environment.ts` pon la URL de tu API Gateway:
   `https://<api-id>.execute-api.us-east-1.amazonaws.com/usuarios` y `.../reservas`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Haz push a `main`. El workflow corre los tests, compila con `--base-href /hotel-frontend-admin/`, copia
   `index.html` a `404.html` (para que las rutas `/dashboard`, `/usuarios`… funcionen al recargar) y publica en
   `https://inigo1gomez.github.io/hotel-frontend-admin/`.

**¿Por qué GitHub Pages y no un bucket S3?** Entra ID solo acepta URIs de redirección `https` (salvo `localhost`), y el
hosting estático de S3 es solo `http`. S3 sirve si le pones CloudFront delante: los pasos están en
`hotel-infra/README.md`.

## Problemas comunes

| Síntoma | Causa probable |
| --- | --- |
| `AADSTS50011` (redirect URI no coincide) | Falta registrar la URI exacta, con `/redirect.html`, como tipo **SPA**. |
| `AADSTS65001` (sin consentimiento) | Falta *Conceder consentimiento de administrador* en los permisos de la SPA. |
| `TOKEN_INVALIDO` desde un microservicio | Token v1 (`requestedAccessTokenVersion` ≠ 2) o `ENTRA_API_CLIENT_ID` apunta a la SPA en vez de la API. |
| "Sin respuesta del backend" (status 0) | Microservicio caído, URL mal puesta o CORS del API Gateway sin tu origen. |
| 503 desde el API Gateway | La EC2 está apagada, cambió su IP (usa una IP elástica) o el security group no abre 8081/8082. |
| Roles vacíos | No hay rol asignado en *Aplicaciones empresariales*, o no cerraste sesión después de asignarlo. |
