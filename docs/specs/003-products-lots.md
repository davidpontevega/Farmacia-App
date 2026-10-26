---
id: 003
title: Productos, lotes e inventario
status: done
module: products
scope: both
---

# 003 — Productos, lotes e inventario

## Objetivo
Un administrador mantiene el catálogo, da de alta lotes con vencimiento, ajusta stock y consulta el kardex; cualquier usuario con permiso ve el catálogo con su stock y su estado (agotado, bajo, por vencer, vencido).

## Alcance
Incluye: CRUD de productos (sin borrado: se desactivan), listado con búsqueda, paginación y estado de stock, alta manual de lote con su movimiento de entrada, ajuste de stock por lote, kardex, utilidades de dinero (soles ↔ centavos).
No incluye: selección FEFO y descuento de stock en ventas (spec de ventas, que sigue el flujo del sistema antiguo), registro de lotes desde facturas de compra (spec de compras, que reutilizará `createLot`), gestión de roles.

## Criterios de aceptación
- [x] AC1 — Dado un admin, cuando crea un producto con nombre y precio en soles (ej. `2.50`), entonces se guarda `sale_price = 250` y la tabla lo muestra `S/ 2.50`.
- [x] AC2 — Precio negativo o nombre vacío se rechazan con 400 por Zod.
- [x] AC3 — Dado un producto, cuando el admin crea un lote (número, vencimiento futuro, costo, cantidad > 0), entonces existen el lote y un movimiento `ENTRY` con esa cantidad, y el stock del producto sube en ese número, todo en una transacción y con `audit_logs`.
- [x] AC4 — Un lote con número repetido para el mismo producto se rechaza con 409; vencimiento pasado o cantidad ≤ 0, con 400.
- [x] AC5 — Dado un lote con stock 20, cuando el admin ajusta `-5` con motivo, entonces el stock queda en 15 y el movimiento `ADJUSTMENT` guarda `-5`; ajustar `-25` se rechaza (400) y el stock no cambia.
- [x] AC6 — Dos ajustes simultáneos sobre el mismo lote no pueden dejar el stock negativo (el segundo ve el stock ya actualizado).
- [x] AC7 — El listado muestra por producto: stock total, stock mínimo, próximo vencimiento (solo lotes con stock > 0) y un estado `Agotado | Vencido | Por vencer (≤ 30 días) | Stock bajo | OK`, con prioridad en ese orden.
- [x] AC8 — La búsqueda `q` filtra por nombre comercial o genérico sin distinguir mayúsculas; el listado se pagina (50 por página) y devuelve el total.
- [x] AC9 — El kardex lista movimientos (fecha, producto, lote, tipo, cantidad con signo, motivo, usuario) filtrables por producto y rango de fechas, máximo 200 filas, y solo lo ve quien tiene `inventory.kardex`.
- [x] AC10 — Un cajero ve `/admin/products` en solo lectura (sin botones de crear/editar) y no puede abrir `/admin/inventory` ni los endpoints de lotes, ajustes o kardex (403).
- [x] AC11 — Desactivar un producto no borra nada: deja de aparecer por defecto en el listado, y se puede reactivar.

## Datos
Sin tablas ni migraciones: usa `products`, `lots`, `inventory_movements`, `lot_stock`, `product_stock` de 001.
Migración `0003`: elimina `products.barcode` y su restricción única (ver Desviaciones).
Un permiso nuevo en código: `inventory.kardex` (en `PERMISSION_ACTIONS`). Hay que volver a correr `npm run db:seed` para registrarlo y asignarlo a `admin`; el cajero no lo recibe.
Cantidad de ajuste: entero con signo ≠ 0. Dinero siempre en centavos.

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| GET | `/api/products?q&page&includeInactive` | `products.read` | query | `{items:[{id,commercialName,genericName,laboratory,category,salePrice,minStock,isActive,stock,nextExpiry,status}], total}` |
| POST | `/api/products` | `products.create` | `{commercialName,genericName?,laboratory?,category?,salePrice,minStock}` | 201 `{id}` |
| PATCH | `/api/products/[id]` | `products.update` | campos anteriores + `isActive` (parcial) | 200 |
| GET | `/api/products/[id]/lots` | `lots.read` | — | `[{lotId,lotNumber,expiryDate,purchasePrice,stock}]` |
| POST | `/api/products/[id]/lots` | `lots.create` | `{lotNumber,expiryDate,purchasePrice,quantity}` | 201 `{id}` |
| POST | `/api/inventory/adjustments` | `inventory.adjust` | `{lotId,quantity,reason}` | 200 `{stock}` |
| GET | `/api/inventory/kardex?productId&from&to` | `inventory.kardex` | query | `[{id,createdAt,productName,lotNumber,type,quantity,reason,userName}]` |

