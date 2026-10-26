---
id: 009
title: Leer la cotización desde una imagen o PDF (OCR en el navegador)
status: done
module: purchases
scope: admin
---

# 009 — Leer la cotización desde una imagen o PDF

## Objetivo
El administrador sube la imagen o el PDF de la cotización que le pasa el proveedor, el sistema la lee en el navegador (sin costo ni API), rellena la tabla de compras del spec 008 marcando lo dudoso, y él valida y corrige antes de registrar.

## Contexto
- El documento de referencia es la cotización de HealTec: una tabla limpia y regular (ITEM, CÓDIGO, CANT, UM, DESCRIPCIÓN, Expiración, PRECIO, TOTAL), con total e IGV al pie, que llega como imagen o PDF **sin texto copiable**.
- Pruebas hechas con el OCR gratuito (Tesseract.js) sobre la copia de 812 píxeles de ancho:
  - Leer la línea entera: cantidad y precio bien, pero códigos y total casi siempre mal, y 12 a 13 de 16 líneas.
  - **Leer columna por columna** (números solo con dígitos, códigos solo con letras y números): cantidad 16/16, vencimiento 16/16 (incluida la fila que no lo trae), total 16/16, precio 15/16, descripción casi perfecta, unidad 14/16, código 3/16. El único error de precio (5.50 leído como 9.50) lo detecta la regla cantidad × precio = total.
  - **Los encabezados se encuentran solos**: 8 de 8 con su posición, de donde salen las columnas.
- Las fotos de las facturas tomadas con el celular (inclinadas, con sombra, con marcas de lapicero) se leen mucho peor (entre la mitad y 14 de 15 vencimientos según la foto): quedan para un spec posterior.

## Alcance
Incluye: subir imagen o PDF de una cotización limpia, lectura local columna por columna con detección automática de columnas, relleno de la tabla del spec 008 con marcas de lo dudoso, sugerencia del número, la fecha y los totales del documento, visor de la imagen junto a la tabla con la fila enfocada resaltada.
No incluye: fotos inclinadas o con sombra (corrección de perspectiva), guardar una plantilla por proveedor, ajustar las columnas a mano sobre la imagen, leer lotes de la factura o de la guía de remisión, guardar la imagen del documento, IA de pago.

## Criterios de aceptación
- [ ] AC1 — Se aceptan imágenes PNG, JPG y WebP y PDF de hasta 15 MB; otro tipo o tamaño se rechaza con un mensaje. Cada página de un PDF se convierte a imagen de al menos 2.000 px de ancho.
- [ ] AC2 — La lectura corre en el navegador sin enviar el archivo a ningún servidor ni guardarlo; muestra el avance, la pantalla sigue respondiendo y se puede cancelar.
- [ ] AC3 — El sistema busca la fila de encabezados (ITEM, CÓDIGO, CANT, UM, DESCRIPCIÓN, Expiración, PRECIO, TOTAL) y calcula las 8 columnas a partir de sus posiciones. Si no la encuentra, lo dice con claridad y quedan disponibles «Pegar filas» y la tabla manual.
- [ ] AC4 — Cada columna se lee por separado con su juego de caracteres (cantidad, precio, total y número de ítem solo dígitos y punto; vencimiento solo dígitos y `/`; código solo letras mayúsculas y dígitos; unidad solo letras). Las filas se alinean por el número de ítem; la cantidad de filas sale de «TOTAL REGISTROS» o, si no se lee, del último ítem hallado.
- [ ] AC5 — Con la cotización de referencia, la capa de reconstrucción (sobre las lecturas medidas) deja correctas la cantidad, el vencimiento y el total de las 16 filas y al menos 14 de 16 precios, y **todo valor numérico incorrecto queda marcado** por una validación (cantidad × precio ≠ total, vencimiento faltante, pasado o muy lejano).
- [ ] AC6 — Correcciones automáticas conservadoras: la unidad se ajusta a la lista conocida (CAJ, UND, SOB, FCO, PAQ, BOL, TUB, ROL…) si difiere en un carácter («UNO» → UND); si no, queda vacía y marcada; el código se normaliza (letras en la parte de letras, dígitos en la parte numérica); coma decimal → punto.
- [ ] AC7 — Las filas entran en la tabla del spec 008 igual que las pegadas: vinculadas por código aprendido, sugeridas por descripción (a confirmar una por una), unidades sugeridas, validación por fila. Las celdas con poca confianza del OCR o con validación fallida salen resaltadas.
- [ ] AC8 — Si se leen, se proponen el número de documento, la fecha, el subtotal, el IGV y el total del documento, en los campos de la cabecera, marcados «leído, verifica» y editables. El «TOTAL IMPORTE» alimenta el cuadre del spec 008.
- [ ] AC9 — La imagen se ve junto a la tabla con zoom; al enfocar una fila se resalta su franja en la imagen.
- [ ] AC10 — Leer agrega filas a la tabla (no borra lo escrito) y nada se guarda hasta «Registrar compra», que mantiene todas las reglas del spec 008.
- [ ] AC11 — La imagen y el texto leído viven solo en memoria: se descartan al cerrar el visor o la página.
- [ ] AC12 — Errores claros y sin dejar estado a medias: archivo ilegible, PDF sin páginas, fallo al cargar el motor de OCR.
- [ ] AC13 — Una cotización de 16 líneas se lee en 30 segundos o menos en un equipo de oficina; el motor se descarga una vez y el navegador lo guarda.

