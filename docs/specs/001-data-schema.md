---
id: 001
title: Esquema de datos (Drizzle + Neon)
status: in-review
module: shared
scope: both
---

# 001 — Esquema de datos

## Objetivo
El sistema tiene todas las tablas de la farmacia en Neon, definidas en Drizzle y migradas, para que los módulos posteriores (auth, POS, caja, compras) solo escriban repositorios.

## Alcance
Incluye: schema Drizzle, cliente `db`, migración inicial, seed (permisos, roles, datos ficticios), `.env.local` con `DATABASE_URL`.
No incluye: repositorios, Route Handlers, UI, webhook de Clerk, lógica FEFO (spec propio; aquí solo la tabla y el índice que la sirve).

## Criterios de aceptación
- [x] AC1 — Dado un Neon vacío, cuando corre `npm run db:migrate`, entonces existen todas las tablas de la sección Datos.
- [x] AC2 — Dado el seed, cuando corre `npm run db:seed` dos veces, entonces no duplica filas (idempotente) y crea permisos, roles `admin`/`cashier` y ≥10 productos con lotes ficticios.
- [x] AC3 — Todo monto es `integer` en centavos; ninguna columna `real`/`numeric`/`float`.
- [x] AC4 — Dos turnos `OPEN` del mismo usuario son rechazados por la BD (índice único parcial).
- [x] AC5 — Una venta cuyo `cash_amount + yape_amount != total` es rechazada por la BD (CHECK).
- [x] AC6 — `npm run typecheck` pasa y los tipos exportados salen de `InferSelectModel`.

## Datos
Todas requieren migración (proyecto nuevo). IDs `uuid` default `gen_random_uuid()`; fechas `timestamptz` default `now()`. Tablas snake_case plural en inglés (convención de SETUP).

**Acceso**
- `users`: clerk_id (único), email (único), name, is_active (def. true), created_at, updated_at.
- `roles`: slug (único), name, description, is_system.
- `permissions`: code (único, `<recurso>.<acción>`), resource, action, description.
- `role_permissions`: PK (role_id, permission_id). `user_roles`: PK (user_id, role_id), assigned_by, assigned_at.
- `audit_logs`: según SETUP §5.2 de ecommerce: actor_id null, action, entity_type, entity_id, changes jsonb, metadata jsonb, severity enum(info|warning|error), created_at. Índices (entity_type, entity_id), (actor_id, created_at desc), (created_at desc). Sin ip/user_agent.

**Catálogo e inventario**
- `products`: commercial_name, generic_name?, laboratory?, category?, barcode? (único), sale_price int, min_stock int def. 0, is_active, created_by→users, created_at, updated_at.
- `lots`: product_id, lot_number, expiry_date date, purchase_price int, initial_quantity int, is_active, created_by, created_at. Único (product_id, lot_number). Índice (product_id, expiry_date) para FEFO.
- `inventory_movements`: product_id, lot_id, user_id, type enum(ENTRY|EXIT|RETURN|ADJUSTMENT), quantity int (con signo: EXIT negativo), reason, reference_id uuid?, created_at. Índice (lot_id).
- Stock de un lote = SUM(quantity) de sus movimientos; no hay columna `stock`. Vista `lot_stock` (lot_id, product_id, lot_number, expiry_date, stock). Vista `product_stock` (product_id, stock).

**Caja**
- `cash_shifts`: user_id, opening_amount int, closing_amount int?, system_amount int?, difference int?, total_cash int def. 0, total_yape int def. 0, opened_at, closed_at?, status enum(OPEN|CLOSED). Único parcial (user_id) WHERE status='OPEN'.
- `cash_movements`: shift_id, user_id, type enum(CASH_WITHDRAWAL|YAPE_TO_CASH_EXCHANGE), amount int > 0, reason, created_at.

