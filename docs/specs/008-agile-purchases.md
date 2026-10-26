---
id: 008
title: Registro ágil de compras
status: done
module: purchases
scope: admin
---

# 008 — Registro ágil de compras

## Objetivo
Registrar una compra de decenas de productos tomando como modelo la cotización o factura del proveedor: tabla de una fila por producto, que reconoce al proveedor y a sus productos, convierte cajas en unidades, genera el lote si no hay, y avisa de lo dudoso. Es la base sobre la que el spec 009 (lectura de la imagen con OCR) rellenará la misma tabla.

## Contexto
- Los documentos reales (cotización y factura de HealTec) traen por línea: código del proveedor, cantidad, unidad (CAJ, UND, SOB, FCO, PAQ…), descripción con la presentación (`X 25`), vencimiento y precio **con IGV**; la factura además trae lote. Totales: subtotal + IGV = total, y a veces una línea «GASTOS DE ENVIO».
- Casi todo se vende por unidad, rara vez por caja.
- El comprador pasa siempre la cotización como imagen o PDF sin texto copiable; no hay acceso al XML.
- Una prueba de OCR gratuito en el navegador, leyendo la cotización columna por columna, acertó cantidad, vencimiento y total en 16 de 16 filas, precio en 15 de 16 (el error lo detectó la regla cantidad × precio = total) y descripción casi completa; los códigos salieron mal, por eso el producto se identifica por descripción. Eso se desarrolla en el spec 009.

## Alcance
Incluye: proveedor recordado con sus productos, fecha del documento, lote opcional, vencimiento en mes/año, unidades por presentación y costo por unidad, otros gastos, cuadre con el total del documento, creación de productos nuevos con margen sugerido, pegar filas desde texto, validación por fila, tabla con teclado, borrador automático.
No incluye: lectura de imágenes o PDF (spec 009), guardar la imagen del documento, importar XML, anular o editar compras, conversión de precios de venta por caja (se vende por unidad; un producto que se venda por caja se registra con 1 unidad por presentación).

## Criterios de aceptación
- [x] AC1 — El campo proveedor sugiere los proveedores ya usados; uno nuevo se crea al registrar. Es opcional.
- [x] AC2 — La compra lleva «fecha del documento» (hoy por defecto, no futura); el historial muestra esa fecha y no la del día en que se digitó.
- [x] AC3 — El número de lote es opcional: vacío, el sistema asigna `AAAAMM` según el vencimiento (con `-2`, `-3`… si ese lote ya existe para el producto); si se escribe, se respeta.
- [x] AC4 — El vencimiento acepta `dd/mm/aaaa`, `mm/aaaa` y `mm/aa` (se guarda el último día del mes), y debe ser futuro.
- [x] AC5 — Cada línea tiene «unidades por presentación» (1 por defecto). Se sugiere el número de `X N` de la descripción cuando la unidad es CAJ o PAQ. Stock = cantidad × unidades; costo por unidad = precio ÷ unidades redondeado al centavo; la fila muestra la diferencia de redondeo. Ejemplo: 2 CAJ `X 25` a S/ 62.50 → 50 unidades a S/ 2.50.
- [x] AC6 — «Otros gastos» (por ejemplo el envío) suma al total de la compra y no crea stock.
- [x] AC7 — «Total del documento» (opcional) muestra el cuadre: verde si suma de líneas + otros gastos coincide; rojo con la diferencia.
- [x] AC8 — Al registrar, se guardan los vínculos código del proveedor → producto (+ unidades por presentación). En la siguiente compra a ese proveedor, escribir o pegar el código elige el producto y las unidades solos.
- [x] AC9 — «Crear producto desde la línea» usa la descripción como nombre y exige precio de venta; un campo «margen %» sugiere el precio de venta de todas las filas nuevas (costo por unidad × (1 + margen), redondeado hacia arriba a 10 céntimos), editable fila por fila.
- [x] AC10 — «Pegar filas» recibe texto con columnas (tabulaciones, `;` o espacios múltiples) en el orden código, cantidad, unidad, descripción, vencimiento, precio, total y crea las filas; las que no se pudieron entender quedan marcadas.
- [x] AC11 — Cada fila se valida: cantidad × precio = total de línea (si hay total), vencimiento faltante o pasado, producto sin elegir, unidades o cantidad inválidas. Con filas en rojo no se puede registrar; las amarillas se registran tras confirmarlas.
- [x] AC12 — Teclado: Tab recorre los campos, Enter en el último campo de una fila agrega la siguiente con el foco, y hay botón para duplicar una fila (mismo producto, otro lote) y para quitarla.
- [x] AC13 — La compra en curso se guarda como borrador en el navegador; al volver se ofrece restaurarla o descartarla, y se borra al registrar.
- [x] AC14 — Registrar sigue siendo todo o nada, con los permisos y la auditoría del spec 007; los proveedores y vínculos nuevos se guardan en la misma transacción.
- [x] AC15 — El historial muestra fecha del documento, proveedor, ítems y total (con otros gastos).

