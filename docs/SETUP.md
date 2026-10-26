# SETUP — Farmacia POS

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind 4 ·
shadcn/ui · Neon Postgres · Drizzle ORM · Clerk · TanStack Query v5 + Table ·
Axios · Zustand · Recharts · Zod · React Hook Form · npm.

## Variables de entorno
Ver `.env.example`. `.env.local` no se commitea. Nunca pegar claves reales en el repo.

## Carpetas

```
src/
  app/
    (pos)/            cajero: pos/, caja/, devoluciones/, consulta/
    (admin)/admin/    dashboard, products, inventory, purchases, users, roles, audit-logs, reports
    (auth)/           sign-in
    api/              Route Handlers - única API
  modules/<dominio>/  components · hooks · services · schemas · store · types
                      dominios: products, inventory, sales, cash, purchases, returns, consult, users, dashboard
  server/
    db/               index.ts (Drizzle+Neon) · schema/ (una tabla por archivo) · seed.ts
    repositories/     <dominio>.repository.ts
    services/         reglas que cruzan repositorios (p. ej. sale.service.ts: venta + FEFO + caja en tx)
  components/{ui,shared,providers}
  lib/                axios, query-client, utils, auth, permissions, audit, errors
  proxy.ts            Clerk: rutas públicas / protegidas / admin
```

En Next 16 el middleware se llama `proxy.ts`.

## Modelo de datos (esbozo, cada spec lo detalla)
- Acceso: `users` (clerk_id, email, is_active), `roles`, `permissions` (code `<recurso>.<acción>`),
  `role_permissions`, `user_roles`, `audit_logs`.
- Catálogo: `products`, `lots` (vencimiento, stock por lote), `inventory_movements`.
- Ventas: `sales`, `sale_items` (lot_id, precio congelado), pago mixto efectivo + Yape.
- Caja: `cash_shifts` (turnos), `cash_movements`.
- Otros: `purchases`/`purchase_items`, `returns`.
- Permisos nacen del código (seed); roles ADMIN y CAJERO se componen desde la UI.

## Flujo de datos
Server Component -> repositorio (lectura inicial). Client: hook -> service (axios) ->
Route Handler (Clerk + Zod + `requirePermission`) -> repositorio -> Drizzle -> Neon.

## Pruebas
`<archivo>.test.ts` junto al archivo. Solo funciones puras. Runner: `node:test` + `tsx`.
