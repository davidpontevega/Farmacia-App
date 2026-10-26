---
id: 006
title: Devoluciones
status: done
module: returns
scope: both
---

# 006 — Devoluciones

## Objetivo
Un cajero busca una venta por su ticket, elige qué unidades devuelve y en qué estado están, y el sistema registra la devolución, devuelve al stock lo que está en buen estado y descuenta el reembolso del efectivo de su turno.

## Alcance
Incluye: búsqueda de la venta por ticket, devolución parcial o total por línea de venta, estado del producto (bueno / dañado), reembolso en efectivo contra el turno abierto, bloqueo de la anulación de ventas con devoluciones, pantalla `/devoluciones`, y una lista de devoluciones por fecha para el admin.
No incluye: reembolso por Yape, cambio de producto, devoluciones a proveedores, reportes.

## Flujo del sistema antiguo que se conserva
- Se busca la venta por ticket (completo o por sus últimos dígitos, en los últimos 90 días) y se listan solo las líneas que aún se pueden devolver.
- Por línea: cantidad a devolver y estado «Bueno» o «Dañado»; un motivo general obligatorio.
- No se puede devolver una venta anulada ni más unidades de las vendidas, contando devoluciones anteriores.
- El monto devuelto es la suma de cantidad × precio de la venta.
- Lo bueno vuelve al stock con un movimiento de devolución («Devolución venta <ticket> — <motivo>»).

## Criterios de aceptación
- [x] AC1 — `GET /api/returns/lookup?ticket=B001-00000001` devuelve la venta y sus líneas con vendido, ya devuelto y disponible, solo las líneas con disponible > 0. También acepta los últimos dígitos (`00000001`); si coinciden varias ventas responde 409 «escribe el ticket completo»; si no existe, 404. Solo busca en los últimos 90 días.
- [x] AC2 — Una venta anulada se rechaza al devolver (409) y la búsqueda la muestra marcada como anulada.
- [x] AC3 — Devolver 2 de 3 unidades en estado bueno registra la devolución con `refunded_amount = 2 × precio de la línea`, suma 2 al stock del lote de esa línea con un movimiento `RETURN`, y la venta queda intacta.
- [x] AC4 — Estado dañado: se registra la devolución y el reembolso, pero no se mueve el stock (el producto se descarta).
- [x] AC5 — No se puede devolver más de lo disponible por línea: «Solo puedes devolver n unidad(es) — ya se devolvieron m» (409); dos devoluciones sucesivas se suman.
- [x] AC6 — En una venta repartida en varios lotes, cada línea (producto + lote) se devuelve por separado y el stock vuelve al lote de esa línea.
- [x] AC7 — El cliente solo envía `saleItemId`, cantidad y estado: el precio y el lote salen de la línea de la venta, no del navegador.
- [x] AC8 — Devolver exige un turno abierto del usuario (409 «No tienes un turno de caja abierto») y registra un movimiento de caja `CASH_REFUND` por el monto reembolsado; el efectivo esperado del turno baja en ese monto y el resumen de `/caja` lo muestra como «Devoluciones».
- [x] AC9 — Todo o nada: si algo falla no queda devolución, ni movimiento de stock, ni de caja.
- [x] AC10 — Dos devoluciones simultáneas de la última unidad de una línea: una se confirma y la otra se rechaza. Una devolución y la anulación de la misma venta a la vez: gana una y la otra recibe 409.
- [x] AC11 — Anular una venta que tiene devoluciones se rechaza (409 «La venta tiene devoluciones»).
- [x] AC12 — Se rechazan (400/404): cantidad ≤ 0 o no entera, ninguna línea o más de 100, motivo de menos de 3 o más de 200 caracteres, estado fuera de `GOOD`/`DAMAGED`, una línea que no es de esa venta. Las líneas repetidas se suman.
- [x] AC13 — Buscar y devolver exigen `returns.create`; la lista exige `returns.read`. La devolución queda a nombre de quien la hace, aunque la venta sea de otro cajero.
- [x] AC14 — `/devoluciones`: se escribe el ticket, se ven las líneas con su disponible, se eligen cantidades y estados, se escribe el motivo y se ve el total a devolver; al confirmar sale un aviso con el monto y el formulario vuelve a empezar.
- [x] AC15 — `/admin/returns` (permiso `returns.read`) lista las devoluciones por rango de fechas (hoy por defecto): fecha, ticket, quien devolvió, motivo y monto.
- [x] AC16 — Crear una devolución deja entrada en `audit_logs` en la misma transacción.

