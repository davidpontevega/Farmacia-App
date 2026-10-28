---
id: 018
title: «No lo tengo»: anotar un faltante desde la búsqueda de /pos
status: done
module: shortages
scope: all
---

# 018 — «No lo tengo» desde la búsqueda

## Objetivo
Que el cajero anote en un clic lo que el cliente pidió y no hay, directamente desde el buscador de `/pos`, sin pasar por una receta.

## Contexto
- El spec 017 anota faltantes solo desde el diálogo «Receta». Un cliente que pide algo suelto (sin receta) hoy no deja rastro.
- Reutiliza todo el spec 017: misma tabla, misma API (`POST /api/shortages`), mismos permisos, misma pantalla «Faltantes».

## Alcance
Incluye: enlace «¿No es lo que buscas? Anotar «texto» como faltante» bajo los resultados de la búsqueda, con cantidad, y el origen nuevo `SEARCH`.
No incluye: anotar desde las tarjetas de productos sin stock, anotar desde otras pantallas, cambios en la pantalla «Faltantes» más allá de mostrar el origen.

## Criterios de aceptación
- [ ] AC1 — En `/pos`, cuando el texto buscado tiene 2 o más caracteres (ya sin esperar el retardo de la búsqueda), bajo la cuadrícula aparece «¿No es lo que buscas? Anotar «texto» como faltante». Si la búsqueda no devuelve productos, ese bloque reemplaza al mensaje «No se encontraron productos» y se muestra destacado.
- [ ] AC2 — Al pulsarlo se abre un diálogo pequeño con el nombre (el texto buscado, editable, 1–120 caracteres) y la cantidad (entera, 1–9999, por defecto 1). «Anotar» envía el faltante; se cierra y avisa «Faltante anotado» (o «Ya estaba anotado hace poco» si es repetido).
- [ ] AC3 — Nuevo valor `SEARCH` en el enum `shortage_source` (migración `0011`). Para `SEARCH` basta `shortages.create` (el cajero puede); `MANUAL` sigue exigiendo `shortages.update`. La regla pura `canAddSource` se actualiza y se testea.
- [ ] AC4 — Si el producto buscado existe pero no tiene stock, no se envía `productId` (solo texto): el cajero anota lo que el cliente dijo, no un producto elegido.
- [ ] AC5 — El fallo al anotar no pierde nada de la venta en curso: el aviso con «Reintentar» vive en el hook `useCreateShortages` (spec 017). No se anota solo: siempre requiere el clic del cajero.
- [ ] AC6 — La pantalla «Faltantes» y el CSV no cambian de forma; el origen `SEARCH` se acepta en la API, la tabla y la auditoría (`shortage.created`).
- [ ] AC7 — Accesible: el enlace es un botón alcanzable por teclado con texto claro; el diálogo tiene etiquetas, foco inicial y cierra con Esc. `npm test`, `typecheck`, `lint` y `build` pasan; test de `canAddSource` con `SEARCH`.

## Datos
Migración `0011`: `ALTER TYPE shortage_source ADD VALUE 'SEARCH'`. Sin cambios en datos existentes.

## Decisiones tomadas
- Siempre con clic: anotar solo por haber buscado sin resultado llenaría la lista de errores de tipeo.
- Sin `productId` desde la búsqueda: lo escrito puede ser un nombre que no existe en el catálogo.
