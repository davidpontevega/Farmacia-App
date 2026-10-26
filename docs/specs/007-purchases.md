---
id: 007
title: Compras (ingreso de mercadería)
status: done
module: purchases
scope: admin
---

# 007 — Compras

## Objetivo
El administrador registra una compra a un proveedor (con sus productos, lotes, vencimientos, costos y cantidades), y el sistema crea los lotes, suma el stock, deja el rastro en el kardex y, si hace falta, da de alta productos nuevos o actualiza precios de venta, todo o nada.

## Alcance
Incluye: formulario de compra con ítems de producto existente o nuevo, creación atómica de compra + lotes + movimientos de entrada, alta de productos nuevos, actualización opcional del precio de venta, auditoría, e historial de compras por fecha.
No incluye: lectura de facturas con IA (ver Notas), detalle de una compra, anulación o edición de compras, cuentas por pagar, devoluciones a proveedores, importación de archivos.

## Flujo del sistema antiguo que se conserva
- Solo el administrador compra.
- Datos de la compra: proveedor y número de documento (ambos opcionales) y una lista de ítems.
- Cada ítem es un producto existente o uno nuevo (nombre, genérico, laboratorio, categoría de una lista, precio de venta obligatorio, stock mínimo 5), con su lote, fecha de vencimiento, precio de compra y cantidad.
- Un precio de venta indicado en un producto existente lo actualiza.
- El total es la suma de precio de compra × cantidad, y se ve mientras se arma la compra.
- El stock entra con un movimiento «Compra <documento>» (o el id de la compra si no hay documento).

## Criterios de aceptación
- [x] AC1 — Con un producto existente, un lote `L-9`, vencimiento futuro, costo `S/ 1.50` y cantidad 20, se crean la compra (`total = 3000`), su línea, el lote con `initial_quantity = 20` y un movimiento `ENTRY` «Compra <documento>» con referencia a la compra; el stock del producto sube 20.
- [x] AC2 — Un ítem de producto nuevo crea el producto (precio de venta indicado, stock mínimo 5, categoría y datos escritos) y su lote; dos ítems nuevos con el mismo nombre (sin distinguir mayúsculas) crean un solo producto con dos lotes.
- [x] AC3 — Un precio de venta en un producto existente lo actualiza (con auditoría del antes y el después); vacío, 0 o igual al actual no cambia nada.
- [x] AC4 — Todo o nada: si algo falla (lote repetido, producto inexistente, vencimiento pasado) no queda compra, ni lotes, ni movimientos, ni productos nuevos creados en esa compra.
- [x] AC5 — Un número de lote repetido para el mismo producto dentro de la compra se rechaza con 400; uno que ya existe en la base para ese producto, con 409 «El lote X ya existe para <producto>».
- [x] AC6 — Se rechazan (400): sin ítems o más de 100, cantidad no entera o fuera de 1 a 1.000.000, precio fuera de 0 a S/ 1.000.000, vencimiento que no sea futuro, total de la compra mayor que S/ 20.000.000, un ítem sin producto ni producto nuevo (o con ambos), un producto nuevo sin nombre o sin precio de venta mayor que 0.
- [x] AC7 — El total que muestra el formulario mientras se arma coincide con el que guarda el servidor.
- [x] AC8 — Registrar exige `purchases.create`; crear un producto nuevo exige además `products.create`, y cambiar un precio exige `products.update`; el historial exige `purchases.read`. Un cajero recibe 403 en todo.
- [x] AC9 — Crear la compra deja en `audit_logs`, en la misma transacción, `purchase.created`, un `lot.created` por lote y `product.created`/`product.updated` cuando corresponda.
- [x] AC10 — El historial (`purchases.read`) lista las compras por rango de fechas (hoy por defecto): fecha, proveedor, documento, quién la registró, cantidad de ítems y total.
- [x] AC11 — En `/admin/purchases`: se escribe proveedor y documento, se agregan y quitan ítems, cada uno se elige existente (buscador) o nuevo (campos y categoría), se ve el total en vivo, se registra, aparece el aviso, el formulario vuelve a empezar y el stock aparece en Productos.
- [x] AC12 — Dos compras simultáneas con el mismo número de lote para el mismo producto: una se confirma y la otra recibe 409.

## Datos
Sin migraciones: `purchases`, `purchase_items`, `lots`, `inventory_movements` y `products` ya existen (001). `purchase_items.sale_price` guarda el precio de venta indicado en el ítem.
`purchases.total` y todos los montos en centavos enteros.

## API
| Método | Ruta | Permiso | Entrada | Salida |
|---|---|---|---|---|
| POST | `/api/purchases` | `purchases.create` (+ `products.create` si hay productos nuevos, + `products.update` si cambia un precio) | `{supplier?, documentNumber?, items:[{productId? \| newProduct?:{commercialName,genericName?,laboratory?,category?}, lotNumber, expiryDate, purchasePrice, quantity, salePrice?}]}` | 201 `{id,total}` |
| GET | `/api/purchases?from&to` | `purchases.read` | fechas `YYYY-MM-DD` | compras del rango (máx. 200) |

`salePrice` es obligatorio en un ítem con `newProduct`. Montos en centavos enteros. Errores: 401, 403, 400 (Zod), 404, 409.

## Reutilizar
- `createLotIn` (`inventory.service.ts`, 003): lote + movimiento de entrada + auditoría dentro de la transacción del llamador; se amplía para aceptar el motivo y la referencia.
- `createLotSchema` (003) para lote, vencimiento futuro, costo y cantidad; `productRepo.insert`/`update` y `findById`; `writeAudit`; `handle`, `requirePermission`, `isUniqueViolation`.
- `ProductPicker` (003) para elegir el producto existente; `toCents`, `formatSoles`, `todayLima`, `formatDateTime` y el patrón de historial por fechas de `ReturnsTable`/`SalesTable`.
- Referencia del legacy: `ComprasController`, `pages/Compras`.

