---
id: 023
title: Pantalla de Inicio, encabezado superior, menú agrupado y pulido visual
status: done
module: ui
scope: all
---

# 023 — Inicio, encabezado superior, menú agrupado y pulido

## Objetivo
Dar al sistema una pantalla de **Inicio** con el resumen del día, un **encabezado superior** con el título de cada pantalla, el estado de la caja y el usuario, un **menú lateral agrupado** con contadores, y un pulido de color, profundidad y tipografía, incluidos los detalles del punto de venta. Es el diseño aprobado en el prototipo «NicFarma · Inicio, menú y punto de venta».

## Contexto
- Hoy no hay pantalla de inicio: `/` lleva a `/pos` y `/admin` al primer ítem permitido. Cada pantalla empieza con un título suelto y no hay encabezado superior.
- El estado de la caja («Caja abierta · 28/10/2026, 4:55:56 p. m.» o «Sin turno abierto») y el usuario (Clerk `UserButton` con su nombre, el elemento `userButtonOuterIdentifier`) están hoy al pie del menú lateral. **Se mueven al encabezado superior.**
- La paleta sigue siendo el azul del spec 011; esto lo pule, no lo reemplaza.
- Cambia solo la presentación y suma datos de lectura: ninguna regla de negocio ni permiso existente cambia.

## Alcance
Incluye: Inicio (administrador y cajero), encabezado superior, buscador rápido «Ir a…», menú agrupado con contadores y colapsable, pulido de tarjetas, números y estados vacíos, y detalles del punto de venta (tarjetas de producto, selector de cantidad con − y +, atajos F2 y F4).
No incluye: modo oscuro, personalizar el Inicio por usuario, gráficos nuevos en Reportes, cambios en el login, colores por empresa (multiempresa), escáner de código de barras.

