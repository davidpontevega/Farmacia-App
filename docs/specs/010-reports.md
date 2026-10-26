---
id: 010
title: Reportes (ventas, inventario valorizado, alertas)
status: done
module: reports
scope: admin
---

# 010 — Reportes

## Objetivo
Que el administrador vea en una sola pantalla cuánto se vendió y ganó en un período, cuánto vale lo que hay en el almacén y qué necesita atención (stock bajo, por vencer, vencido), y que pueda llevarse las tablas a Excel.

## Contexto
- El sistema antiguo tenía una pantalla «Reportes» con cuatro vistas: ventas por rango de fechas (total, número de ventas, ticket promedio y listado), inventario (stock por producto con su estado), alertas (stock bajo y por vencer en 30 días) y kardex. El total de ventas ignoraba las devoluciones, no mostraba utilidad ni ventas por día, y no se podía exportar.
- En el sistema nuevo ya existen el historial de ventas (`/admin/sales`), el kardex y los lotes (`/admin/inventory`) y el historial de devoluciones. **Este spec no los duplica:** reúne los números del negocio que hoy obligan a sumar a mano.
- Los datos ya están: `sale_items.lot_id` → `lots.purchase_price` da el costo de lo vendido; `products.min_stock` y las vistas `lot_stock` / `product_stock` dan el stock.
- Los cajeros no tienen `reports.read`: no ven costos ni utilidad.

## Alcance
Incluye: página `/admin/reports` con tres pestañas (Ventas, Inventario, Alertas), solo lectura, exportar cada tabla a CSV.
No incluye: kardex (sigue en Inventario), reportes de compras o de caja, utilidad por producto, gráficos más allá de ventas por día, PDF, envío por correo, guardar reportes.

## Criterios de aceptación
- [ ] AC1 — Pantalla `/admin/reports` con pestañas Ventas, Inventario y Alertas, y un ítem «Reportes» en el menú de admin. Requiere `reports.read`; sin el permiso, ni el menú ni las API responden (403).
- [ ] AC2 — Ventas: rango «desde / hasta» (hoy por defecto, hora de Lima, máximo 366 días, `desde` ≤ `hasta` ≤ hoy). Accesos rápidos: Hoy, Ayer, Últimos 7 días, Este mes.
- [ ] AC3 — Ventas, tarjetas: **ventas netas** (total de ventas completadas del período menos lo reembolsado por devoluciones hechas en el período), **número de ventas**, **ticket promedio** (ventas completadas ÷ número, sin restar devoluciones), **utilidad bruta** (ventas netas menos el costo de lo vendido neto de lo devuelto, al costo de compra del lote) y **margen %**. Las anuladas no suman a nada y se muestran aparte («N anuladas por S/ X»).
- [ ] AC4 — Ventas, desglose: por método de pago (efectivo / Yape, según los montos pagados), por cajero, y **por día** (tabla y gráfico de barras; los días sin ventas aparecen en cero).
- [ ] AC5 — Ventas, productos: los 10 más vendidos del período por unidades, con unidades, importe y utilidad; opción de ordenar por importe o por utilidad.
- [ ] AC6 — Inventario: una fila por producto activo con stock, mínimo, estado (Sin stock / Bajo mínimo / OK), **valor al costo** (suma de stock de cada lote × su costo de compra) y valor a precio de venta; totales al pie y filtro por texto y por estado. Productos inactivos con stock se incluyen con una marca.
- [ ] AC7 — Alertas, stock: productos con mínimo > 0 y stock ≤ mínimo (sin stock primero), con lo que falta para llegar al mínimo.
- [ ] AC8 — Alertas, vencimientos: lotes con stock > 0 que vencen dentro de 30, 60 o 90 días (elegible; 30 por defecto) y lotes **ya vencidos con stock**, cada uno con producto, lote, vencimiento, días restantes, unidades y valor al costo; total del valor en riesgo.
- [ ] AC9 — Cada tabla (ventas por día, productos, inventario, alertas de stock, alertas de vencimiento) tiene «Exportar CSV»: UTF-8 con marca de orden de bytes para que Excel abra bien las tildes, importes con punto y dos decimales, nombre de archivo con el tipo y la fecha.
- [ ] AC10 — Los días se cuentan en hora de Lima: una venta hecha a las 22:00 del día 5 pertenece al día 5, aunque en UTC ya sea el 6.
- [ ] AC11 — Estados de carga y de error claros; un reporte vacío dice «No hay datos en este período» (no una tabla en blanco ni ceros engañosos).
- [ ] AC12 — Todo en solo lectura: ningún reporte modifica datos ni escribe auditoría. Los importes se calculan en céntimos enteros en el servidor.