Los precios viajan en centavos (enteros); la UI convierte. Errores: 401, 403, 400 (Zod, `{error,fields}`), 404, 409.

## Reutilizar
- `handle`, `requirePermission`, `writeAudit`, errores tipados (`src/lib/`), `Executor`/`db.transaction` (002).
- Esquema, tipos inferidos y vistas de 001; patrón de repositorio de `user.repository.ts`.
- Patrón de módulo, hooks y diálogos de `src/modules/users/` (react-hook-form + zod, `<Can>`, `usePermissions`, toasts, `AppShell`).
- `NAV_ITEMS` en `src/lib/nav.ts`; tabla, diálogo, badge, skeleton de `components/ui`.

## Tareas
- [x] T1 — Utilidades de dinero: `toCents("2.50") → 250`, `formatSoles(250) → "S/ 2.50"`, rechazan formatos inválidos · `src/lib/money.ts`, `src/lib/money.test.ts`
- [x] T2 — Regla pura `getStockStatus({stock,minStock,nextExpiry,today})` y constante `EXPIRING_DAYS = 30` · `src/server/services/stock.rules.ts`, `stock.rules.test.ts`
- [x] T3 — Regla pura `canAdjust(currentStock, delta)` (resultado ≥ 0, delta ≠ 0) · `src/server/services/stock.rules.ts` (+ test)
- [x] T4 — Permiso `inventory.kardex` en `PERMISSION_ACTIONS` y actualización de su test · `src/lib/permissions.ts`
- [x] T5 — Repositorio de productos: listar con búsqueda/paginación/stock/próximo vencimiento, buscar por id, crear, actualizar · `src/server/repositories/product.repository.ts`
- [x] T6 — Repositorio de inventario: lotes de un producto con stock, crear lote, bloquear lote (`FOR UPDATE`) y leer su stock, insertar movimiento, kardex con filtros · `src/server/repositories/inventory.repository.ts`
- [x] T7 — Service de productos: crear y actualizar con auditoría (precio antes/después) · `src/server/services/product.service.ts`
- [x] T8 — Service de inventario: `createLot` (lote + movimiento `ENTRY` + audit en transacción, reutilizable por compras) y `adjustStock` (bloqueo del lote, `canAdjust`, movimiento, audit) · `src/server/services/inventory.service.ts`
- [x] T9 — Schemas Zod de productos, lotes y ajustes · `src/modules/products/schemas.ts`, `src/modules/inventory/schemas.ts`
- [x] T10 — Route Handlers de productos y lotes · `src/app/api/products/**`
- [x] T11 — Route Handlers de ajustes y kardex · `src/app/api/inventory/**`
- [x] T12 — Servicios axios y hooks (TanStack Query) de productos e inventario · `src/modules/{products,inventory}/{services,hooks}`
- [x] T13 — Página `/admin/products`: tabla con búsqueda, paginación, badge de estado, diálogo crear/editar, activar/desactivar · `src/app/(admin)/admin/products/page.tsx`, `src/modules/products/components/`
- [x] T14 — Página `/admin/inventory`: selector de producto, lotes con stock, diálogos «Nuevo lote» y «Ajustar», pestaña Kardex · `src/app/(admin)/admin/inventory/page.tsx`, `src/modules/inventory/components/`
- [x] T15 — Guardas por página en el área admin: cada página exige su permiso (`redirect('/pos')`); el layout solo exige alguno de los permisos del área; `NAV_ITEMS` suma Productos (`products.read`) e Inventario (`lots.read`) · `src/lib/auth.ts`, `src/app/(admin)/admin/layout.tsx`, `src/lib/nav.ts`, páginas de usuarios
- [x] T16 — Re-correr `db:seed` y actualizar README (estado del spec 003) · `README.md`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Decisión a confirmar: el legacy dejaba el alta de lotes solo para Compras. Aquí el admin también puede crear un lote a mano con su cantidad inicial, para poder cargar stock sin esperar al módulo de compras; compras reutilizará `createLot`.
- Decisión a confirmar: el cajero ve el catálogo en solo lectura (tiene `products.read`); lotes, ajustes y kardex son solo admin. Esto cambia el guard de `/admin` definido en 002: antes exigía `users.read` y ahora cada página exige su propio permiso (AC10 de 002 se mantiene: un cajero en `/admin/users` va a `/pos`).
- El stock de lotes vencidos cuenta en el total mostrado; excluirlo de la venta es trabajo del spec de ventas (FEFO).
- Búsqueda con `ILIKE`, sin índice trigram: suficiente para un catálogo de miles. Si se vuelve lenta, añadir `pg_trgm`.
- `products.delete` existe como permiso pero no se usa: los productos no se borran porque ventas y movimientos los referencian.

