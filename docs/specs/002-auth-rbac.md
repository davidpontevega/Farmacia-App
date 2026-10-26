---
id: 002
title: Autenticación Clerk y autorización RBAC
status: done
module: auth
scope: both
---

# 002 — Autenticación Clerk y autorización RBAC

## Objetivo
Solo personal invitado por un admin puede entrar. Cada Route Handler decide acceso por código de permiso consultando Postgres, y un usuario desactivado pierde acceso al instante.

## Alcance
Incluye: Clerk en layout, `proxy.ts`, página `/sign-in`, webhook `user.created`/`user.updated`/`user.deleted`, helper `requirePermission`, helper `writeAudit`, módulo de usuarios en admin (listar, invitar, cambiar rol, desactivar/reactivar), error handler común de Route Handlers.
No incluye: UI de gestión de roles y permisos (spec propio), listado de audit logs en UI, recuperación de contraseña personalizada (la de Clerk basta), 2FA.

## Criterios de aceptación
- [x] AC1 — Dado un visitante anónimo, cuando abre cualquier ruta salvo `/sign-in` y `/api/webhooks/*`, entonces es redirigido a `/sign-in` (páginas) o recibe 401 (API).
- [x] AC2 — `/sign-in` no ofrece registro ni proveedores sociales; Clerk tiene el registro público desactivado.
- [x] AC3 — Dado un usuario sin el permiso `X`, cuando llama a un endpoint protegido con `requirePermission('X')`, entonces recibe 403 y nada se ejecuta.
- [x] AC4 — Dado un usuario con `is_active=false` y sesión Clerk aún válida, cuando llama a cualquier endpoint protegido, entonces recibe 403.
- [x] AC5 — Dado el super admin del seed (`clerk_id = pending:<email>`), cuando inicia sesión por primera vez con ese email, entonces su fila se reconcilia (clerk_id real) y conserva el rol admin.
- [x] AC6 — Dado un admin, cuando invita un correo con rol, entonces se crea la invitación en Clerk, la fila en `users` con el rol, y un `audit_logs` `user.invited`; el invitado completa contraseña y entra con ese rol.
- [x] AC7 — Dado un admin, cuando desactiva a un trabajador, entonces en una operación: `is_active=false`, ban en Clerk, sesiones revocadas, `audit_logs` `user.deactivated`. Reactivar revierte (unban).
- [x] AC8 — Un admin no puede desactivarse a sí mismo ni quitarse el rol admin si es el último admin activo (400).
- [x] AC9 — El webhook rechaza con 400 una firma inválida y es idempotente ante reenvíos.
- [x] AC10 — `/admin/*` redirige a `/pos` a quien no tenga `users.read`; el menú solo muestra secciones permitidas.

## Datos
Sin tablas nuevas (usa `users`, `roles`, `permissions`, `user_roles`, `audit_logs` de 001).
Una restricción nueva para AC8 se resuelve en el service, no en BD.

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| POST | `/api/webhooks/clerk` | firma svix | evento Clerk | 200 |
| GET | `/api/users` | `users.read` | — | `[{id,name,email,isActive,roles[]}]` |
| POST | `/api/users/invite` | `users.create` | `{email,name,roleId}` | 201 `{id}` |
| PATCH | `/api/users/[id]` | `users.update` | `{name?,roleId?}` | 200 |
| POST | `/api/users/[id]/deactivate` | `users.deactivate` | — | 200 |
| POST | `/api/users/[id]/reactivate` | `users.deactivate` | — | 200 |
| GET | `/api/me` | sesión | — | `{id,name,email,permissions[]}` |

Errores comunes: 401 sin sesión, 403 sin permiso o inactivo, 400 Zod `{error,fields}`.

## Reutilizar
- Esquema y tipos de 001 (`users`, `userRoles`…), `PERMISSIONS`/`PermissionCode` de `src/lib/permissions.ts`.
- `components/ui` ya instalados (table, dialog, form, select, badge, input, button).
- Skills `clerk-setup`, `clerk-nextjs-patterns`, `clerk-webhooks`, `security-review`.
- Referencia legacy: `FarmaciaPOS.API/Controllers/UsuariosController.cs`, `pages/Login`, `pages/Admin`.