## Datos
Sin migraciones. Consultas de agregación nuevas en el repositorio de reportes sobre `sales`, `sale_items`, `lots`, `returns`, `return_items`, `products` y las vistas `lot_stock` y `product_stock`.

## API
| Método | Ruta | Permiso | Respuesta |
|---|---|---|---|
| GET | `/api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD` | `reports.read` | tarjetas, por método de pago, por cajero, por día, top productos |
| GET | `/api/reports/inventory` | `reports.read` | filas por producto + totales |
| GET | `/api/reports/alerts?days=30\|60\|90` | `reports.read` | stock bajo, por vencer, vencidos |

Los parámetros se validan con Zod (fechas reales, rango máximo, `days` en la lista).

## Reutilizar
`requirePermission`, `handle()`, `todayLima`, `addDays`, `formatSoles`, `lotStock` / `productStock`, patrón de hooks de TanStack Query y servicios axios, componentes shadcn de tabla, Recharts (ya instalado; guía de la skill `dataviz`), estados de carga/error de los módulos anteriores.

## Tareas
- [x] T1 — Reglas puras con tests: validación del rango de fechas, estado de stock (sin stock / bajo / OK), días hasta el vencimiento y clasificación, valor del inventario, margen %, constructor de CSV · `src/lib/reports.ts`, `reports.test.ts`
- [x] T2 — Repositorio de reportes con las agregaciones (ventas, devoluciones, costo, inventario, alertas), días en hora de Lima · `src/server/repositories/report.repository.ts`
- [x] T3 — Servicio que arma la respuesta y neta las devoluciones · `src/server/services/report.service.ts`
- [x] T4 — Route Handlers con Zod y permiso · `src/app/api/reports/{sales,inventory,alerts}/route.ts`
- [x] T5 — Servicio axios, tipos y hooks · `src/modules/reports/{types,services,hooks}`
- [x] T6 — Pestaña Ventas: rango y accesos rápidos, tarjetas, por método/cajero/día con gráfico, top productos · `src/modules/reports/components/`
- [x] T7 — Pestañas Inventario y Alertas con filtros y totales · `src/modules/reports/components/`
- [x] T8 — Exportar CSV en cada tabla · `src/modules/reports/components/`
- [x] T9 — Página `/admin/reports`, ítem de menú y estado del spec en el README · `src/app/(admin)/admin/reports/page.tsx`, `src/lib/nav.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **Verificación contra la BD real:** un guion temporal crea ventas, una devolución y un lote por vencer con datos de prueba, compara los números de cada reporte contra cuentas hechas a mano (incluida una venta cerca de medianoche de Lima) y limpia después.
- **Decisiones a confirmar:**
  1. «Ventas netas» resta los reembolsos de devoluciones hechas **en el período**, aunque la venta original sea de otro día (así el efectivo del día cuadra con lo que pasó en caja).
  2. La utilidad usa el costo de compra del lote del que salió cada unidad (el que quedó en `sale_items.lot_id`); si se devolvió mercadería **en buen estado** (vuelve al stock), se resta su costo; lo devuelto dañado no, porque se pierde.
  3. Una sola página con pestañas, solo para quien tenga `reports.read` (en la práctica, el admin).
  4. CSV separado por comas con BOM; si tu Excel lo abre en una sola columna, se cambia a punto y coma.
- Verificado contra la BD real (ventas, devolución, anulada, venta a las 22:00 de Lima, lotes por vencer y vencido, stock bajo): todos los números coinciden con las cuentas a mano.
- Queda para después: reporte de compras por proveedor, productos sin movimiento, rotación e ABC, y reportes de caja por turno.
- Las fotos de facturas con OCR se descartan (decisión del usuario): se le pide al comprador subir la cotización del proveedor, que es una imagen limpia. No habrá spec de enderezado de hojas.
