---
id: 005
title: Ventas y punto de venta (POS)
status: done
module: sales
scope: both
---

# 005 — Ventas y punto de venta

## Objetivo
Un cajero con turno abierto busca productos, arma el carrito, cobra en efectivo, Yape/Plin o mixto, y el sistema registra la venta con su ticket, descuenta el stock de los lotes que vencen primero (FEFO) y suma el cobro al turno, todo o nada.

## Alcance
Incluye: pantalla POS (buscador, carrito, resumen, modal de pago), creación de venta con FEFO y ticket, anulación de ventas (admin) que devuelve el stock, detalle de una venta, lista de ventas del turno en `/caja`, y una lista de ventas por fecha para el admin con el botón de anular.
No incluye: devoluciones parciales por ticket (spec de devoluciones), descuentos (el sistema antiguo los dejaba siempre en 0), impresión de ticket (el antiguo solo mostraba un aviso), reportes de ventas, búsqueda por código de barras (se eliminó en 003).

## Flujo del sistema antiguo que se conserva
- Sin turno abierto no se vende; el POS lo indica y lleva a abrir el turno.
- Búsqueda de producto por texto (desde 2 letras) y carrito con +/− y quitar.
- Una venta puede repartir un producto entre varios lotes; cada reparto es una línea con su salida de inventario («Venta <ticket>»).
- Métodos de pago: Efectivo, Yape / Plin, Mixto; el modal calcula el vuelto.
- Anular es solo de admin y devuelve el stock a cada lote.

## Criterios de aceptación
- [x] AC1 — Sin turno abierto, `/pos` muestra «No hay turno de caja abierto» con enlace a `/caja`, y `POST /api/sales` responde 409.
- [x] AC2 — El buscador consulta desde 2 caracteres, solo muestra productos activos con nombre, genérico · laboratorio, precio y stock; un producto con stock 0 aparece como «Agotado» y no se puede agregar.
- [x] AC3 — El carrito permite agregar, subir/bajar cantidad (nunca por encima del stock mostrado), quitar y limpiar; el total se actualiza en vivo.
- [x] AC4 — Pago en efectivo: con total `S/ 12.50` y recibido `S/ 20.00`, la venta queda `COMPLETED` con `cash_amount = 1250`, `yape_amount = 0`, y el modal muestra vuelto `S/ 7.50`; recibido menor que el total no deja confirmar.
- [x] AC5 — Pago Yape/Plin: `yape_amount = total`, `cash_amount = 0`.
- [x] AC6 — Pago mixto: con total `S/ 12.50`, Yape `S/ 5.00` y efectivo recibido `S/ 10.00`, se guarda `yape_amount = 500`, `cash_amount = 750` (lo neto) y el vuelto es `S/ 2.50`; el Yape debe ser mayor que 0 y menor que el total, y el efectivo recibido debe cubrir el resto.
- [x] AC7 — FEFO: producto con lote A (vence antes, 3 u.) y lote B (vence después, 10 u.); vender 5 genera dos líneas (3 de A, 2 de B) y dos movimientos `EXIT` negativos con motivo «Venta B001-…»; nunca se usa un lote vencido ni sin stock.
- [x] AC8 — Stock insuficiente: responde 409 «Stock insuficiente: <producto> (disponible n)» y no se guarda nada (ni venta, ni líneas, ni movimientos).
- [x] AC9 — El precio y el total los calcula el servidor con el precio vigente del producto. El cliente envía el total que vio (`expectedTotal`); si no coincide, 409 «Los precios cambiaron» sin guardar nada, y el POS refresca precios.
- [x] AC10 — Dos ventas simultáneas de las últimas 5 unidades de un lote: una se confirma y la otra recibe stock insuficiente; el stock nunca queda negativo, tampoco frente a un ajuste concurrente.
- [x] AC11 — Los tickets tienen formato `B001-00000001`, son únicos y crecientes (pueden saltar números si una venta falla).
- [x] AC12 — Una venta y un cierre de turno simultáneos: la venta entra en los totales del cierre o recibe 409; nunca queda fuera del cuadre.
- [x] AC13 — Cantidad ≤ 0 o no entera, producto inexistente o inactivo, más de 100 líneas o un cuerpo inválido se rechazan (400/404); las líneas repetidas del mismo producto se suman.
- [x] AC14 — Anular (admin, `sales.void`): la venta pasa a `VOIDED`, cada lote recupera su cantidad con un movimiento `RETURN` «Anulación venta <ticket>», se audita, y deja de contar en los totales del turno si este sigue abierto; anular dos veces da 409; un cajero recibe 403.
- [x] AC15 — `GET /api/sales/[id]` devuelve la venta con sus líneas solo a su autor o a quien tenga `reports.read`; a los demás, 403.
- [x] AC16 — `/caja` lista las ventas del turno activo (ticket, hora, total, método, estado) y se actualiza al vender.
- [x] AC17 — `/admin/sales` (permiso `reports.read`) lista las ventas por rango de fechas (hoy por defecto) con ticket, cajero, total, método y estado, y permite anular con confirmación a quien tiene `sales.void`.
- [x] AC18 — Crear y anular venta dejan entrada en `audit_logs` en la misma transacción.

