---
id: 004
title: Caja (turnos, retiros, canjes y cierre)
status: draft
module: cash
scope: pos
---

# 004 — Caja

## Objetivo
Cada cajero abre su turno con un monto inicial, registra retiros de efectivo y canjes Yape→efectivo, y al cerrar cuenta el efectivo y el Yape reales y ve al instante cuánto sobra o falta frente a lo que el sistema espera.

## Alcance
Incluye: abrir turno, ver el turno activo con su resumen en vivo, registrar retiros y canjes, cerrar turno con el cuadre por método de pago, auditoría, página `/caja`.
No incluye: la venta en sí (spec 005; el resumen ya lee `sales` y sale en cero hasta entonces), la lista de ventas del turno (se añade en 005), devoluciones en efectivo (spec de devoluciones, que añadirá el tipo `CASH_REFUND`), historial de turnos cerrados y reportes (spec de reportes).

## Flujo del sistema antiguo que se conserva
- Un turno abierto por usuario; sin turno abierto no se vende.
- Movimientos de caja: **retiro de efectivo** y **canje Yape→efectivo** (el cliente paga por Yape y recibe efectivo de la gaveta), ambos con monto y motivo.
- Cierre: el cajero ingresa el efectivo contado y el Yape contado; el sistema calcula la diferencia por método.
- Nombres y colores de los movimientos: Retiro efectivo, Canje Yape→Ef.

## Criterios de aceptación
- [ ] AC1 — Dado un cajero sin turno, cuando abre con `S/ 100.00`, entonces existe un turno `OPEN` con `opening_amount = 10000`; un segundo intento se rechaza con 409 aunque se envíe dos veces a la vez (índice único parcial de 001).
- [ ] AC2 — Un monto de apertura negativo, vacío o con más de 2 decimales se rechaza con 400.
- [ ] AC3 — `GET /api/cash/shift` devuelve `shift: null` si no hay turno; con turno, devuelve el resumen: ventas en efectivo, ventas Yape, cantidad de ventas, retiros, canjes, efectivo esperado y Yape esperado. Recién abierto: efectivo esperado = apertura, Yape esperado = 0.
- [ ] AC4 — Un retiro de `S/ 20.00` suma 2000 a retiros y baja el efectivo esperado en 2000; un monto ≤ 0 o un motivo de menos de 3 letras se rechazan con 400.
- [ ] AC5 — Un canje de `S/ 30.00` baja el efectivo esperado en 3000 y sube el Yape esperado en 3000.
- [ ] AC6 — Sin turno abierto, registrar un movimiento o cerrar se rechaza con 409 y el mensaje «No tienes un turno de caja abierto».
- [ ] AC7 — Al cerrar con efectivo y Yape contados, el turno pasa a `CLOSED` con `closed_at`, `counted_cash`, `counted_yape`, `total_cash` y `total_yape` (ventas), `system_amount` (efectivo + Yape esperados), `closing_amount` (efectivo + Yape contados) y `difference` (contado − esperado); la respuesta incluye además la diferencia de efectivo y la de Yape por separado.
- [ ] AC8 — Con un turno cerrado no se puede registrar movimientos ni volver a cerrar, y el cajero puede abrir un turno nuevo.
- [ ] AC9 — Un movimiento y un cierre simultáneos nunca pierden dinero: o el movimiento entra en los totales del cierre, o se rechaza porque el turno ya cerró (el turno se bloquea con `FOR UPDATE` en ambas operaciones).
- [ ] AC10 — En `/caja`, mientras el cajero escribe el efectivo y el Yape contados, ve la diferencia de cada método en vivo: verde si es 0, rojo si no, con el signo (+ sobra, − falta).
- [ ] AC11 — Cada usuario solo ve y opera su propio turno (las rutas no reciben id de turno ni de usuario). Sin el permiso correspondiente (`cash.open`, `cash.close`, `cash.read`, `cash.withdraw`, `cash.exchange`) la API responde 403.
- [ ] AC12 — Abrir, cerrar, retirar y canjear dejan una entrada en `audit_logs` en la misma transacción.

## Datos
Una migración (`0004`): `cash_shifts.counted_cash` y `cash_shifts.counted_yape` (entero, nulos hasta el cierre). Con ellas, el desglose por método de un turno cerrado se puede recalcular después sin guardar más.
`difference`, `system_amount`, `closing_amount`, `total_cash` y `total_yape` ya existen en 001. Dinero siempre en centavos.