## Datos
Migración `0007`:
- `suppliers` (id, name, `name_key` único: nombre sin mayúsculas ni espacios repetidos).
- `supplier_products` (id, supplier_id, supplier_code, product_id, `units_per_package` ≥ 1; único por proveedor y código).
- `purchases`: `supplier_id` (FK, nulo), `document_date` (fecha, nulo = día del registro), `other_charges` (entero ≥ 0, 0 por defecto). `purchases.total` pasa a incluir `other_charges`.
La cantidad y el costo de `purchase_items` quedan en unidades.

## API
| Método | Ruta | Permiso | Cambio |
|---|---|---|---|
| POST | `/api/purchases` | `purchases.create` (+ los de 007) | acepta `documentDate`, `otherCharges`, lote opcional, `supplierCode` y `unitsPerPackage` por ítem; el proveedor va por nombre |
| GET | `/api/suppliers?q=` | `purchases.create` | sugerencias `[{id,name}]` |
| GET | `/api/suppliers/[id]/products` | `purchases.create` | vínculos `[{supplierCode,productId,productName,unitsPerPackage}]` |
| GET | `/api/products/names` | `products.read` | `[{id,commercialName,genericName,laboratory}]` de los activos, para emparejar por descripción en el navegador |

## Reutilizar
`createPurchase`, `createPurchaseSchema`, `createLotIn`, `purchaseTotal`, `findDuplicateLot`, `ProductPicker`, `toCents`, `formatSoles`, `todayLima`, `addDays`, patrón de hooks y de `Can`; el historial de 007.

## Tareas
- [x] T1 — Tablas `suppliers`, `supplier_products` y columnas nuevas de `purchases`; migración `0007` · `src/server/db/schema/`, `drizzle/`
- [x] T2 — Reglas puras con tests: vencimiento mes/año, unidades sugeridas desde la descripción, costo por unidad y redondeo, lote automático, validación por fila, cuadre, margen sugerido, parser de filas pegadas, emparejar por descripción (palabras en común) · `src/lib/purchase-rules.ts`, `src/lib/match.ts` y sus tests
- [x] T3 — Repositorio de proveedores y vínculos · `src/server/repositories/supplier.repository.ts`
- [x] T4 — `createPurchase`: proveedor por nombre, fecha, otros gastos, lote opcional, vínculos y unidades · `src/server/services/purchase.service.ts`, `src/modules/purchases/schemas.ts`
- [x] T5 — Rutas de proveedores y de nombres de productos · `src/app/api/suppliers/**`, `src/app/api/products/names/route.ts`
- [x] T6 — Servicios axios y hooks de proveedores, vínculos y catálogo · `src/modules/purchases/{services,hooks}`
- [x] T7 — Formulario en tabla: una fila por producto, conversión de unidades, estado por fila, teclado, duplicar y quitar · `src/modules/purchases/components/`
- [x] T8 — Cabecera de la compra: proveedor con sugerencias, fecha, otros gastos, total del documento con cuadre, margen % · `src/modules/purchases/components/`
- [x] T9 — Pegar filas · `src/modules/purchases/components/paste-rows-dialog.tsx`
- [x] T10 — Borrador automático en el navegador · `src/modules/purchases/hooks/use-draft.ts`
- [x] T11 — Historial con fecha del documento, proveedor y total · `src/modules/purchases/components/purchases-table.tsx`, `purchase.repository.ts`
- [x] T12 — Estado del spec en el README

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **Spec 009 (después):** subir imagen o PDF, OCR local (Tesseract.js, gratis y sin API), lectura columna por columna con una plantilla por proveedor que se ajusta una vez sobre la imagen, resaltado de las celdas dudosas junto a la imagen, y unión de varias fotos o páginas por número de ítem. Rellena la tabla de este spec; el usuario valida y corrige antes de registrar.
- Decisiones a confirmar: lote automático `AAAAMM`; vencimiento mes/año al último día del mes; margen redondeado hacia arriba a 10 céntimos; unidades sugeridas solo para CAJ y PAQ (las demás unidades, como FCO, UND o SOB, 1).
- El costo se guarda tal como figura en el documento (con IGV), como pidió el usuario.
- Las unidades sugeridas desde la descripción son una ayuda: `X 25` puede ser el contenido de la caja, pero el sistema nunca lo da por hecho sin que se vea y se pueda editar.
- Si el precio no divide exacto entre las unidades, el costo por unidad pierde fracciones de centavo y el total de la compra puede diferir del documento en unos centavos; se muestra la diferencia.
- La imagen del documento no se guarda ni se envía al servidor en ninguno de los dos specs.
- El código de barras no interviene: se eliminó en el spec 003.