## Tareas
- [x] T1 — `ClerkProvider` (localización es) + `proxy.ts` con rutas públicas · `src/app/layout.tsx`, `src/proxy.ts`
- [x] T2 — Página `/sign-in` sin registro · `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- [x] T3 — Errores tipados (`UnauthorizedError`, `ForbiddenError`, `ValidationError`) y wrapper `handle()` que los mapea a respuestas · `src/lib/errors.ts`, `src/lib/api-handler.ts`
- [x] T4 — Repositorio de usuarios/permisos: buscar por clerk_id/email, permisos efectivos, CRUD de roles de usuario, contar admins activos · `src/server/repositories/user.repository.ts`
- [x] T5 — `requirePermission(code)`: sesión Clerk → fila en BD → `is_active` → permiso; devuelve el usuario actual · `src/lib/auth.ts`
- [x] T6 — `writeAudit(tx, entry)` append-only, sin PII ni secretos · `src/lib/audit.ts`
- [x] T7 — Webhook Clerk con `verifyWebhook`: upsert por clerk_id; reconcilia `pending:<email>`; `user.deleted` solo marca `is_active=false` · `src/app/api/webhooks/clerk/route.ts`
- [x] T8 — Service de usuarios: invitar, cambiar rol, desactivar/reactivar con ban+revocación en Clerk y regla AC8, todo auditado · `src/server/services/user.service.ts`
- [x] T9 — Schemas Zod de usuarios · `src/modules/users/schemas.ts`
- [x] T10 — Route Handlers de usuarios y `/api/me` · `src/app/api/users/**`, `src/app/api/me/route.ts`
- [x] T11 — Cliente axios (401 → `/sign-in`), QueryClientProvider, servicio y hooks de usuarios · `src/lib/axios.ts`, `src/components/providers/`, `src/modules/users/{services,hooks}`
- [x] T12 — Hook `usePermissions` (desde `/api/me`) y componente `<Can permission>` · `src/modules/auth/`
- [x] T13 — Layouts `(pos)` y `(admin)` con navegación filtrada por permisos y botón de salir · `src/app/(pos)/layout.tsx`, `src/app/(admin)/admin/layout.tsx`
- [x] T14 — Página `/admin/users`: tabla, diálogo de invitar, cambiar rol, desactivar/reactivar con confirmación · `src/app/(admin)/admin/users/page.tsx`, `src/modules/users/components/`
- [x] T15 — Tests de lógica pura: regla AC8 (`canRemoveAdmin`) · `src/server/services/user.rules.test.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Requiere del usuario: app Clerk creada, registro público desactivado (solo email + contraseña), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, y endpoint de webhook apuntando a `<URL>/api/webhooks/clerk` con `CLERK_WEBHOOK_SIGNING_SECRET`. En local, el webhook necesita túnel (`clerk` CLI o ngrok); sin él, el primer login del super admin se reconcilia igual por el fallback de `requirePermission` (si no hay fila por clerk_id, busca por email verificado y la adopta).
- Permisos se leen de BD en cada request (sin caché) para que cambios de rol y bajas apliquen de inmediato. Si el costo duele, caché corta por usuario después.
- Invitación: Clerk envía el correo; la fila local se crea al invitar (no al aceptar) para poder asignar rol de antemano.
- Contraseña de usuarios del sistema legacy no se migra: todos entran por invitación nueva.

## Estado de implementación
Código completo (T1-T15). `typecheck`, `lint`, `test` (7/7) y `build` pasan; el build se probó con claves de Clerk falsas.
AC1-AC10 verificados a mano con Clerk real (login admin, invitación y alta de cajero, desactivar/reactivar, auto-desactivación, `/admin` como cajero) y contra la BD (`audit_logs`, adopción de `clerk_id`).
Review: 2 vueltas (ronda 1: 1 bloqueante + 3 mayor corregidos; ronda 2: 1 mayor, la carrera del último admin en `lockActiveAdmins`, corregida por decisión del humano con lock y conteo en sentencias separadas, sin tercera vuelta).

## Desviaciones
- `GET /api/users` devuelve `{ users, roles }` (el diálogo de invitar necesita la lista de roles); no hay endpoint `/api/roles` aún.
- Páginas extra: `/accept-invite` (destino del enlace de invitación; es un `<SignUp>` que solo funciona con ticket) y `/no-access` (sesión Clerk válida pero sin fila activa; evita un bucle de redirección con `/sign-in`).
- El webhook solo reconcilia usuarios ya invitados; un alta sin invitación no crea fila y recibe 403 en cada endpoint.
- `user.deleted` desactiva la fila (no la borra) y audita con `actor_id` nulo.
- "Último admin" se cuenta por el slug `admin` en la regla (`user.rules.ts`), sin lock; documentado con `ponytail:` en el service.
- Si Clerk falla tras desactivar en BD: el acceso ya está cortado, se audita `user.deactivate_clerk_failed` y volver a desactivar reintenta ban y revocación.
- `next.config.ts`: se quitaron `cacheComponents` y `partialPrefetching` (scaffold); app 100% autenticada y dinámica.

- Webhook de Clerk sin configurar en el dashboard: el flujo funciona por el fallback de `requirePermission`. Al desplegar, registrar `<URL>/api/webhooks/clerk` y poner `CLERK_WEBHOOK_SIGNING_SECRET`.
- La carrera del último admin se corrigió pero no se probó con dos transacciones concurrentes reales (solo hay un admin en la BD).
