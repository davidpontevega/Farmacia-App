---
id: 024
title: Detalle de una compra en el historial (qué se compró en cada lote)
status: done
module: purchases
scope: admin
---

# 024 — Detalle de una compra

## Objetivo
Que desde el historial de Compras se pueda abrir una compra y ver sus ítems: qué producto entró, en qué lote, con qué vencimiento, cuántas unidades, a qué costo y con qué precio de venta, además de los datos del documento y de los faltantes que esa compra cubrió.

## Contexto
- El historial (spec 007, AC10) solo muestra una fila por compra: fecha, proveedor, documento, quién la registró, número de ítems y total. El spec 007 dejó fuera el detalle.
- Cada ítem de compra ya está guardado con su producto, su lote, la cantidad, el costo de compra y el precio de venta indicado (`purchase_items`); falta mostrarlo.
- En la pantalla de Compras, la pestaña de arriba se llama «Registrar compra» igual que el botón que guarda, y parece un botón. Se corrige aquí.

## Alcance
Incluye: botón «Ver detalle» en cada fila del historial, ventana con los datos de la compra y la tabla de ítems, ruta de lectura con permiso, y renombrar y dar aspecto de pestañas a «Registrar compra / Historial».
No incluye: editar o anular una compra, imprimir o exportar el detalle, ver el movimiento de kardex de cada lote, devoluciones a proveedores.

## Criterios de aceptación
- [x] AC1 — Cada fila del historial tiene un botón «Ver detalle» (también activable con el teclado) que abre una ventana con esa compra. Al cerrar, el foco vuelve al botón.
- [x] AC2 — `GET /api/purchases/[id]` (permiso `purchases.read`, id validado con Zod) devuelve la compra: fecha del documento, proveedor, número de documento, quién la registró y cuándo, otros gastos, total, y sus ítems. Un id inexistente da 404 y un cajero, 403.
- [x] AC3 — Cada ítem muestra: producto (nombre comercial y, si hay, el genérico), número de lote, fecha de vencimiento, cantidad comprada, costo por unidad, subtotal (cantidad × costo) y el precio de venta indicado en esa compra (o «—» si no se indicó). Los ítems del mismo producto en lotes distintos aparecen en filas separadas, ordenados por producto y luego por vencimiento.
- [x] AC4 — Debajo de la tabla: subtotal de los ítems, otros gastos (si hay) y total. El subtotal se calcula con la misma función que usa el servidor al registrar (`purchaseTotal`), de modo que subtotal + otros gastos coincide con el total guardado de la compra. Si no coincidiera por una compra anterior a alguna regla, se muestra el total guardado sin ocultar la diferencia.
- [x] AC5 — Si esa compra cubrió faltantes (spec 019), la ventana los lista («Faltantes que cubrió»: nombre y cantidad pedida, sin datos de personas). Sin faltantes, no aparece el bloque.
- [x] AC6 — Estados claros: cargando (esqueleto), error con mensaje, y compra sin ítems (no debería pasar) con aviso. La tabla de ítems se desplaza en horizontal en pantalla angosta sin romper la ventana.
- [x] AC7 — En la pantalla de Compras, la pestaña «Registrar compra» pasa a llamarse **«Nueva compra»** y las dos pestañas («Nueva compra» e «Historial») tienen aspecto de pestañas (la activa subrayada y en azul), con `role="tablist"`/`role="tab"` y `aria-selected`. El botón de guardar sigue llamándose «Registrar compra · S/ …».
- [x] AC8 — Accesibilidad: la ventana tiene título («Compra <documento o fecha>»), la tabla encabezados reales, importes con cifras tabulares y contraste suficiente.
- [x] AC9 — Arquitectura: el componente no toca la base de datos; todo pasa por hook → servicio → ruta → repositorio, con la lectura del detalle en una sola consulta por compra más una para los faltantes. Sin migraciones.
- [x] AC10 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: el cálculo de subtotal por ítem y del total mostrado, el orden de los ítems y que el detalle respeta el permiso.

## Datos
Sin migraciones. Lectura sobre `purchases`, `purchase_items`, `products`, `lots` y `shortages` (por `purchase_id`).

## Decisiones tomadas
- El permiso de la ruta (`purchases.read`) no tiene test automático: CLAUDE.md solo admite tests de funciones puras. Se comprueba en la ruta con `requirePermission` y a mano con un cajero.
- La ventana conserva la compra elegida mientras se cierra (estado `open` aparte), para que no parpadee ni pierda el título.
- Las pestañas llevan roving tabindex y flechas izquierda/derecha.
- Una ventana (diálogo) y no una página nueva: se ve el detalle sin perder el filtro de fechas ni el lugar en la lista.
- El detalle muestra lo que se compró, no el stock actual de cada lote: ese ya se ve en Inventario.
- Los faltantes cubiertos se muestran para cerrar el ciclo entre lo pedido y lo recibido.
