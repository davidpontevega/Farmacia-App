# Despliegue en Vercel

Proyecto: `farmacia-app` (equipo TECSUP). Dirección pública: **https://nicfarma.vercel.app**
(`farmacia.vercel.app` la usa otro proyecto). Se despliega solo al subir a `main` de
`davidpontevega/Farmacia-App`.

## Ajustes del proyecto
- **Root Directory:** `.` (por defecto). La app está en la raíz de este repositorio; poner otra carpeta hace fallar el despliegue con «Root Directory does not exist».
- Framework: Next.js · Node 24.x · región de funciones `iad1` (la base de Neon está en `us-east-2`).
- **Deployment Protection (Vercel Authentication): desactivada.** La app tiene su propio inicio de
  sesión (Clerk, solo por invitación) y la protección de Vercel bloquearía a los cajeros y al webhook de Clerk.

## Variables de entorno (Production)
| Variable | Notas |
|---|---|
| `DATABASE_URL` | Neon. Secreta. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Claves de Clerk. Hoy son de **desarrollo** (`pk_test_`): sirven para el piloto, con aviso «modo desarrollo» y tope de 100 usuarios. Para producción real: instancia de producción de Clerk con dominio propio. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_APP_URL` | Dirección pública de la app; las invitaciones de usuario la usan. Si cambia el dominio, actualizarla. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Del endpoint del webhook de Clerk (ver abajo). |
| `BLOB_READ_WRITE_TOKEN` | Blob store **privado** (constancias de pago). Secreta. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Lectura de recetas por foto (piloto). Sin la clave el botón no aparece. |
| `CRON_SECRET` | Protege `/api/cron/purge-proofs` (borrado de constancias y consultas viejas, diario 08:00 UTC). |
| `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_TAGLINE` | Opcionales (por defecto NicFarma). |

Después de cambiar una variable hay que **redesplegar** para que se aplique.

## Webhook de Clerk
Panel de Clerk → Webhooks → Add endpoint: `https://<dirección>/api/webhooks/clerk`, eventos
`user.created`, `user.updated`, `user.deleted`. Copiar el *signing secret* a `CLERK_WEBHOOK_SIGNING_SECRET`.

## Base de datos
Las migraciones no corren solas en el despliegue: `npm run db:migrate` (con `DATABASE_URL` de la base destino).
`npm run db:permissions` sincroniza permisos nuevos sin tocar datos. No usar `db:seed` completo en una base real
(reinserta productos de ejemplo).

## Pasar de piloto a uso real
Hoy el piloto y el desarrollo local comparten la misma base de Neon. Antes de empezar con ventas reales:
1. Crear una rama de respaldo en Neon.
2. Vaciar los datos de prueba con un script revisado (ventas, devoluciones, turnos y movimientos de caja,
   faltantes, consultas sin resultado, constancias en Blob), probado antes dentro de una transacción que se revierte.
3. Decidir qué se hace con productos y lotes, y hacer un inventario físico: el stock se calcula con lotes y ventas.
4. Cambiar a claves de producción de Clerk (dominio propio) cuando haya más de 100 usuarios o se quiera quitar el aviso.