## Estado de implementación
Código completo (T1-T16). `typecheck`, `lint`, `test` (20/20) y `build` pasan.
AC1, AC3-AC9 y AC11 verificados contra Neon con un script que ejercita servicios y repositorios (se limpió después), incluido AC6: 4 ajustes concurrentes de -10 sobre un lote con 15 unidades, pasó 1 y el stock quedó en 5.
AC10 y la parte de UI de los demás (formularios, tablas, redirecciones) pendientes de prueba manual en el navegador.

## Desviaciones
- Las reglas puras viven en `src/lib/stock.ts` (no en `server/services/stock.rules.ts`): la UI también usa los tipos y no debe importar de `server/`.
- Se añadió `src/lib/schemas.ts` (`uuidSchema`) para los `[id]`; ya no se reutiliza `userIdSchema` de usuarios.
- `src/lib/dates.ts` y `src/lib/use-debounce.ts` son utilidades nuevas no listadas (fechas en hora de Lima, búsqueda con espera).
- `createLotIn(tx, …)` se exporta además de `createLot`: compras podrá registrar varios lotes en una sola transacción.
- Los 4 movimientos que lista el kardex en la prueba (2 entradas, 1 ajuste manual, 1 ajuste concurrente) coinciden con lo esperado.
- **Código de barras eliminado** (decisión del usuario tras la prueba manual): la venta sigue el flujo del sistema antiguo y no lo usa. Se quitó de esquema (migración `0003`), API, formularios, búsqueda y seed. El seed, sin clave única natural, pasó a ser idempotente por nombre comercial. Se perdió el código del único producto creado a mano en la prueba; el producto se conserva.
- AC2 original (409 por código duplicado) ya no aplica; AC1/AC3-AC9/AC11 se verificaron antes del cambio y el cambio no los toca (typecheck, lint, 20 tests, build y seed doble pasan).

## Review
Reviewer: APROBADO en la primera vuelta (sin bloqueantes ni mayores). Menores corregidos: orden estable del listado (`commercialName, id`), tope de `page`, validación `from <= to` del kardex, `/admin` sin 500 para sesión caída, `KARDEX_LIMIT` movido a `src/lib/constants.ts`.
Menores diferidos: (a) el listado agrega `lot_stock` completo dos veces (subconsulta de vencimiento + `product_stock`); acotarlo a los ids de la página si el historial de movimientos crece; (b) en `updateProduct` el `findById` queda fuera de la transacción, así que dos PATCH simultáneos pueden auditar un `from` desactualizado (sin riesgo para los datos).
**Para el spec de ventas:** toda venta debe bloquear cada lote con `lockLot` (`FOR UPDATE`) antes de descontar; AC6 (stock nunca negativo) solo se sostiene si ventas y ajustes usan el mismo bloqueo.
AC10 verificado a mano (cajero) por el usuario. Spec cerrado.
