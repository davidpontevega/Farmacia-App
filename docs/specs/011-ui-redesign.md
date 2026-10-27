---
id: 011
title: Rediseño visual (tema médico, menú lateral, cajero y administrador)
status: done
module: ui
scope: all
---

# 011 — Rediseño visual

## Objetivo
Aplicar al sistema real el diseño aprobado en el prototipo («Farmacia POS Diseño»): paleta limpia (blanco, gris claro, azul médico, verde y rojo para estados), menú lateral para el administrador y una pantalla de caja más grande y clara para el cajero. **Solo cambia la apariencia: ninguna regla de negocio, API ni permiso cambia.**

## Contexto
- Hoy el tema es el gris por defecto de shadcn (el color `primary` es casi negro) y la navegación es una barra horizontal con todos los enlaces, igual para cajero y administrador.
- El prototipo define: fondo `#F3F5F9`, tarjetas blancas con borde `#E3E8F0`, azul `#1B5FC1`, verde `#0E7C57`/`#19A974`, rojo `#B3261E`, ámbar `#C98A00`; tipografía Inter; esquinas de 10–14 px.
- Cajeros y administradores ya ven menús distintos por permisos (`NAV_ITEMS`); eso no cambia.

## Alcance
Incluye:
1. **Tema global**: variables de color en `globals.css` (primary azul, fondo gris claro, tokens `success`, `warning`, `destructive`), fuente Inter, modo oscuro sin romperse.
2. **Estructura**: área de administración con menú lateral fijo (ítems según permisos, ítem activo resaltado, usuario abajo); en pantallas estrechas el menú pasa arriba y se pliega. Área del cajero con barra superior (marca, estado de caja, acceso a Caja y Devoluciones, usuario).
3. **Cajero (`/pos`)**: buscador grande, carrito y panel de cobro a la derecha con total grande, botón «Cobrar» verde, botones de método de pago al tamaño de un dedo (≥ 44 px). Los resultados de búsqueda se muestran como tarjetas con etiqueta de estado (Disponible, Vence pronto, Stock bajo, Agotado).
4. **Reportes (`/admin/reports`)**: tarjetas de indicadores y paneles blancos con el nuevo estilo; gráficos con la paleta (azul, verde, ámbar, rojo).
5. **Compras con OCR (`/admin/purchases`)**: estado de lectura en verde, avisos de revisión en ámbar y de flete en azul, campos dudosos con el ámbar del tema.
6. **Etiquetas de estado** unificadas (Disponible, Stock bajo, Agotado, Vence pronto, Vencido, Completada, Anulada) en un solo componente con color y texto.

Ampliado el 2026-10-27 a pedido del usuario («tiene que estar igual al artifact»):
- **Un solo menú lateral** para cajero y administrador (reemplaza la barra superior del cajero).
- **Reportes → Ventas**: variación contra el período anterior en las tarjetas (calculada en el cliente con una segunda consulta del mismo reporte sobre el período previo de igual duración; sin API nueva), método de pago como dona con porcentajes y panel «Alertas» a la derecha de «Más vendidos».
- **Caja (`/pos`)**: cuadrícula de productos con buscador y categorías (los 50 primeros por nombre, el buscador filtra) y panel «Venta actual» a la derecha. El cobro sigue en el diálogo existente porque admite pago mixto.
- **Compras**: visor del documento junto a la tabla (fijo al desplazar) y selección de la fila al hacer clic en cualquier parte de ella.

Ampliado el 2026-10-27 (segunda tanda):
- **Inventario**: lista de productos a la izquierda (con estado de stock) y, a la derecha, el producto elegido con recuadros (stock total, lotes con stock, valor al costo, próximo vencimiento) y tabla de lotes con estado (Vigente, Por vencer, Vencido, Sin stock).
- **Categoría** al crear o editar un producto (y en productos nuevos desde una compra): lista desplegable con buscador, con las categorías sugeridas más las ya usadas (`GET /api/products/categories`, permiso `products.read`); si lo escrito no existe se ofrece «Crear categoría». La categoría sigue siendo texto en `products.category`; no hay tabla nueva.
- **Marca**: el nombre del sistema es «NicFarma» (`src/lib/brand.ts`, cambiable con `NEXT_PUBLIC_BRAND_NAME` y `NEXT_PUBLIC_BRAND_TAGLINE`). Multiempresa en una sola instalación queda fuera de este spec.

No incluye (se pueden pedir aparte):
- IGV desglosado en el carrito (el sistema no maneja IGV en ventas).
- Elegir el método de pago dentro del panel del carrito (hoy se elige en el diálogo de cobro).
- Rediseño de Caja, Devoluciones, Usuarios, Productos e Inventario más allá de heredar el tema y el menú.

## Criterios de aceptación
- [ ] AC1 — `primary` es el azul médico; el fondo de la app es gris claro y las tarjetas blancas; botones, enlaces, foco y selecciones lo usan. Verde = correcto/cobrar, rojo = error/agotado/vencido, ámbar = advertencia.
- [ ] AC2 — Todo texto cumple contraste ≥ 4,5:1 sobre su fondo; los estados nunca se distinguen solo por color (siempre llevan texto).
- [ ] AC3 — Administrador: menú lateral con los ítems que le corresponden por permiso, página activa resaltada con `aria-current="page"`, usuario (Clerk) al pie. Un usuario sin un permiso no ve el ítem (igual que hoy).
- [ ] AC4 — Cajero: barra superior sin menú lateral, con solo sus ítems por permiso y el estado del turno (abierto desde la hora de apertura / sin turno).
- [ ] AC5 — En pantallas de menos de 768 px el menú lateral pasa a una barra superior plegable y ninguna pantalla tiene scroll horizontal de página (las tablas anchas sí scrollean dentro de su caja).
- [ ] AC6 — `/pos`: mismo comportamiento que hoy (buscar, agregar, cantidades, descuentos, cobrar, turno requerido); total ≥ 28 px y botón Cobrar ≥ 56 px de alto; los resultados muestran la etiqueta de estado según stock y vencimiento más próximo del lote (reglas existentes `stockStatus` / `expiryBucket`).
- [ ] AC7 — Reportes y Compras conservan todas sus funciones y textos de error; solo cambia el aspecto. El campo dudoso del OCR sigue marcado con `aria-invalid`/texto, no solo con color.
- [ ] AC8 — Tipografía Inter cargada con `next/font`; sin parpadeo de fuente ni de tema.
- [ ] AC9 — `npm test`, `npm run typecheck`, `npm run lint` y `npm run build` pasan; no se añade ninguna dependencia nueva.
- [ ] AC10 — Revisión manual en 3 anchos (1440, 768, 390 px) de: `/pos`, `/admin/reports`, `/admin/purchases` y `/admin/products`, sin textos cortados ni solapes.

## Datos
Sin migraciones ni cambios de API.

## Decisiones tomadas
- Se rediseña por **tokens de tema** (un solo lugar) y no pantalla por pantalla, para que Productos, Caja, Usuarios, etc. se actualicen solos.
- El menú lateral reutiliza `NAV_ITEMS`; no se duplica la lista.
- Sin dependencias nuevas: iconos con `lucide-react` solo si ya está instalado (se verifica al implementar), si no, SVG en línea.