## Criterios de aceptación
- [ ] AC1 — **Ruta de inicio.** Existe `/inicio`, para todo usuario con acceso al sistema (se llega con el logo, AC8). `/` redirige a `/inicio` (antes a `/pos`) y `/admin` también.
- [ ] AC2 — **Inicio del administrador** (quien tiene `reports.read`): cuatro indicadores del día — ventas de hoy, tickets, ticket promedio y porcentaje pagado por Yape/Plin — cada uno con su variación contra ayer (verde si mejora, rojo si empeora, con signo y sin depender solo del color); gráfico de ventas por hora de hoy contra ayer; tarjeta de caja (quién la tiene, desde cuándo, y efectivo y Yape esperados) con enlace a Caja; alertas (por vencer, stock bajo, sin stock, faltantes abiertos) con enlace a su pantalla; los 5 productos más vendidos hoy y los 5 faltantes más pedidos con enlace a «Faltantes».
- [ ] AC3 — **Inicio del cajero** (sin `reports.read`): tres accesos grandes (Nueva venta, Receta y Consultar, según sus permisos), «Mi turno» con apertura, número de ventas y efectivo y Yape esperados más los botones de retiro, canje y cierre, y las ventas del turno con la etiqueta «Sin constancia» cuando falta la foto de una venta por Yape (spec 014). Con un turno vencido o sin turno, muestra el aviso y el enlace a Caja (spec 022).
- [ ] AC4 — **API de resumen.** `GET /api/home/summary` (permiso `reports.read`) devuelve en una sola respuesta lo de AC2: hoy y ayer (total, tickets, ticket promedio, Yape), ventas por hora (hora de Lima) de hoy y de ayer, los 5 más vendidos de hoy y las alertas con conteos. Solo ventas `COMPLETED`. Montos en centavos. Funciones de cálculo (variación, agrupación por hora, ticket promedio con cero tickets) puras y con tests.
- [ ] AC5 — **Encabezado superior compacto, en una sola fila.** Todas las pantallas autenticadas muestran una barra con: botón de menú (hamburguesa, ver AC10), título y subtítulo de la pantalla (tabla ruta → texto, con la fecha de hoy donde aplique), el buscador «Ir a…» (AC7) y, a la derecha, el **estado de la caja** con el mismo texto de hoy («Caja abierta · <fecha y hora de apertura>» o «Sin turno abierto», y «Turno vencido» en rojo si lo está) y el **menú de usuario de Clerk con su nombre** (`showName`, elemento `userButtonOuterIdentifier`). Se quitan del pie del menú lateral. En pantalla angosta la barra envuelve y los textos se acortan con puntos suspensivos.
- [ ] AC6 — **Sin botones de acción en el encabezado** (decisión tras revisar el diseño en pantalla: el encabezado era muy grande). «Nueva venta» y «Receta» viven en el Inicio del cajero, en el punto de venta (botón y tecla F4) y en el menú; `/pos?receta=1` sigue abriendo el diálogo de receta al cargar y limpia el parámetro.
- [ ] AC7 — **Buscador «Ir a…».** Un botón en el encabezado, y el atajo Ctrl+K (⌘+K en Mac), abren un diálogo con un campo y la lista de las pantallas a las que el usuario tiene acceso, filtrada al escribir (sin tildes ni mayúsculas); flechas y Enter navegan; Esc cierra y devuelve el foco. Función de filtrado pura y con tests.
- [ ] AC8 — **Menú agrupado.** Secciones con título: Operación (Punto de venta, Caja, Consulta, Devoluciones), Inventario (Productos, Inventario, Compras, Faltantes), Análisis (Ventas, Reportes, Historial de devoluciones) y Administración (Usuarios). Se muestran solo los ítems con permiso y se omite la sección que quede vacía. **Inicio no es un ítem del menú**: se llega con el logo de la marca (arriba del menú, también plegado a iconos, con nombre accesible «<marca>: ir al inicio»); sí aparece en el buscador «Ir a…». Lo activo lleva fondo resaltado y `aria-current="page"`.
- [ ] AC9 — **Contadores del menú.** Faltantes muestra los faltantes abiertos y Reportes las alertas (por vencer + stock bajo + sin stock), solo si el valor es mayor que 0 y solo a quien tiene el permiso del dato. `GET /api/nav/counters` (autenticado) devuelve únicamente los contadores que el usuario puede ver. Se refrescan al cambiar de pantalla y cada 2 minutos.
- [ ] AC10 — **Menú plegable con el botón de hamburguesa del encabezado.** No hay botón «Contraer menú» en el menú. En pantalla ancha, la hamburguesa pliega el menú a solo iconos (con nombre accesible y título en cada icono y el contador como punto) y lo vuelve a desplegar; la elección se recuerda en el navegador (`localStorage`, con la página funcionando igual si no está disponible). En pantalla angosta, la hamburguesa abre y cierra el menú como un cajón con fondo que lo cierra al tocarlo, y Esc lo cierra devolviendo el foco. Cada pantalla tiene su propio botón para que anuncie su estado (`aria-expanded`).
- [ ] AC11 — **Color, profundidad y tipografía.** Tarjetas con borde y sombra suave consistentes; títulos de pantalla y números grandes en los totales con cifras tabulares; escala de azules completa en los tokens; chips de estado unificados (éxito, aviso, error, información) con el mismo componente en las pantallas existentes; estados vacíos con icono, texto y, si aplica, acción, en Faltantes, Ventas, lista de ventas del turno, consultas sin resultado y lista de devoluciones. Contraste mínimo AA en texto y objetivos táctiles de al menos 44 px.
- [ ] AC12 — **Punto de venta.** Tarjetas de producto con icono por tipo, chip de estado de stock, ubicación, precio grande y botón «+»; la línea del carrito con selector de cantidad con − y + (se conserva el tope por stock); el total en tamaño grande; el botón «Cobrar» muestra la tecla **F2**, que abre el cobro si hay productos y el turno no está vencido; **F4** abre el diálogo de receta. Los atajos no actúan mientras hay un diálogo abierto.
- [ ] AC13 — **Arquitectura.** Los componentes no tocan la base de datos; todo dato nuevo pasa por hook → servicio → ruta → repositorio con Zod y permisos por código. Sin migraciones.
- [ ] AC14 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: variación contra ayer, agrupación por hora y por día de Lima, ticket promedio con cero tickets, título por ruta, filtrado del buscador, agrupación del menú por permiso y qué contadores ve cada usuario.

## Datos
Sin migraciones. Las consultas nuevas son de lectura sobre `sales`, `sale_items`, `products`, `lots` y `shortages`.

## Decisiones tomadas
- Un solo endpoint de resumen para el Inicio del administrador, en vez de una llamada por tarjeta: menos viajes y un único estado de carga.
- El estado de la caja y el usuario van en el encabezado y no se repiten en el menú: una sola fuente de verdad visible.
- Los atajos F2 y F4 y el buscador Ctrl+K solo existen donde tienen sentido (punto de venta y todo el sistema, respectivamente) y respetan los diálogos abiertos.
- El menú es **claro** (blanco, con lo activo en azul claro), como en el prototipo: se probó el azul oscuro y no gustó. Los colores del menú son variables (`--sidebar*`), así que cambiarlo es de un solo lugar.
- La interfaz usa un tamaño base de 15 px (antes 16) y espacios y números más compactos, porque en pantalla se sentía grande.
