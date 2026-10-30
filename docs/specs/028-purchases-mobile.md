---
id: 028
title: Compras en celular (aviso, columna fija y barra de acciones)
status: approved
module: purchases
scope: admin
---

# 028 — Compras en celular

## Objetivo
Que desde el celular se pueda revisar una compra y registrarla sin perder de vista qué producto se está editando ni tener que subir a buscar el botón, y que quien abra la carga desde un teléfono sepa que está pensada para computadora.

## Contexto
- La tabla de carga (`/admin/purchases`, pestaña «Nueva compra») tiene 11 columnas y mide más de 1 000 px; en 390 px se desplaza de lado y se pierde el producto al ver cantidad o vencimiento.
- «Registrar compra» y «Cancelar» están arriba de todo; tras revisar las filas hay que volver a subir.
- La columna «Resultado» NO se puede ocultar en celular: muestra errores y avisos de la fila y el botón «Confirmar», sin el cual no se puede registrar.
- El historial y el detalle de una compra ya se adaptan a pantallas chicas (fuera de alcance).
- El mismo patrón de barra fija al pie ya se usa en Ventas (spec 027).

## Alcance
Incluye, solo por debajo de `lg`: un aviso, la columna «Producto» fija al desplazar, ocultar la columna «Lote» y una barra fija al pie con el total y las acciones principales.
No incluye: filas como tarjetas, cambios en escritorio, en la lectura de facturas (OCR), en el visor del documento, en las validaciones, en la API ni en la base de datos; el historial.

## Criterios de aceptación
- [ ] AC1 — Desde `lg` hacia arriba la pantalla queda exactamente igual que hoy. Nada de lo que sigue existe allí.
- [ ] AC2 — Por debajo de `lg`, arriba del formulario aparece un aviso: «Cargar una compra es más cómodo en una computadora. En el celular puedes revisar y registrar.» Se puede cerrar con una X; al cerrarlo no vuelve a salir hasta recargar la página. No bloquea nada y no aparece en la pestaña «Historial».
- [ ] AC3 — Por debajo de `lg`, al desplazar la tabla de lado la columna «Producto» queda fija a la izquierda, con fondo opaco y un borde o sombra que la separe, para ver siempre de qué producto son los demás campos. El campo de producto sigue funcionando (escribir, elegir sugerencia, vincular).
- [ ] AC4 — Por debajo de `lg` se oculta la columna «Lote» (encabezado y celdas): es opcional y, vacía, se genera sola. Las filas con un lote ya escrito, venga de lectura de factura o de pegado, lo conservan y se envía igual al registrar. Ninguna otra columna se oculta; «Resultado» y «Confirmar» siguen visibles.
- [ ] AC5 — Por debajo de `lg` los botones «Cancelar» y «Registrar compra · S/ X» del encabezado se reemplazan por una barra fija al pie con: el total de la compra, «Cancelar» y «Registrar compra». Los dos hacen lo mismo que hoy, incluida la confirmación al descartar. En `lg` o más, los de arriba siguen como están y la barra no existe.
- [ ] AC6 — «Registrar compra» de la barra se deshabilita exactamente cuando hoy lo está el de arriba (`canSubmit`) y muestra «Registrando…» mientras se envía. Si no puede registrar, la barra no esconde el motivo: los mensajes de errores, avisos y cuadre del bloque de totales siguen en la página.
- [ ] AC7 — La barra se oculta mientras hay un diálogo abierto (pegar filas, detalle) para no superponerse; al cerrarlo reaparece. Solo se muestra en la pestaña «Nueva compra».
- [ ] AC8 — La barra no tapa contenido: la página reserva espacio inferior y respeta el área segura del celular (`env(safe-area-inset-bottom)`); los botones miden al menos 44 px de alto.
- [ ] AC9 — Accesibilidad: la barra se alcanza con teclado; el total se anuncia a lectores de pantalla como `role="status"` fuera del botón; el aviso es texto con botón «Cerrar aviso»; la columna fija no cambia el orden de tabulación.
- [ ] AC10 — La decisión de mostrar el aviso y la barra no depende de lógica nueva de negocio; `npm test`, `typecheck`, `lint` y `build` pasan. Se agrega un test solo si aparece una función pura nueva.
- [ ] AC11 — Verificación manual a 360 px y 390 px (cargar filas, desplazar de lado, registrar desde la barra, cancelar, abrir «Pegar filas» con la barra visible) y a 1024 px o más para confirmar que escritorio no cambió.

## Datos
Sin migraciones ni cambios de API. Usa el estado del formulario que ya existe.

## Decisiones tomadas
- Aviso en vez de rediseñar: capturar decenas de filas en un teléfono no es el uso esperado; se ayuda a revisar y registrar, no a digitar.
- Solo se oculta «Lote»: «Resultado» lleva errores, avisos y «Confirmar» (obligatorio para registrar); «P. venta» sirve para productos nuevos.
- Barra fija con el mismo patrón que Ventas (spec 027) para que se vea y se comporte igual.
- Las filas como tarjetas quedan fuera: es otro modo de captura y pediría su propio spec.
- Riesgo a vigilar en la verificación manual: que la lista de sugerencias del campo de producto no se recorte con la columna fija.
