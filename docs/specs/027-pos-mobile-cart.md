---
id: 027
title: Carrito del punto de venta en celular (barra fija y panel)
status: draft
module: sales
scope: all
---

# 027 — Carrito del punto de venta en celular

## Objetivo
Que quien vende desde el celular vea siempre cuánto lleva en el carrito y pueda revisarlo y cobrar sin recorrer toda la lista de productos.

## Contexto
- En `/pos` el diseño de dos columnas (catálogo + «Venta actual») solo aparece desde pantallas grandes (`lg`). En el celular se apila: primero el catálogo y al final el carrito, así que no se ve qué se eligió.
- Ocultar el catálogo no sirve: es lo que se usa para agregar productos.
- El carrito (`CartTable`), el total y el botón Cobrar ya existen; solo cambia dónde se muestran en pantallas chicas.

## Alcance
Incluye: en pantallas menores a `lg`, una barra fija al pie con resumen y botón Cobrar, y un panel deslizable con el carrito completo.
No incluye: cambios en escritorio, en el catálogo, en el cobro, en la API ni en la base de datos; revisar otras pantallas del sistema en celular.

## Criterios de aceptación
- [ ] AC1 — Desde `lg` hacia arriba la pantalla queda exactamente igual que hoy (dos columnas, carrito lateral fijo). La barra y el panel no existen allí.
- [ ] AC2 — Por debajo de `lg`, el carrito lateral deja de mostrarse en la página y aparece una barra fija al pie, siempre visible mientras se recorre el catálogo, con: cantidad de productos, total en soles y botón «Cobrar». Sin productos, la barra muestra «Carrito vacío» y «Cobrar» deshabilitado.
- [ ] AC3 — Tocar la zona de resumen de la barra (cantidad y total) abre un panel deslizable desde abajo con el mismo contenido que hoy tiene «Venta actual»: líneas con − / + / quitar, «Vaciar», total y turno. Se cierra con una X, con tocar fuera o con Escape.
- [ ] AC4 — «Cobrar» de la barra y el de dentro del panel abren el diálogo de cobro existente; con el turno vencido (`stale`) o sin productos están deshabilitados, igual que hoy. Al abrir el cobro desde el panel, el panel se cierra.
- [ ] AC5 — Al agregar un producto desde el catálogo la barra se actualiza al instante (cantidad y total) sin abrir el panel ni mover el scroll. La cantidad se anuncia a lectores de pantalla (`aria-live="polite"`).
- [ ] AC6 — Al terminar la venta (ticket) y al vaciar el carrito, el panel queda cerrado y la barra vuelve a «Carrito vacío».
- [ ] AC7 — La barra no tapa contenido: la página reserva espacio inferior para ella, respeta el área segura del celular (`env(safe-area-inset-bottom)`) y los botones miden al menos 44 px de alto.
- [ ] AC8 — La barra se oculta mientras hay un diálogo abierto (cobro, receta, ticket) para no superponerse; al cerrarlo reaparece.
- [ ] AC9 — Accesibilidad: el panel es un diálogo con título «Venta actual», el foco entra al abrir y vuelve al botón que lo abrió al cerrar; la barra se alcanza con teclado; el estado no depende solo del color.
- [ ] AC10 — La lógica de resumen del carrito (cantidad de productos y texto singular/plural) es una función pura con tests; `npm test`, `typecheck`, `lint` y `build` pasan.
- [ ] AC11 — Verificación manual en ancho de 360 px y 390 px, y en 1024 px o más para confirmar que escritorio no cambió.

## Datos
Sin migraciones ni cambios de API. Usa el estado del carrito que ya existe (`useCartStore`).

## Decisiones tomadas
- Barra fija + panel en vez de pestañas: el cajero sigue en el catálogo mientras agrega y ve el total en todo momento.
- Se reutiliza el componente `Sheet` ya instalado y el mismo contenido de «Venta actual»; no se duplica la lógica del carrito: el cuerpo se extrae a un componente que usan la columna de escritorio y el panel del celular.
- Los atajos F2 / F4 se mantienen (solo aplican con teclado).
- Fuera de alcance, pendiente de revisión aparte: el resto de pantallas (tablas de Inventario, Compras, Reportes) en celular.
