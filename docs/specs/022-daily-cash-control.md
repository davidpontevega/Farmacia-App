---
id: 022
title: Control diario de la caja (una sola caja, turno vencido y cierre por el administrador)
status: done
module: cash
scope: pos
---

# 022 — Control diario de la caja

## Objetivo
Que la caja sea realmente diaria y de una sola gaveta: un turno que sigue abierto al cambiar el día no deja vender hasta cerrarse con su conteo, solo puede haber un turno abierto en todo el local (relevo entre cajeros), y el administrador puede cerrar el turno de un cajero que se olvidó o ya se fue.

## Contexto
- Hoy (spec 004) cada cajero tiene su turno, que dura hasta que él mismo lo cierre. No hay regla de fecha: un turno abierto un lunes sigue vendiendo el miércoles y el cuadre mezcla días. En la base hay ahora 2 turnos abiertos de días anteriores.
- El local tiene **una sola caja física**. Decisión del usuario: los cajeros la comparten por relevo (uno cierra, el otro abre).
- Decisión del usuario: un turno vencido **bloquea las ventas hasta cerrarlo**; nada se cierra solo, para que siempre haya un conteo real.
- Decisión del usuario: el administrador puede cerrar el turno ajeno, con conteo o sin cuadre.

## Alcance
Incluye: un solo turno abierto en todo el local, turno vencido al cambiar el día (hora de Lima) con bloqueo de ventas y movimientos, información del turno abierto del local, cierre por un supervisor (con conteo o «sin cuadre»), permiso nuevo y auditoría.
No incluye: cierre automático a medianoche, horarios de apertura configurables, reabrir un turno cerrado, varias cajas físicas, el historial de turnos (spec de reportes) más allá de mostrar «sin cuadre».