## Datos
Una migración (`0006`):
- `cash_movement_type` suma el valor `CASH_REFUND`.
- `return_items.sale_item_id` (uuid, FK a `sale_items`, índice): cada devolución apunta a la línea que devuelve. La tabla está vacía, así que la columna puede ser obligatoria.

`returns`, `return_items` y el enum de estado (`GOOD`, `DAMAGED`, `EXPIRED`) ya existen en 001; la pantalla ofrece Bueno y Dañado, como el sistema antiguo (`EXPIRED` queda sin uso).
Fórmula de caja: `efectivo esperado = apertura + ventas en efectivo − retiros − canjes − devoluciones`.

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| GET | `/api/returns/lookup?ticket=` | `returns.create` | ticket completo o sufijo | `{sale:{id,ticketNumber,createdAt,total,status}, lines:[{saleItemId,productName,lotNumber,quantity,unitPrice,returned,available}]}` |
| POST | `/api/returns` | `returns.create` | `{saleId, reason, items:[{saleItemId,quantity,condition:'GOOD'\|'DAMAGED'}]}` | 201 `{id,ticketNumber,refundedAmount}` |
| GET | `/api/returns?from&to` | `returns.read` | fechas `YYYY-MM-DD` | devoluciones del rango (máx. 200) |

Montos en centavos enteros. Errores: 401, 403, 400 (Zod), 404, 409.

## Reutilizar
- `lockOpenShift` (`cash.service.ts`), `lockSale` (`sale.repository.ts`), `insertMovements` (`inventory.repository.ts`), `writeAudit`, errores tipados, `db.transaction` (002-005).
- `shiftTotals`, `expectedCash` y el resumen de caja (004), que ya leen los movimientos del turno.
- `toCents`, `formatSoles`, `todayLima`, `formatDateTime`, rangos de fecha y el patrón de `SalesTable` (005); `<Can>`, `usePermissions`, `AppShell`.
- Referencia del legacy: `DevolucionesController`, `DevolucionRepository`, `VentasController.BuscarPorTicket`, `pages/Devoluciones`.

## Tareas
- [x] T1 — Enum `CASH_REFUND`, columna `return_items.sale_item_id` y migración `0006` · `src/server/db/schema/_shared.ts`, `return-item.ts`, `drizzle/`
- [x] T2 — Reglas puras: disponible por línea, validación de la devolución (pertenencia, tope, líneas repetidas) y total reembolsado · `src/lib/returns.ts`, `src/lib/returns.test.ts`
- [x] T3 — Devoluciones en el cuadre: `refunds` en `ShiftTotals` y `expectedCash` (con tests), en `shiftTotals`, en el resumen y en la pantalla de caja (fila «Devoluciones» y etiqueta del movimiento) · `src/lib/cash.ts`, `cash.repository.ts`, `cash.service.ts`, `src/modules/cash/`
- [x] T4 — Schemas Zod de búsqueda, devolución y rango · `src/modules/returns/schemas.ts`
- [x] T5 — Repositorio de devoluciones: venta por ticket (exacto o sufijo, 90 días), líneas con lo ya devuelto, insertar devolución y líneas, devoluciones de una venta, lista por rango · `src/server/repositories/return.repository.ts`
- [x] T6 — Service de devoluciones: `lookupByTicket` y `createReturn` (turno bloqueado, venta bloqueada, validación por línea, movimientos de stock solo de lo bueno, movimiento de caja, auditoría, todo en una transacción); `voidSale` rechaza ventas con devoluciones · `src/server/services/return.service.ts`, `sale.service.ts`
- [x] T7 — Route Handlers de búsqueda, creación y lista · `src/app/api/returns/**`
- [x] T8 — Servicios axios y hooks · `src/modules/returns/{services,hooks}`
- [x] T9 — Pantalla `/devoluciones`: buscador de ticket, líneas con cantidad y estado, motivo, total, confirmar · `src/app/(pos)/devoluciones/page.tsx`, `src/modules/returns/components/`
- [x] T10 — Página `/admin/returns` y los ítems «Devoluciones» y «Devoluciones (admin)» de la navegación · `src/app/(admin)/admin/returns/page.tsx`, `src/lib/nav.ts`
- [x] T11 — Estado del spec en el README · `README.md`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
Decisiones que difieren del sistema antiguo, porque este tenía defectos que no conviene copiar:
1. **Lo dañado no vuelve al stock.** El antiguo registraba un ajuste negativo, que descontaba otra vez unidades que la venta ya había sacado. Aquí se reembolsa y no se mueve el stock.
2. **El reembolso sale del efectivo del turno.** La pantalla de caja antigua restaba las devoluciones, pero el backend nunca registraba ese movimiento, así que el cierre las ignoraba. Ahora cada devolución crea un movimiento `CASH_REFUND` y devolver exige turno abierto.
3. **La validación es por línea de venta** (producto + lote). El antiguo comparaba contra la primera línea del producto, lo que fallaba en ventas repartidas en varios lotes.
4. **Precio y lote los toma el servidor** de la línea de la venta; el antiguo confiaba en lo que mandaba el navegador.
5. **Buscar por sufijo** responde 409 si hay varias coincidencias, en vez de elegir la primera.
6. **Anular una venta con devoluciones se rechaza** (decidido en el spec 005 como pendiente).
7. **`/admin/returns`** es nuevo: el antiguo solo tenía el listado como API, sin pantalla.