## Estado de implementación
Código completo (T1-T12). `typecheck`, `lint`, `test` (82/82) y `build` pasan; migración `0007` aplicada.
Verificado contra Neon con un script sobre `createPurchase` (datos temporales, limpiados): proveedor creado y reutilizado aunque se escriba con otras mayúsculas y espacios (AC1), fecha del documento y otros gastos guardados (AC2, AC6 en servidor), lote automático `AAAAMM` con sufijo `-2`, `-3` y lote escrito respetado (AC3), vínculos código → producto aprendidos y actualizados (AC8), todo o nada con proveedor y vínculos nuevos (AC14) e historial por fecha del documento (AC15).
Verificado con pruebas unitarias de las reglas: vencimiento mes/año (AC4), unidades y costo por unidad (AC5), cuadre (AC7), margen (AC9), lectura de filas pegadas incluida la cotización real de 16 líneas que suma S/ 929.50 (AC10), validación por fila (AC11).
Interfaz (AC4-AC7, AC9-AC13 y la parte visual de AC1, AC2 y AC15) verificada a mano por el usuario en el navegador con la cotización de HealTec.

## Desviaciones
- `PurchaseRow.unitsEdited` y `productSource: "manual"` sin producto: marcan que la persona tocó las unidades o quitó un vínculo, para que lo aprendido no se los pise.
- Los vínculos aprendidos se aplican al mostrar (derivados), no al guardar la fila; al editar una fila se fija lo que mostraba.
- `GET /api/suppliers*` exige `purchases.create`; `GET /api/products/names` exige `products.read`.
- El tope de líneas de una compra sube de 100 a 200.
- Se quitó el formulario de tarjetas del spec 007 (`purchase-form.tsx`, `purchase-item-fields.tsx`) y su esquema de formulario.
- `searchByTerm` (búsqueda mientras se escribe) y `parsePastedRows` viven en `src/lib/`.

## Review
Reviewer (007 y 008 juntos): rechazado en la primera vuelta por 5 MAYOR, aprobado en la segunda (2/2).
Corregidos:
- «Confirmar todas» ya no confirma las sugerencias por descripción: se confirman una por una (una sugerencia confirmada se aprende como vínculo).
- Editar el código de una fila vinculada rompe el vínculo (`applyEdit`) y restaura las unidades sugeridas.
- El auto-emparejado separa número y unidad (`500MG` = `500mg`) y no sugiere un producto si la descripción trae una concentración o volumen que el candidato no tiene.
- El buscador de producto es un combobox accesible con teclado, y el foco pasa al campo siguiente al elegir.
- El formulario replica los topes del servidor (precio, precio de venta, unidades, total de la compra, 200 filas) y el error muestra el detalle del campo.
- Borrador por usuario, limpiado aunque el formulario se cierre durante el registro; fila con solo la marca de producto nuevo o un precio ya no se descarta en silencio; lote automático nunca toma el número de un lote escrito en la misma compra; productos inactivos rechazados y sin vínculos; vencimiento `mm/aa` al pegar; avisos si falla la carga del catálogo o de los vínculos; nombres accesibles con número de fila; fecha vacía del documento permitida.
Menores no corregidos, a propósito:
- Compras de cientos de ítems hacen unas 7 consultas por ítem dentro de la transacción (riesgo de tiempo agotado); no afecta compras de decenas de líneas.
- Si `/api/me` falla, el borrador no se guarda y no hay aviso; el banner del borrador puede aparecer tarde (ahora el botón avisa que restaurar reemplaza lo escrito).
- «100 TAB» sin `x` y `1,5` frente a `1.5` pueden impedir una sugerencia automática; caen al buscador.