## Criterios de aceptación
- [ ] AC1 — **Un solo turno abierto en todo el local.** Un índice único parcial en la base lo garantiza. Abrir un turno cuando ya hay uno abierto de otro cajero se rechaza con 409 y el mensaje «La caja está abierta por <nombre> desde <fecha y hora>; debe cerrarse antes de abrir otro turno». Dos aperturas simultáneas: una entra y la otra recibe ese 409.
- [ ] AC2 — **Turno vencido.** Un turno abierto está vencido cuando la fecha de su apertura en Lima es anterior a la de hoy en Lima (corte a medianoche, hora de Lima). Función pura `isShiftStale(openedAt, now)` con tests en los bordes (23:59 y 00:00 de Lima, y el cambio de mes).
- [ ] AC3 — **Un turno vencido no vende ni mueve dinero.** Crear una venta o registrar un retiro o canje con un turno vencido se rechaza con 409 y «Tu turno es de un día anterior (<fecha>). Ciérralo para continuar». Cerrar el turno sigue permitido. Cada operación comprueba el vencimiento después de bloquear el turno (`FOR UPDATE`), igual que hoy comprueba que esté abierto.
- [ ] AC4 — **En pantalla.** En `/pos`, con turno vencido, un aviso rojo explica el motivo con un enlace a Caja y «Cobrar» queda deshabilitado. En `/caja`, el turno vencido se muestra con una tarjeta destacada «Tu turno es del <fecha>: cuenta el efectivo y el Yape y ciérralo», y desde ahí se cierra con el flujo de cierre de siempre. El aviso debe leerse con lector de pantalla (`role="alert"`).
- [ ] AC5 — **Turno abierto del local.** `GET /api/cash/open` (permiso `cash.read`) devuelve el turno abierto de todo el local, o `null`: `{ id, ownerName, openedAt, stale, mine }`. No expone importes de otro cajero.
- [ ] AC6 — **Si la caja la tiene otro.** En `/caja`, un cajero sin turno propio cuando hay uno de otra persona ve «La caja está abierta por <nombre> desde <fecha y hora>», con «Abrir turno» deshabilitado y la explicación. Si la caja está libre, abre como hoy.
- [ ] AC7 — **Cierre por un supervisor.** Nuevo permiso `cash.supervise` (solo administrador por defecto; se sincroniza con `npm run db:permissions`). `POST /api/cash/shifts/[id]/close` lo exige y cierra el turno de otro usuario, en una transacción que bloquea el turno, con uno de dos modos validados con Zod: `{ mode: "COUNTED", countedCash, countedYape }` (mismo cuadre que el cierre normal) o `{ mode: "NO_COUNT" }`. Rechaza con 409 si el turno ya está cerrado y con 404 si no existe. Un supervisor puede cerrar también su propio turno por esta vía.
- [ ] AC8 — **Qué queda guardado.** Dos columnas nuevas en `cash_shifts`: `closed_by` (quién lo cerró) y `close_mode` (`NORMAL`, `FORCED_COUNTED` o `FORCED_NO_COUNT`). En «sin cuadre», `counted_cash`, `counted_yape`, `closing_amount` y `difference` quedan nulos y `system_amount`, `total_cash` y `total_yape` se guardan igual. Todo lo que muestra o suma turnos cerrados (caja, reportes) tolera esos nulos y los rotula «Sin cuadre»; nunca los cuenta como diferencia cero.
- [ ] AC9 — **En pantalla, para el supervisor.** En `/caja`, quien tenga `cash.supervise` y vea un turno ajeno abierto tiene «Cerrar turno de <nombre>», que abre un diálogo con dos pestañas o botones: «Con conteo» (efectivo y Yape contados, con la diferencia en vivo) y «Sin cuadre» (con una advertencia de que no se cuenta el dinero y queda registrado). Confirmación explícita antes de cerrar.
- [ ] AC10 — **Auditoría.** El cierre por supervisor deja `cash.shift_force_closed` en `audit_logs`, en la misma transacción, con el dueño del turno, el modo y, si hubo conteo, las diferencias. Abrir, cerrar y los movimientos conservan su auditoría de siempre.
- [ ] AC11 — **Concurrencia.** Un cierre forzado y una venta o movimiento simultáneos nunca pierden dinero: o la venta entra en los totales del cierre, o se rechaza porque el turno ya cerró (mismo `FOR UPDATE` que el spec 004).
- [ ] AC12 — Zod en cada ruta, componentes sin acceso a base de datos, estados de carga y error claros. `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: vencimiento (AC2), el mensaje y la regla de bloqueo, y los cálculos del cierre forzado con conteo y sin cuadre.

## Datos
Migración `0015`:
- `cash_shifts.closed_by uuid null` (referencia a `users`) y `cash_shifts.close_mode text not null default 'NORMAL'` con restricción a los tres valores.
- Índice único parcial `cash_shifts_one_open` sobre el estado abierto, para todo el local. Convive con el índice por usuario, que queda implícito.
- **Antes de aplicarla**, hay que cerrar los turnos abiertos sobrantes (hoy hay 2, de prueba: uno de MANUEL desde el 26 de octubre y otro del Super Admin desde el 27), porque la base rechaza el índice mientras haya dos abiertos. Se cierran en «sin cuadre» con una actualización controlada y auditada, no a mano.

## Deuda conocida (fuera de este spec)
- Anular una venta (`voidSale`) bloquea el turno pero no comprueba si está vencido o ya cerrado; anular una venta de un turno cerrado cambia totales ya cuadrados. Ya era así antes de este spec y conviene decidirlo aparte.

## Decisiones tomadas
- El corte del día es la medianoche de Lima. Si algún día el local abre de madrugada o 24 horas, el corte debe ser configurable (queda fuera de este spec).
- Nada se cierra solo: un cierre automático dejaría un cierre sin conteo que nadie revisa. El bloqueo obliga a contar.
- Un turno vencido no admite movimientos: lo olvidado del día anterior aparecerá como diferencia en el cierre en lugar de seguir ensuciando el cuadre.
- «Sin cuadre» existe solo para el supervisor: es la salida cuando el cajero no está para contar, y deja constancia clara en vez de inventar una diferencia.
- Relevo entre cajeros: cierra uno, abre el otro; no se venden dos turnos a la vez sobre la misma gaveta.