## Tareas
- [x] T1 — Lista de categorías de producto como constante compartida · `src/lib/constants.ts`
- [x] T2 — Reglas puras: total de la compra, lotes repetidos dentro de la compra y ítems nuevos con el mismo nombre · `src/lib/purchases.ts`, `src/lib/purchases.test.ts`
- [x] T3 — Schemas Zod de la compra (ítem existente o nuevo, tope del total) y del formulario en soles · `src/modules/purchases/schemas.ts`
- [x] T4 — `createLotIn` acepta motivo y referencia; sus llamadores siguen igual · `src/server/services/inventory.service.ts`
- [x] T5 — Repositorio de compras: insertar compra y líneas, lista por rango con cantidad de ítems · `src/server/repositories/purchase.repository.ts`
- [x] T6 — Service de compras: `createPurchase` (productos nuevos, compra, lotes, precios, auditoría, todo en una transacción; 409 por lote repetido) · `src/server/services/purchase.service.ts`
- [x] T7 — Route Handlers de compras (con la comprobación de permisos adicionales) · `src/app/api/purchases/route.ts`
- [x] T8 — Servicios axios y hooks · `src/modules/purchases/{services,hooks}`
- [x] T9 — Formulario de compra: ítems existentes o nuevos, total en vivo · `src/modules/purchases/components/purchase-form.tsx`, `purchase-item-fields.tsx`
- [x] T10 — Página `/admin/purchases` con «Registrar» e «Historial», y el ítem «Compras» de la navegación · `src/app/(admin)/admin/purchases/page.tsx`, `src/modules/purchases/components/`, `src/lib/nav.ts`
- [x] T11 — Quitar `ANTHROPIC_API_KEY` y las menciones a lectura de facturas con IA (nunca existió en el sistema antiguo) · `.env.example`, `README.md`, `docs/`, `CLAUDE.md`
- [x] T12 — Estado del spec en el README · `README.md`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **Corrección:** en conversaciones anteriores di por hecho que el sistema antiguo leía facturas con IA. No es así: `Anthropic:ApiKey` es solo un valor de relleno en `appsettings.json` y ningún código lo usa. Por eso no se incluye y se retira la variable `ANTHROPIC_API_KEY` del proyecto. Si en el futuro se quiere esa función, es un spec propio.
- Decisiones que difieren del sistema antiguo:
  1. **Atomicidad.** El antiguo creaba productos nuevos, compra, lotes y detalles en llamadas sueltas y no verificaba la actualización de precios; una falla a medias dejaba productos huérfanos y compras sin lotes. Aquí es una sola transacción.
  2. **El vencimiento debe ser futuro.** El antiguo no lo comprobaba y permitía cargar lotes ya vencidos.
  3. **Permisos finos:** crear un producto nuevo o cambiar un precio exige además `products.create`/`products.update`.
  4. **Historial de compras** es nuevo: el antiguo no tenía ninguna forma de ver lo comprado.
- Un producto nuevo se crea sin comprobar si ya existe otro con el mismo nombre en la base (como el antiguo); dos ítems nuevos con el mismo nombre dentro de la misma compra sí se unen en un producto. Si hay riesgo de duplicados, se puede avisar después.
- El stock mínimo de un producto nuevo es 5 (como el antiguo) y se cambia luego en Productos.
- El código de barras se eliminó en el spec 003, así que el producto nuevo ya no lo pide.
- Una compra no se puede editar ni anular: un error se corrige con un ajuste de inventario (spec 003).

## Estado de implementación
Código completo (T1-T12). `typecheck`, `lint`, `test` (48/48) y `build` pasan. No hubo migraciones.
AC1-AC6, AC9 y AC12 verificados contra Neon con un script sobre `createPurchase` y `createPurchaseSchema` con datos temporales (limpiados después): compra con producto existente, producto nuevo repetido por nombre (un producto, dos lotes, stock mínimo 5), actualización de precio (una sola auditoría; sin precio o igual al actual no cambia), lote ya existente (409) sin dejar compra, producto huérfano ni movimientos, lote repetido en la compra (400), producto inexistente (404), 11 validaciones del schema y dos compras simultáneas con el mismo lote (pasa 1).
AC7, AC10 y AC11 verificados a mano por el usuario (el formulario de tarjetas de este spec se reemplazó por la tabla del spec 008). AC8 (permisos desde la UI con otro rol) no se probó a mano: está cubierto en código por `requirePermission` y las comprobaciones de la ruta.

## Desviaciones
- `createLotIn` cambió su último parámetro de un `reason` a `opts: { reason?, referenceId? }`; sus llamadores existentes no se tocaron.
- La comprobación de `products.create`/`products.update` está en la ruta (no en el service), porque depende de lo que trae el cuerpo ya validado.
- `ANTHROPIC_API_KEY` y su mención en el README se retiraron (T11); no había otras menciones en `docs/` ni en `CLAUDE.md`.
- Un nombre de producto nuevo se compara sin distinguir mayúsculas ni espacios repetidos (`nameKey`), no solo por igualdad exacta.

## Review
Revisado junto con el spec 008 (el formulario de tarjetas de este spec se reemplazó por la tabla del 008). Ver el apartado Review del 008 para los hallazgos y correcciones, que incluyen: producto inactivo rechazado, lote automático sin chocar con uno escrito en la misma compra, y topes del servidor replicados en el formulario.