## Datos
Una migración (`0005`): secuencia `ticket_seq` para el número de ticket. El resto ya existe (001): `sales`, `sale_items` (una línea por lote), `inventory_movements`, y los CHECK `cash + yape = total` y `total = subtotal − descuento`.
Venta: `subtotal = total`, `discount = 0`. Cada línea guarda el precio unitario vigente.
Ticket: `B001-` + número de la secuencia con 8 dígitos. La secuencia no es transaccional: una venta que falla puede dejar un salto.

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| POST | `/api/sales` | `sales.create` | `{items:[{productId,quantity}], paymentMethod:'CASH'\|'YAPE'\|'MIXED', cashTendered?, yapeAmount?, expectedTotal}` | 201 `{id,ticketNumber,total,paymentMethod,cashAmount,yapeAmount,change,createdAt,items:[{productName,quantity,unitPrice,subtotal}]}` |
| GET | `/api/sales/[id]` | autor o `reports.read` | — | venta con líneas |
| POST | `/api/sales/[id]/void` | `sales.void` | — | 200 |
| GET | `/api/cash/shift/sales` | `cash.read` | — | ventas del turno activo del usuario |
| GET | `/api/sales?from&to` | `reports.read` | fechas `YYYY-MM-DD` | ventas del rango (máx. 200) |

Montos en centavos enteros. `cashTendered` y `yapeAmount` según método: CASH exige `cashTendered`; YAPE no lleva montos; MIXED exige ambos. Errores: 401, 403, 400 (Zod), 404, 409.

## Reutilizar
- `lockOpenShift` de `cash.service.ts` (004): bloquea el turno igual que el cierre.
- `lockLot`, `stockOfLot`, `insertMovement` de `inventory.repository.ts` y `createLotIn` (003); lógica de stock por lote (`lot_stock`).
- `handle`, `requirePermission`, `writeAudit`, errores tipados, `Executor`, `db.transaction` (002).
- `getStockStatus`/estado de stock, `toCents`, `formatSoles`, `todayLima`, `formatDateTime`, `useDebounce`, `useProducts` (003) para el buscador; `<Can>`, `usePermissions`, `AppShell`.
- Patrón de módulo/hooks/diálogos de `src/modules/cash` y `src/modules/products`.
- Referencia del legacy: `VentasController`, `pages/POS`, `components/pos/*`, `store/cartStore.js`.

## Tareas
- [x] T1 — Secuencia `ticket_seq` y migración `0005` · `src/server/db/schema/sale.ts` (o `ticket-seq.ts`), `drizzle/`
- [x] T2 — Reglas puras: `allocateFefo(lotes, cantidad)`, `resolvePayment({method,total,cashTendered,yapeAmount})` (montos netos y vuelto, o error), `formatTicket(n)` · `src/lib/sales.ts`, `src/lib/sales.test.ts`
- [x] T3 — Schemas Zod de la venta y del formulario de pago (soles) · `src/modules/sales/schemas.ts`
- [x] T4 — Repositorio de ventas: siguiente ticket, insertar venta y líneas, venta con líneas, ventas del turno, ventas por rango, bloquear venta, marcar anulada · `src/server/repositories/sale.repository.ts`
- [x] T5 — Repositorio de inventario y productos: lotes FEFO bloqueados de un producto (no vencidos, ordenados por vencimiento), stock por lote, movimientos en lote, productos activos por ids · `src/server/repositories/inventory.repository.ts`, `product.repository.ts`
- [x] T6 — Service de ventas: `createSale` (turno bloqueado, productos en orden de id, lotes bloqueados, FEFO, precios y total del servidor, pago, ticket, líneas, movimientos, auditoría, todo en una transacción) y `voidSale` · `src/server/services/sale.service.ts`
- [x] T7 — Route Handlers de ventas, anulación, ventas del turno y lista por rango · `src/app/api/sales/**`, `src/app/api/cash/shift/sales/route.ts`
- [x] T8 — Store del carrito (Zustand), servicios axios y hooks · `src/modules/sales/{store,services,hooks}`
- [x] T9 — Pantalla POS: aviso sin turno, buscador, carrito, resumen, modal de pago con vuelto · `src/app/(pos)/pos/page.tsx`, `src/modules/sales/components/`
- [x] T10 — Lista de ventas del turno en `/caja` · `src/modules/cash/components/`
- [x] T11 — Página `/admin/sales`: filtro por fechas, tabla, anular con confirmación; ítem «Ventas» en la navegación (`reports.read`) · `src/app/(admin)/admin/sales/page.tsx`, `src/lib/nav.ts`
- [x] T12 — Estado del spec en el README · `README.md`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Supuestos a confirmar, porque el SQL del sistema antiguo (`obtener_lotes_fefo`, `generar_numero_ticket`) no está en el repositorio:
  1. **FEFO excluye lotes vencidos** y lotes sin stock; el orden es por vencimiento y, en empate, por antigüedad.
  2. **Ticket** `B001-` + 8 dígitos, desde una secuencia.
