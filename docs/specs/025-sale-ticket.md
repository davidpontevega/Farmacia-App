---
id: 025
title: Ticket de la venta (imprimir y enviar por WhatsApp)
status: done
module: sales
scope: cashier
---

# 025 — Ticket de la venta

## Objetivo
Al cobrar, mostrar la constancia de la venta lista para imprimir en una ticketera térmica de 80 mm (o guardar como PDF) y, si el cliente la quiere, enviarla por WhatsApp.

## Contexto
- Hoy, al cobrar, solo sale un aviso con el número y el vuelto (`payment-dialog.tsx`); no hay nada que entregar al cliente.
- Es una **constancia interna**, no un comprobante de pago SUNAT. Debe decirlo en el propio ticket.
- La ticketera (Xprinter E200L, 80 mm, USB/LAN) aún no llega. Se imprime con el navegador (`window.print()` y CSS de impresión): mientras no haya impresora, el diálogo de impresión permite «Guardar como PDF»; con la impresora instalada como predeterminada el mismo botón imprime en papel.
- Un solo puesto de caja.

## Alcance
Incluye: ventana de ticket tras cobrar con «Imprimir», «Enviar por WhatsApp» y «Cerrar»; estilos de impresión para 80 mm; datos del negocio (nombre, RUC, dirección) por variables de entorno; texto plano del ticket para WhatsApp.
No incluye: reimprimir desde el Historial, ticket de devoluciones o anulaciones, abrir gaveta, impresión directa por USB/ESC/POS, guardar el teléfono del cliente, comprobantes electrónicos SUNAT, lote y vencimiento por ítem.

## Criterios de aceptación
- [x] AC1 — Al confirmar el pago con éxito, se abre una ventana con el ticket de esa venta (y el carrito se vacía como hoy). Se cierra con «Cerrar» o Esc; no vuelve a abrirse para esa venta.
- [x] AC2 — El ticket muestra, en este orden: nombre del negocio, RUC y dirección; título «CONSTANCIA DE VENTA» y la leyenda «No válida como comprobante de pago»; número de la venta, fecha y hora (zona Lima) y cajero; una línea por producto con cantidad, nombre, precio unitario y subtotal; total; forma de pago con los montos (efectivo, Yape/Plin) y vuelto cuando lo hay; pie «Gracias por su compra». Sin lote, vencimiento ni datos de personas distintos del nombre del cajero.
- [x] AC3 — Nombre, RUC y dirección salen de `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_RUC` y `NEXT_PUBLIC_BRAND_ADDRESS` (con valores por defecto: NicFarma, 10710802004, Jr. Daniel Alcides Carrión S/N, Sihuas - Áncash). Se documentan en `.env.example`.
- [x] AC4 — «Imprimir» llama a `window.print()`. Con CSS de impresión solo se imprime el ticket (nada del resto de la pantalla), con `@page { size: 80mm auto; margin: 0 }`, ancho útil ≈ 72 mm, tipografía monoespaciada, sin colores ni sombras; los importes alineados a la derecha. La vista previa en pantalla usa el mismo ancho.
- [x] AC5 — «Enviar por WhatsApp» abre `https://wa.me/<número>?text=<ticket en texto plano>` en una pestaña nueva. Un campo opcional «Celular del cliente» (9 dígitos que empiezan con 9; se antepone 51) dirige el mensaje a ese chat; vacío, WhatsApp deja elegir el contacto. Número inválido: mensaje de error y no se abre WhatsApp. El teléfono no se guarda ni se registra en ningún sitio.
- [x] AC6 — El texto de WhatsApp contiene los mismos datos que el ticket (AC2) en líneas cortas legibles, con los importes en `S/ 0.00`.
- [x] AC7 — El ticket se arma con los datos de la venta ya hecha: el resultado de `POST /api/sales` incluye `userName` y el cliente toma los ítems (nombre, cantidad, precio) del carrito antes de vaciarlo. No hay consultas nuevas ni migraciones.
- [x] AC8 — Accesibilidad: la ventana tiene título («Venta <número> registrada»), foco inicial en «Imprimir», botones con nombre accesible y el campo de celular con etiqueta; contraste suficiente.
- [x] AC9 — Arquitectura: el armado del texto, el formato de líneas y la validación/URL de WhatsApp son funciones puras en `src/lib/ticket.ts`; los componentes no tocan la base de datos.
- [x] AC10 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: líneas del ticket (cantidades, subtotales, pago mixto, vuelto 0), texto de WhatsApp, validación del celular y URL generada (con y sin número, con codificación de caracteres).

## Datos
Sin migraciones. Se añade `userName` a `CreateSaleResult` (el servicio ya conoce al usuario que cobra).

## Decisiones tomadas
- Impresión con el navegador y no con ESC/POS directo: funciona hoy con PDF y mañana con la ticketera sin cambiar código. Para imprimir sin diálogo se abre Chrome con `--kiosk-printing` y se deja la Xprinter como predeterminada (se anota en el README).
- Sin reimpresión: pedido expreso. Si el cajero cierra la ventana sin imprimir, no hay forma de recuperarla desde la app; se reconsidera si hace falta.
- Sin ticket para devoluciones/anulaciones por ahora.
- WhatsApp por enlace `wa.me` con texto: no requiere cuenta de API ni PDF adjunto (wa.me no admite adjuntos).
- El número de venta actual usa el prefijo `B001-`, que en Perú es el de una boleta. Como el ticket es una constancia, se deja como está para no tocar la numeración existente, pero conviene cambiarlo a otro prefijo (p. ej. `C001-`) en otro spec antes de operar con clientes reales.
- Un clic fuera de la ventana del ticket no la cierra (solo «Cerrar» o Esc), porque sin reimpresión un clic accidental perdería el ticket.
- `@page { size: 80mm auto }` es global: hoy no hay otra impresión en la app; acotarlo si aparece.
- Probar una vez un ticket largo con «Guardar como PDF» antes de poner la ticketera en producción.