## Datos
Sin migraciones ni cambios de API. Nada se envía al servidor: el archivo se procesa en el navegador.
Dependencias nuevas, solo en el cliente: `tesseract.js` (motor de OCR, corre en un worker con WebAssembly; el idioma español se descarga la primera vez desde un CDN y el navegador lo conserva) y `pdfjs-dist` (convertir páginas de PDF en imagen).

## Reutilizar
Spec 008: tabla de compras, `PurchaseRow`, `rowFromPasted`, `applyLinks`, `applyAutoMatch`, `rowIssues`, `parseExpiry`, `suggestUnitsPerPackage`, cuadre con el total del documento, cabecera de la compra. `cleanNumber` y `parsePastedRows` de `paste-rows.ts`. Prototipos de lectura en el historial de esta conversación (columnas, anclas de fila por ajuste lineal, comprobación cantidad × precio).

## Tareas
- [x] T1 — Agregar `tesseract.js` y `pdfjs-dist`; configurar el worker de PDF y comprobar que compilan con Next · `package.json`, `next.config.ts`
- [x] T2 — Reglas puras de diseño con tests: encontrar el encabezado entre las palabras leídas, calcular las columnas (cada columna empieza 4 px antes del encabezado de la siguiente), posiciones de fila por ajuste lineal sobre los ítems hallados, asignar lecturas a filas · `src/lib/ocr/layout.ts`, `layout.test.ts`
- [x] T3 — Reglas puras de corrección con tests: unidad por distancia de edición, código, números, fecha, armar la fila y marcar lo dudoso, usando como datos de prueba las lecturas reales medidas · `src/lib/ocr/fix.ts`, `fix.test.ts`
- [x] T4 — Datos del documento con tests: número de cotización, fecha («viernes, 12 Junio, 2026»), subtotal, IGV y total, buscados en el texto leído de toda la hoja · `src/lib/ocr/document.ts`, `document.test.ts`
- [x] T5 — Motor del navegador: recortar columnas en un canvas, reconocer con el juego de caracteres de cada una, avance y cancelación · `src/lib/ocr/engine.ts`
- [x] T6 — Convertir un PDF en imágenes por página · `src/lib/ocr/pdf.ts`
- [x] T7 — `PurchaseRow` guarda qué campos son dudosos y la fila los resalta · `src/modules/purchases/rows.ts`, `purchase-row.tsx`
- [x] T8 — Panel «Leer cotización»: elegir archivo, avance, errores, visor con zoom y franja de la fila enfocada, agregar filas a la tabla y proponer los datos de la cabecera · `src/modules/purchases/components/`
- [x] T9 — Estado del spec en el README

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas
- **Criterio de aceptación real (a mano):** abrir en la pantalla la cotización original de HealTec (el archivo, no la captura) y comprobar que las 16 filas entran con lo dudoso marcado. Las pruebas automáticas cubren la reconstrucción, no el OCR en sí, que depende del navegador.
- Riesgos: el motor de OCR y el worker de PDF añaden peso al navegador (se cargan solo al abrir el panel); `pdfjs-dist` con el empaquetador de Next 16 puede pedir ajustes de configuración; el idioma del OCR necesita internet la primera vez (se puede servir desde el propio sitio más adelante).
- Medido solo con una imagen de 812 px. Si el archivo real es más nítido, la lectura debería mejorar; si es una foto, se aplica lo dicho en Contexto.
- Aprender por proveedor (guardar las columnas) y ajustar las columnas a mano sobre la imagen no se incluyen: la detección por encabezados bastó en la prueba. Si falla con otro proveedor, se agrega.
- Spec posterior (fotos): enderezar la hoja (detectar sus esquinas y corregir la perspectiva), leer el lote y el vencimiento de la factura, y cruzar con la guía de remisión, que repite cantidades, lotes y vencimientos y sirve de comprobación.
- Decisiones a confirmar: las páginas de un PDF se leen todas y las filas siguen la numeración; leer agrega filas y no reemplaza las existentes; el idioma del OCR se descarga del CDN la primera vez.
