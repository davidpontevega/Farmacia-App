# CLAUDE.md — Farmacia POS (Next.js)

Reescritura de `FarmaciaPOS.*` (.NET + Supabase REST) al stack del ecommerce.
Punto de venta de farmacia: productos y lotes (FEFO), ventas, caja, compras,
devoluciones, consulta de medicamentos, reportes. Usuarios: `ADMIN` y `CAJERO`.

## 1. Regla de entrada

Toda petición se clasifica primero con el agente `orchestrator` (`SDD` o `BUILD`).
Excepción: el usuario indica el modo. En SDD: `spec` -> **aprobación humana** ->
`developer` ⇄ `reviewer` (máx. 2 vueltas) -> done. Agentes en `.claude/agents/`;
specs en `docs/specs/NNN-slug.md` (nada de código sobre un spec en `draft`).

## 2. Arquitectura

Estructura y flujo en [docs/SETUP.md](docs/SETUP.md). Resumen:

```
Componente -> hook (TanStack Query) -> service (axios) -> Route Handler
           -> repositorio -> Drizzle -> Neon Postgres
```

Reglas duras (bloqueantes en review):

1. Componentes nunca importan `db`/Drizzle/repositorios ni llaman `axios`/`fetch`.
2. Toda consulta a BD vive en `src/server/repositories/`.
3. Todo Route Handler valida entrada con Zod antes de tocar datos.
4. Tipos inferidos del schema Drizzle, no duplicados.
5. Datos de servidor -> TanStack Query; estado de UI -> Zustand.
6. Autorización por **código de permiso** (`requirePermission('sales.create')`),
   nunca por nombre de rol. `requirePermission` consulta `users.is_active` en BD:
   un usuario desactivado pierde acceso aunque su token de Clerk siga vivo.
7. `audit_logs` append-only, en la misma transacción que la mutación. Sin PII ni secretos.
8. **Ventas, caja y stock siempre dentro de `db.transaction`** (venta + detalles +
   descuento de lotes FEFO + movimiento de inventario es una unidad atómica).
9. Dinero en enteros (centavos). Nunca `float`.

## 3. Auth

Clerk autentica (correo + contraseña, sin registro público, solo por invitación del
admin); Postgres autoriza (roles/permisos). Baja de un trabajador = `is_active=false`
en BD + ban y revocación de sesiones en Clerk + entrada en `audit_logs`. Nunca se
borra un usuario: ventas y turnos de caja lo referencian.

## 4. Estándares

TypeScript estricto (cero `any`/`@ts-ignore`) · SOLID/DRY a la tercera repetición ·
estados de carga y error en toda vista con datos · errores nunca tragados ·
componentes shadcn vía `npx shadcn@latest add` · comentarios solo para el porqué.
Tests: `node:test` co-localizados `<archivo>.test.ts`, solo funciones puras
(FEFO, totales, descuentos, cuadre de caja).

Verificación antes de cerrar: `npm run typecheck && npm run lint && npm run build`

## 5. Comandos

`npm run dev` · `build` · `typecheck` · `lint` · `test` ·
`db:generate` · `db:migrate` · `db:push` · `db:studio` · `db:seed`

`.npmrc` fija `legacy-peer-deps=true` (peers opcionales de `@hookform/resolvers` chocan con zod).

## 6. Skills

Antes de escribir APIs que cambian rápido (Next 16, Clerk, Drizzle/Neon), revisa si
hay skill instalada: `clerk-setup`, `clerk-nextjs-patterns`, `clerk-webhooks`,
`vercel:nextjs`, `vercel:shadcn`, `dataviz` (Recharts), `security-review`
(auth/permisos). No inventes nombres. Si una skill contradice `docs/SETUP.md`, gana este.
