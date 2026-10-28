---
id: 019
title: Cerrar faltantes al registrar la compra que los cubre
status: done
module: shortages
scope: all
---

# 019 — Faltantes cubiertos por una compra

## Objetivo
Que al registrar una compra (mercadería que llega), el sistema detecte qué faltantes abiertos o pedidos cubre y los marque como recibidos, para que la lista de «Faltantes» solo muestre lo que sigue sin conseguirse.

## Contexto
- Compras (spec 007) registra mercadería **recibida**, con lote, vencimiento y precios; no hay órdenes de compra. Por eso «pasar los faltantes a una compra» no puede rellenar la compra por adelantado (faltan lote, vencimiento y precio, que solo se conocen al recibir). Lo que sí aporta es **cerrar el ciclo**: pedido → llegó → ya no falta.
- Hoy, un faltante marcado «Pedido» se queda ahí para siempre aunque la mercadería ya llegó.

## Alcance
Incluye: estado nuevo «Recibido», detección de faltantes cubiertos al registrar una compra (con confirmación del usuario), y pestaña «Recibidos» en «Faltantes».
No incluye: crear compras u órdenes de compra desde «Faltantes», rellenar líneas de compra con faltantes, avisar al cajero cuando llega algo, deshacer un «Recibido».

## Criterios de aceptación
- [ ] AC1 — Nuevo estado `RECEIVED` en `shortage_status` y columna `purchase_id` (opcional, referencia a `purchases`) en `shortages` (migración `0012`).
- [ ] AC2 — En el formulario de compra, un panel «Faltantes que esta compra podría cubrir» lista los faltantes agrupados (estado Abierto o Pedido) que coinciden con algún producto de las líneas ya llenadas, según el emparejado de `match.ts` (`autoMatch`/`bestMatches` entre el nombre del faltante y el producto de la línea; coincidencia dudosa: aparece desmarcada, clara: marcada). Cada fila tiene casilla, nombre, veces pedido y cantidad total.
- [ ] AC3 — Al «Registrar compra», los grupos marcados pasan a `RECEIVED` con `purchase_id` y quién/cuándo, **en la misma transacción** que la compra (si la compra falla, ningún faltante cambia). El cuerpo de `POST /api/purchases` acepta `coversShortages` (hasta 50 `nameKey`, validados con Zod); se exige además `shortages.update`: sin ese permiso el campo se rechaza con 403 y el panel no se muestra.
- [ ] AC4 — Auditoría `shortage.status_changed` por grupo con `status: RECEIVED`, `purchase_id` y número de filas; sin nombres de medicamentos.
- [ ] AC5 — La pantalla «Faltantes» suma la pestaña «Recibidos» (con la fecha y el cajero que los recibió); «Pedido» y «Descartar» siguen igual. `GET /api/shortages?status=RECEIVED` funciona con el permiso `shortages.read`.
- [ ] AC6 — Los faltantes cubiertos por una compra anulada no se reabren (fuera de alcance, queda documentado).
- [ ] AC7 — La lógica de emparejado faltante↔línea es una función pura (`src/lib/shortages.ts`) con tests: coincidencia clara, dudosa, sin coincidencia, y que una concentración distinta (250 mg vs 500 mg) no se marque sola. `npm test`, `typecheck`, `lint` y `build` pasan.

## Datos
Migración `0012`: `ALTER TYPE shortage_status ADD VALUE 'RECEIVED'`; `shortages.purchase_id uuid null references purchases(id)`.

## Decisiones tomadas
- El usuario confirma con casillas: un nombre libre no siempre coincide bien con el catálogo, y cerrar de más ocultaría faltantes reales.
- Se cierra por grupo (nombre normalizado), igual que «Pedido» y «Descartar».
- Sin órdenes de compra: el flujo real de la botica es pedir por fuera y registrar al recibir.