Fórmulas (puras, con tests):
- `efectivo esperado = apertura + ventas en efectivo − retiros − canjes`
- `Yape esperado = ventas Yape + canjes`
- `diferencia de efectivo = efectivo contado − efectivo esperado`; `diferencia de Yape = Yape contado − Yape esperado`; `difference = suma de ambas`
- Solo cuentan las ventas `COMPLETED` del turno (las anuladas no).

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| GET | `/api/cash/shift` | `cash.read` | — | `{shift: {id,openingAmount,openedAt}\|null, summary, movements:[{id,type,amount,reason,createdAt}]}` |
| POST | `/api/cash/shift/open` | `cash.open` | `{openingAmount}` | 201 `{id}` |
| POST | `/api/cash/shift/close` | `cash.close` | `{countedCash,countedYape}` | 200 `{expectedCash,expectedYape,differenceCash,differenceYape,difference}` |
| POST | `/api/cash/movements` | `cash.withdraw` o `cash.exchange` según `type` | `{type:'CASH_WITHDRAWAL'\|'YAPE_TO_CASH_EXCHANGE',amount,reason}` | 201 `{id}` |

Los montos viajan en centavos enteros. Errores: 401, 403, 400 (Zod, `{error,fields}`), 409.

## Reutilizar
- `handle`, `requirePermission`, `writeAudit`, errores tipados, `db.transaction`, `Executor` (002/003).
- Tablas `cash_shifts`, `cash_movements`, `sales` y el índice `cash_shifts_one_open_per_user` (001).
- Utilidades de dinero (`toCents`, `formatSoles`) y de fechas de 003; patrón de módulo, hooks, diálogos y `<Can>` de `src/modules/products` y `src/modules/users`.
- Referencia del legacy: `CajaController`, `CajaMovimientosController`, `CajaRepository.CerrarTurnoAsync`, `pages/Caja`.

## Tareas
- [ ] T1 — Columnas `counted_cash` y `counted_yape` en `cash_shifts` y migración `0004` · `src/server/db/schema/cash-shift.ts`, `drizzle/`
- [ ] T2 — Fórmulas de cuadre puras: `expectedCash`, `expectedYape`, `differences` · `src/lib/cash.ts`, `src/lib/cash.test.ts`
- [ ] T3 — Schemas Zod de apertura, cierre y movimiento, y sus versiones de formulario en soles · `src/modules/cash/schemas.ts`
- [ ] T4 — Repositorio de caja: turno abierto del usuario, bloquear turno (`FOR UPDATE`), insertar turno, cerrar turno, insertar movimiento, movimientos del turno, totales de ventas y de movimientos del turno · `src/server/repositories/cash.repository.ts`
- [ ] T5 — Service de caja: `openShift`, `closeShift`, `addMovement` con bloqueo del turno, reglas, transacción y auditoría; `getActiveShift` con el resumen · `src/server/services/cash.service.ts`
- [ ] T6 — Route Handlers de turno, cierre y movimientos · `src/app/api/cash/**`
- [ ] T7 — Servicios axios y hooks (TanStack Query) · `src/modules/cash/{services,hooks}`
- [ ] T8 — Página `/caja`: abrir turno; resumen del turno con efectivo y Yape esperados; formularios de retiro y canje; lista de movimientos; cierre con diferencias en vivo · `src/app/(pos)/caja/page.tsx`, `src/modules/cash/components/`
- [ ] T9 — Ítem «Caja» en la navegación (`cash.read`) · `src/lib/nav.ts`
- [ ] T10 — Estado del spec en el README · `README.md`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- Decisiones a confirmar, porque difieren del sistema antiguo:
  1. **El cuadre incluye la apertura en el efectivo esperado**, también en el servidor. El legacy lo hacía bien en pantalla, pero el servidor guardaba `diferencia` sin sumar la apertura, así que la diferencia guardada no coincidía con la que veía el cajero.
  2. **El Yape esperado incluye los canjes**: en un canje entra dinero por Yape. El legacy esperaba solo las ventas Yape, así que un canje siempre aparecía como Yape «sobrante».
  3. Se guardan el efectivo y el Yape contados por separado (el legacy solo guardaba su suma).
- Como en el sistema antiguo, **no se valida que un retiro o canje no supere el efectivo esperado**: si se saca más de lo que hay, el cierre mostrará la diferencia. Se puede añadir como regla después.
- El monto del vuelto no se guarda ni se suma: la venta registra en efectivo lo neto cobrado (spec 005), por lo que el efectivo esperado ya es el correcto. El legacy, en pago mixto, guardaba el efectivo entregado con vuelto incluido y desviaba el cuadre.
- El spec 005 (ventas) debe bloquear el turno con el mismo `FOR UPDATE` que usa el cierre para que no se pueda vender mientras se cierra.
- Las devoluciones en efectivo (spec posterior) añadirán un tipo `CASH_REFUND` al enum de movimientos y lo restarán del efectivo esperado, como hacía el legacy con `DEVOLUCION`.