Límites conocidos: el reembolso siempre sale en efectivo, aunque la venta se pagara por Yape (como implicaba el sistema antiguo); la devolución se asienta en el turno abierto de quien la hace, no en el de la venta original; no hay plazo máximo para devolver más allá de los 90 días de la búsqueda.

## Estado de implementación
Código completo (T1-T11). `typecheck`, `lint`, `test` (43/43) y `build` pasan; migración `0006` aplicada.
AC1-AC13 y AC16 verificados contra Neon con un script sobre `lookupByTicket`, `createReturn` y `voidSale` con datos temporales (limpiados después): búsqueda exacta, por sufijo y ambigua; estados bueno y dañado; topes por línea; reembolso contra el turno (el efectivo esperado baja); turno obligatorio; venta anulada; anular con devoluciones; devolución de una venta de otro cajero; y dos carreras (dos devoluciones de la última unidad: pasa 1; devolución contra anulación de la misma venta: gana una sola). AC6 (varios lotes) se cubrió con una venta repartida entre los lotes A y B.
AC14 (pantalla `/devoluciones`) y AC15 (`/admin/returns`) verificados a mano por el usuario en el navegador.

## Desviaciones
- **Orden de bloqueos venta → turno** en `createReturn` (igual que `voidSale`): con turno → venta se produce un interbloqueo entre una devolución y una anulación de la misma venta.
- Los errores de la validación se reparten: línea ajena a la venta → 404; tope superado o línea ya devuelta → 409 (en la API; la UI limita la cantidad al disponible).
- Una venta anulada se devuelve en la búsqueda con `lines: []` para que la pantalla no ofrezca nada que devolver.
- `Historial devoluciones` como etiqueta de navegación del admin, para no repetir «Devoluciones».

## Review
Reviewer: APROBADO en la primera vuelta (sin bloqueantes ni mayores). Corregidos los menores de pantalla: tras un 409 la cantidad elegida se recorta al nuevo disponible, y el campo de cantidad queda vacío mientras vale 0 para poder escribir otro número.
Anotados, no corregidos:
- El reembolso es `cantidad × precio de la línea` y no prorratea `sales.discount`. Hoy el descuento es siempre 0, así que no hay defecto; **si algún día hay descuentos, hay que prorratear el reembolso o toparlo con `sales.total`**, o una devolución total reembolsaría de más.
- No se valida que el reembolso quepa en el efectivo esperado del turno: una devolución mayor que el efectivo de la gaveta deja el esperado en negativo y el cierre lo mostrará como diferencia. Es lo mismo que el sistema antiguo hacía con retiros y canjes; se puede añadir como regla después.