**Ventas y devoluciones**
- `sales`: user_id, shift_id, ticket_number (único), subtotal, discount, total (int), payment_method enum(CASH|YAPE|MIXED), cash_amount, yape_amount, status enum(COMPLETED|VOIDED), created_at. CHECK cash_amount + yape_amount = total; CHECK total = subtotal − discount. Índice (shift_id), (created_at desc).
- `sale_items`: sale_id, product_id, lot_id, quantity > 0, unit_price, subtotal (precio congelado).
- `returns`: sale_id, user_id, reason, refunded_amount int, created_at.
- `return_items`: return_id, product_id, lot_id, quantity > 0, unit_price, product_condition enum(GOOD|DAMAGED|EXPIRED).

**Compras**
- `purchases`: user_id, supplier?, document_number?, total int, created_at.
- `purchase_items`: purchase_id, product_id, lot_id, quantity > 0, purchase_price, sale_price int?.

## API
Sin endpoints.

## Reutilizar
- `drizzle.config.ts` (ya apunta a `src/server/db/schema`), `.env.example`, scripts `db:*`.
- `@neondatabase/serverless`, `drizzle-orm`, `dotenv`, `tsx` ya instalados.
- Esquema legacy de referencia: `../FarmaciaPOS.Core/Entities/*.cs`.

## Tareas
- [x] T1 — Cliente Drizzle + Neon que lanza error claro si falta `DATABASE_URL` · `src/server/db/index.ts`
- [x] T2 — Enums compartidos (pgEnum) y helpers de columnas (id, timestamps) · `src/server/db/schema/_shared.ts`
- [x] T3 — Tablas de acceso: users, roles, permissions, role_permissions, user_roles · `src/server/db/schema/{user,role,permission,role-permission,user-role}.ts`
- [x] T4 — audit_logs · `src/server/db/schema/audit-log.ts`
- [x] T5 — products, lots, inventory_movements · `src/server/db/schema/{product,lot,inventory-movement}.ts`
- [x] T6 — Vistas lot_stock y product_stock (`pgView`) · `src/server/db/schema/stock-views.ts`
- [x] T7 — cash_shifts (con índice único parcial) y cash_movements · `src/server/db/schema/{cash-shift,cash-movement}.ts`
- [x] T8 — sales y sale_items con CHECK de montos · `src/server/db/schema/{sale,sale-item}.ts`
- [x] T9 — returns, return_items, purchases, purchase_items · `src/server/db/schema/{return,return-item,purchase,purchase-item}.ts`
- [x] T10 — Barrel + tipos inferidos exportados · `src/server/db/schema/index.ts`
- [x] T11 — Constantes de permisos (`PERMISSIONS`) por recurso: products, lots, inventory, sales, cash, returns, purchases, users, roles, audit, reports · `src/lib/permissions.ts`
- [x] T12 — Seed idempotente: permisos desde `PERMISSIONS`, roles `admin` (todos) y `cashier` (sales.create, sales.read, cash.*, returns.create, products.read, inventory.read), 10 productos con 2 lotes · `src/server/db/seed.ts`
- [x] T13 — Migración `drizzle/0000_*.sql` aplicada en Neon (17 tablas, 2 vistas)
- [x] T14 — Test de `PERMISSIONS`: códigos únicos y con formato `recurso.acción` · `src/lib/permissions.test.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Requiere que el usuario cree el proyecto Neon y ponga `DATABASE_URL` en `.env.local` antes de T13.
- Stock derivado de movimientos evita doble fuente de verdad, pero la venta debe bloquear lotes (`SELECT … FOR UPDATE`) para no sobrevender: eso es del spec de ventas.
- `product_condition` replica `estado_producto` del legacy; valores GOOD|DAMAGED|EXPIRED son supuesto, confirmar con la UI de Devoluciones.
- La contraseña ya no existe en `users`: la maneja Clerk.
- Desviación T1: cliente con `drizzle-orm/neon-serverless` (Pool/WebSocket), no `neon-http`: el http no soporta `db.transaction`, exigido para ventas/caja.
- Desviación T12: el seed crea el super admin con `clerk_id = pending:<email>` (requiere `SUPER_ADMIN_EMAIL`); el webhook de Clerk lo reconcilia por email.
- `drizzle.config.ts` apunta a `schema/index.ts` (no al directorio): con el directorio, drizzle-kit ve las vistas duplicadas.
- `products.barcode` se eliminó en el spec 003 (migración `0003`): el flujo de venta del sistema antiguo no lo usa.
