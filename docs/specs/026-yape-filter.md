---
id: 026
title: Filtro de Yape / Plin y total del día en el historial de ventas
status: done
module: sales
scope: admin
---

# 026 — Filtro de Yape / Plin en el historial de ventas

## Objetivo
Que quien revisa el historial de Ventas pueda ver de un vistazo cuántos cobros por Yape/Plin hubo en el rango elegido, cuánto suman, y cuáles no tienen foto de la transferencia, sin buscarlos a ojo en la lista.

## Contexto
- El historial (`/admin/sales`) lista las ventas del rango de fechas; cada venta con Yape/Plin muestra «Ver constancia» o «Sin constancia» (specs 014 y 025), pero no hay filtro ni total.
- Al cerrar el turno, Caja compara lo contado con lo que registró el sistema. Para revisar un descuadre de Yape hace falta ver esas ventas juntas.
- La lista ya se descarga completa (hasta 200 ventas); el filtro puede hacerse en pantalla.

## Alcance
Incluye: botones de filtro encima de la tabla («Todas», «Yape / Plin», «Sin constancia») y una franja de resumen con el total de Yape/Plin del rango.
No incluye: galería de constancias, filtrar por cajero o por monto, exportar, cambios en la API ni en la base de datos, filtrar en el servidor.

## Criterios de aceptación
- [x] AC1 — Encima de la tabla de Ventas hay tres botones de filtro (estilo de filtro, no de pestañas): «Todas» (por defecto), «Yape / Plin» y «Sin constancia». El activo se marca con `aria-pressed`. Cambiar las fechas conserva el filtro elegido.
- [x] AC2 — «Yape / Plin» muestra las ventas con algún monto de Yape/Plin (pago Yape o mixto), incluidas las anuladas, que se distinguen por su estado.
- [x] AC3 — «Sin constancia» muestra las ventas completadas con Yape/Plin que no tienen foto. Si el almacenamiento de fotos no está activo (`proofEnabled` falso), ese botón no aparece.
- [x] AC4 — Una franja de resumen sobre la tabla, siempre visible con datos, muestra para el rango de fechas elegido y solo con ventas completadas (no anuladas): «Yape / Plin: S/ X en N ventas», y, si `proofEnabled`, «con constancia N · sin constancia N». El resumen no cambia con el filtro de la tabla.
- [x] AC5 — El monto de Yape/Plin de una venta mixta cuenta solo su parte de Yape/Plin (`yapeAmount`), no el total de la venta.
- [x] AC6 — Si la lista llegó al tope de 200 ventas, el resumen lo avisa («Total parcial: acota el rango») y el aviso existente de la tabla se mantiene.
- [x] AC7 — Un filtro sin resultados muestra el estado vacío con un mensaje acorde («Sin ventas con Yape / Plin en este rango», «Todas las ventas con Yape / Plin tienen constancia»).
- [x] AC8 — El filtrado y el resumen son funciones puras en `src/lib/sales-filter.ts`; el componente no toca la base de datos ni cambia la API.
- [x] AC9 — Accesibilidad: los botones se alcanzan con el teclado; la franja de resumen es texto, con importes en cifras tabulares y sin depender solo del color.
- [x] AC10 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: filtro «Yape / Plin» (puro, mixto, efectivo, anulada), «Sin constancia» (con foto, sin foto, anulada), suma de Yape con ventas mixtas, exclusión de anuladas del resumen, conteo con y sin constancia, lista vacía.

## Datos
Sin migraciones. Se usan `yapeAmount`, `hasProof` y `status` que ya trae cada venta del listado.

## Decisiones tomadas
- Filtro en el cliente: los datos ya están cargados y el tope es de 200 ventas; evita tocar la ruta y su permiso.
- El resumen es del rango completo y no del filtro, para que el total de Yape sea siempre el mismo número que se compara con Caja.
- Las constancias se borran a los 90 días (spec 014): en rangos antiguos, «Sin constancia» incluirá también las vencidas. Se acepta; el uso esperado es revisar los días recientes.
- Los botones usan el estilo de filtro (spec 023): las pestañas se reservan para cambiar de vista.
