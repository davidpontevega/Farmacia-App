---
id: 014
title: Constancia de pago por Yape/Plin (foto de la transferencia)
status: done
module: sales
scope: all
---

# 014 — Constancia de pago por Yape/Plin

## Objetivo
Que el cajero pueda tomar una foto de la transferencia (Yape o Plin) y guardarla junto a la venta, como respaldo ante reclamos o diferencias de caja.

## Contexto
- Los métodos de pago son `CASH`, `YAPE` y `MIXED`; «Yape» cubre también Plin. La foto aplica cuando `yapeAmount > 0` (Yape o mixto).
- Hoy no queda ninguna evidencia de que el cliente transfirió. El sistema solo guarda el monto.
- El proyecto se desplegará en Vercel: las fotos van a **Vercel Blob en modo privado** (un archivo privado no tiene URL pública; se sirve solo a través de la API, con permisos).
- La foto puede mostrar nombre y número del cliente: es dato personal. Por eso se guarda poco tiempo y se muestra a pocos.

## Alcance
Incluye: subir una foto por venta (desde cámara o galería) al cobrar con Yape/Plin, verla desde el detalle de la venta, aviso cuando falta, y borrado automático a los 90 días.
No incluye: leer el monto o el código de operación con OCR/IA, validar contra Yape, varias fotos por venta, reemplazar la foto una vez subida, foto para ventas en efectivo, ventas anuladas o devoluciones.

## Criterios de aceptación
- [ ] AC1 — En el diálogo de cobro, con método Yape o Mixto, hay un botón «Foto de la transferencia» (en celular abre la cámara; también admite galería). Es **opcional**: se puede confirmar la venta sin foto. Con efectivo no aparece.
- [ ] AC2 — La foto se reduce en el navegador antes de enviarse (máximo 1280 px de lado mayor, JPEG ~70 %) para que pese menos de 500 KB. Se acepta solo JPEG, PNG o WebP; el servidor rechaza con 400 otros tipos y archivos de más de 2 MB.
- [ ] AC3 — Primero se registra la venta (igual que hoy) y después se sube la foto a `POST /api/sales/[id]/proof` (multipart). Si la subida falla, la venta **no** se pierde: se avisa «La venta se registró, pero la foto no se pudo subir» y se puede reintentar desde el detalle de la venta.
- [ ] AC4 — Solo se puede subir si: el usuario tiene `sales.create`, es el autor de la venta, la venta es `COMPLETED` con `yapeAmount > 0`, no tiene foto aún y pasaron menos de 24 horas. Si no, 403/409 con mensaje claro.
- [ ] AC5 — La foto se guarda en Vercel Blob **privado** con ruta no adivinable (`proofs/<saleId>/<uuid>.<ext>`). En la venta solo se guarda esa ruta y la fecha de subida (`proof_path`, `proof_uploaded_at`, nulos por defecto).
- [ ] AC6 — `GET /api/sales/[id]/proof` entrega la imagen solo al autor de la venta o a quien tenga `reports.read` (misma regla que `GET /api/sales/[id]`), con `Cache-Control: private, no-store`. Cualquier otro recibe 403; sin foto, 404.
- [ ] AC7 — El detalle de venta muestra «Ver constancia» (se abre en un diálogo) si hay foto; si es Yape/Mixto y no hay foto, la etiqueta «Sin constancia». Las ventas en efectivo no muestran nada.
- [ ] AC8 — Un cron diario de Vercel (`/api/cron/purge-proofs`, protegido con `CRON_SECRET`) borra del Blob las fotos de más de 90 días y limpia `proof_path`. La venta y sus montos no se tocan.
- [ ] AC9 — Subir y borrar constancias queda en el registro de auditoría. Los Route Handlers validan con Zod; ningún componente accede a Blob ni a la base de datos directamente.
- [ ] AC10 — Variables nuevas documentadas en `.env.example`: `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`. Sin `BLOB_READ_WRITE_TOKEN` el botón de foto no se muestra y el cobro funciona como hoy.
- [ ] AC11 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: regla de quién puede subir/ver, validación de tipo y tamaño, y cálculo de «foto vencida» (90 días).

## Datos
Migración `0009`: `sales.proof_path text null`, `sales.proof_uploaded_at timestamptz null`. Sin cambios en datos existentes.

## Decisiones tomadas
- Opcional al inicio, con la etiqueta «Sin constancia» para que el administrador vea cuántas faltan; si luego se quiere obligatoria, es un cambio pequeño.
- 90 días: cubre los plazos normales de reclamo sin acumular datos personales.
- Privado + API con permisos en vez de URL pública: una URL filtrada no expone la foto.
- Una foto por venta y sin reemplazo: es evidencia, no se edita.

## Pendiente del usuario
- Crear un Blob store (privado) en el proyecto de Vercel y poner `BLOB_READ_WRITE_TOKEN` en `.env.local` y en Vercel; definir `CRON_SECRET`.
