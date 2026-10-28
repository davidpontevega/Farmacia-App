---
id: 017
title: Faltantes (medicamentos pedidos que no hay, para las compras)
status: done
module: shortages
scope: all
---

# 017 — Faltantes

## Objetivo
Llevar la cuenta de los medicamentos que los clientes piden y no se pudieron atender (sin producto en el catálogo o sin stock), para que el administrador sepa cuáles son los más pedidos y arme el pedido a proveedores.

## Contexto
- Con la receta asistida (specs 015/016) cada línea que no tiene producto, o cuyo producto no tiene stock, hoy se pierde: nadie sabe qué se dejó de vender.
- Compras (spec 007) registra mercadería **recibida**, no pedidos. Esta pantalla no crea pedidos: entrega la lista para hacerlos fuera del sistema (WhatsApp, correo, llamada).
- Solo se guarda el texto del medicamento y la cantidad. Nunca datos del paciente (el recorte de la receta ya los excluye).

## Alcance
Incluye: anotar faltantes desde el diálogo «Receta» de `/pos`, pantalla «Faltantes» para administración (lista agrupada, más pedidos primero, marcar «Pedido» o «Descartar», copiar la lista y descargar CSV), anotación manual en esa pantalla, permisos nuevos y auditoría.
No incluye: botón «No lo tengo» en la búsqueda de `/pos` (siguiente versión), anotación manual del cajero desde caja, crear órdenes de compra, pasar los faltantes a una compra, avisar al proveedor, borrado automático por antigüedad.

## Criterios de aceptación
- [ ] AC1 — Permisos nuevos `shortages.create` (anotar), `shortages.read` (ver la pantalla) y `shortages.update` (marcar y anotar a mano). El administrador tiene los tres y el cajero solo `shortages.create`. Se sincronizan con `npm run db:seed`. Cada ruta usa `requirePermission` por código.
- [ ] AC2 — Tabla `shortages`: `name` (texto como se escribió, 1–120 caracteres), `name_key` (nombre normalizado: sin tildes ni mayúsculas, espacios simples, para agrupar), `quantity` (entero 1–9999), `source` (`PRESCRIPTION` o `MANUAL`), `product_id` (opcional: el producto existe pero sin stock), `status` (`OPEN`, `ORDERED`, `DISMISSED`; por defecto `OPEN`), `user_id`, `created_at`, `resolved_at` y `resolved_by` (nulos hasta que se marca).
- [ ] AC3 — En el diálogo «Receta», una línea **sin atender** es: la que no tiene candidatos («No encontrado»), la que el cajero marcó «Ninguno de estos», o aquella cuyos candidatos están todos sin stock (se guarda el `product_id` del mejor candidato). No son faltantes: las líneas descartadas ni las que quedaron «Por elegir» sin tocar (se avisa cuántas hay). Regla pura en `src/lib/prescription.ts`.
- [ ] AC4 — Si hay líneas sin atender, el diálogo muestra el bloque «Sin atender: se anotarán como faltantes» con una casilla marcada por línea (nombre y cantidad). «Agregar al carrito» queda habilitado también cuando solo hay líneas sin atender (entonces dice «Anotar faltantes»). Al confirmar, primero se agregan los productos al carrito y luego se anotan los faltantes marcados.
- [ ] AC5 — Anotar es secundario: si falla, la venta y el carrito no se pierden; se avisa «No se pudieron anotar los faltantes» con «Reintentar». El aviso y el reintento viven en el hook (el diálogo ya se cerró).
- [ ] AC6 — `POST /api/shortages` (lote de hasta 30 ítems con `name`, `quantity`, `source`, `productId?`) valida con Zod (sin caracteres de control, longitudes), exige `shortages.create` y rechaza `source: MANUAL` si el usuario no tiene `shortages.update`. No inserta un ítem repetido (mismo usuario, mismo `name_key` y mismo `product_id`) creado en los últimos 10 minutos: evita duplicar al reenviar la misma receta. Todo en una transacción con su registro de auditoría `shortage.created` (cantidad de ítems, sin los nombres).
- [ ] AC7 — `GET /api/shortages?status=OPEN|ORDERED|DISMISSED` (por defecto `OPEN`), permiso `shortages.read`. Devuelve filas agrupadas por `name_key`: el nombre más reciente tal como se escribió, número de veces pedido, cantidad total, fecha del último pedido y a quién se lo pidieron por última vez; ordenadas de más pedidas a menos, y de ahí por último pedido.
- [ ] AC8 — `PATCH /api/shortages` (cuerpo: `nameKey` y `status: ORDERED|DISMISSED`), permiso `shortages.update`: cambia todas las filas `OPEN` de ese nombre y guarda quién y cuándo. Auditoría `shortage.status_changed` (nameKey, nuevo estado, filas afectadas). Un nombre sin filas abiertas da 404.
- [ ] AC9 — Pantalla `/admin/shortages` («Faltantes» en el menú, permiso `shortages.read`): pestañas Abiertos / Pedidos / Descartados, tabla con medicamento, veces pedido, cantidad total y último pedido; botones «Pedido» y «Descartar» (con confirmación) por fila, solo si hay `shortages.update`. Estados de carga, error y vacío claros. Accesible y usable en celular.
- [ ] AC10 — «Copiar lista» (texto: una línea por medicamento, «Nombre — cantidad total») y «Descargar CSV» (columnas nombre, veces pedido, cantidad total, último pedido), sobre las filas visibles. El CSV escapa comillas y comas y neutraliza las celdas que empiezan con `=`, `+`, `-` o `@` (anteponiendo un apóstrofo), porque el nombre viene de texto libre o de una IA y podría abrirse en Excel. Funciones puras en `src/lib/shortages.ts`.
- [ ] AC11 — «Anotar faltante» a mano en la pantalla (nombre y cantidad, `source: MANUAL`, permiso `shortages.update`).
- [ ] AC12 — Los componentes no tocan la base de datos; todo pasa por hook → servicio → ruta → repositorio. Zod en cada ruta. `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: clave de nombre (tildes, mayúsculas, espacios), qué líneas son «sin atender» (los cuatro casos de AC3), texto de la lista y CSV (comillas, comas, fórmulas) y el rechazo de `MANUAL` sin permiso (regla pura).

## Datos
Migración `0010`: enums `shortage_source` y `shortage_status`, tabla `shortages`, índices por `(status, name_key)` y por `(user_id, name_key, created_at)`. Sin cambios en datos existentes. Los permisos nuevos se sincronizan con `npm run db:seed`.

## Decisiones tomadas
- Se anota **automático con casilla para quitar** líneas: pedir confirmación cada vez haría que un cajero apurado lo salte.
- El cajero solo anota; ver, marcar y exportar es de administración.
- Agrupar por nombre normalizado, no por producto: el faltante típico ni siquiera existe en el catálogo.
- Cada pedido es una fila (no un contador): permite ver cuándo y quién, y el conteo sale de agrupar.
- Sin integración con Compras todavía: primero se comprueba que la lista sirve para pedir.