- Decisiones que difieren del sistema antiguo:
  1. **El servidor calcula precio y total.** El antiguo confiaba en lo que mandaba el navegador, lo que permitía vender a otro precio. Con `expectedTotal` el cajero nunca cobra un total distinto del que vio.
  2. **El pago mixto guarda lo neto**: efectivo = total − Yape. El antiguo guardaba el efectivo entregado con el vuelto incluido, y eso desviaba el cuadre de caja.
  3. **La lista de ventas por fecha para el admin y su botón de anular** son nuevos: el antiguo solo tenía la anulación como API, sin pantalla.
- Anular una venta de un turno **ya cerrado** se permite (como el antiguo), pero no modifica el cierre ya registrado. Queda como límite conocido; si molesta, se restringe a turnos abiertos.
- El stock anulado vuelve al mismo lote aunque ya esté vencido.
- Las líneas de un producto se procesan en orden de id y los lotes en orden de vencimiento y id, para que dos ventas simultáneas no se bloqueen mutuamente (deadlock).
- La venta bloquea el turno con `lockOpenShift` y cada lote con `FOR UPDATE` antes de leer su stock, igual que los ajustes (003): es lo que garantiza que el stock no quede negativo.
- El carrito vive en memoria (se pierde al recargar), como en el sistema antiguo.
- Las devoluciones por ticket (spec posterior) deberán impedir anular una venta con devoluciones y buscar por ticket por sufijo, como hacía el antiguo.

## Estado de implementación
Código completo (T1-T12). `typecheck`, `lint`, `test` (36/36) y `build` pasan; migración `0005` aplicada y secuencia de tickets reiniciada (no había ventas reales).
AC1 (API), AC4-AC14 y AC18 verificados contra Neon con un script sobre `createSale` y `voidSale` con usuarios y productos temporales (limpiados después): FEFO que salta un lote vencido, pagos, precios, anulación, y tres carreras: dos ventas de las últimas 5 unidades (pasa 1), cuatro ventas de 2 sobre 5 unidades (pasan 2, queda 1) y venta contra cierre de turno (la venta entra en el cierre o se rechaza).
AC1 (pantalla), AC2, AC3, AC16, AC17 y la parte visual de AC4-AC6 y AC14 verificados a mano por el usuario en el navegador. AC15 (acceso a una venta ajena) no se probó a mano: está cubierto en código por la comprobación de autor o `reports.read`.

## Desviaciones
- AC15 (`GET /api/sales/[id]`) está implementado pero no tiene pantalla que lo use en este spec.
- El POS cierra el diálogo de pago ante cualquier error de la venta (409 de stock o precios) y refresca productos y turno para no reintentar con datos viejos.
- `lockShift` también se toma al anular (no estaba en el spec): así anular y cerrar el turno no se pisan.
- `useProducts` acepta `{enabled}` para no consultar hasta tener 2 caracteres.
- Los números de ticket 1-8 se consumieron en las pruebas; la secuencia se reinició a 1 al terminar.

## Review
Reviewer: APROBADO en la primera vuelta (sin bloqueantes ni mayores). Corregidos los menores:
- El buscador del POS mostraba el stock total, que incluye lotes vencidos. `GET /api/products` devuelve ahora `sellableStock` (lotes no vencidos) y el POS lo usa para «Agotado», el tope del carrito y el stock mostrado; la página de productos sigue mostrando el stock total y marca «Vencido».
- `GET /api/sales?to=…` sin `from` usa `to` como inicio (antes salía una lista vacía sin error).
- `/admin/sales` no consulta mientras el rango es inválido.
- El diálogo de pago se cierra solo ante un 409 (precios o stock); con otro error se queda abierto y conserva los montos tecleados.
Límite conocido, aceptado: no hay clave de idempotencia. Si un timeout de red hace que el cajero reintente, una venta podría duplicarse; el aviso de error y la lista de ventas del turno permiten detectarlo. Si molesta, se añade un id de operación generado en el cliente.
