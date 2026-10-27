---
id: 012
title: Ubicación del producto en el estante
status: done
module: products
scope: all
---

# 012 — Ubicación del producto (estante y fila)

## Objetivo
Que quien atiende sepa al instante dónde está cada producto («Estante 3 · Fila 2») al elegirlo en caja, sin preguntar ni buscar con la vista, y que el administrador pueda registrar y corregir esa ubicación.

## Contexto
- Los productos están físicamente en estantes con filas (se contaron de arriba hacia abajo). Hoy el sistema no guarda dónde está cada uno.
- La ubicación es del **producto**, no del lote: los lotes de un mismo producto se guardan juntos.
- Los estantes hay que rotularlos físicamente (por ejemplo del 1 en adelante, y filas de arriba abajo) para que el dato sirva; eso lo hace el personal, no el sistema.

## Alcance
Incluye: dos campos opcionales por producto (estante y fila), edición en el formulario de producto, y mostrar la ubicación en caja, en la tabla de Productos y en Inventario.
No incluye: plano del local, varias ubicaciones por producto, ubicación por lote, importación masiva desde Excel, buscar productos por ubicación, ubicación al crear un producto desde una compra (se completa luego en Productos).

## Criterios de aceptación
- [ ] AC1 — Cada producto tiene «Estante» y «Fila», ambos opcionales, de texto corto (hasta 20 caracteres, para admitir «3», «A» o «3B»). Se guardan sin espacios sobrantes; vacío equivale a «sin ubicación».
- [ ] AC2 — El formulario de Nuevo/Editar producto tiene los dos campos. Quien tiene `products.create` o `products.update` los puede cambiar; sin esos permisos no se ve el formulario (igual que hoy). Cambiarlos queda en el registro de auditoría como cualquier edición del producto.
- [ ] AC3 — La ubicación se muestra como «Estante 3 · Fila 2». Con solo estante: «Estante 3». Con solo fila: «Fila 2». Sin datos no se muestra nada (ni guiones ni «Sin ubicación» en caja).
- [ ] AC4 — En `/pos`, cada tarjeta de producto muestra la ubicación y, al agregarlo, la línea del carrito la conserva, para que el cajero sepa a dónde ir por cada producto.
- [ ] AC5 — La tabla de Productos tiene una columna «Ubicación». En Inventario, la lista de productos y la cabecera del producto elegido la muestran.
- [ ] AC6 — Las rutas de API validan con Zod y rechazan con 400 una ubicación de más de 20 caracteres o con caracteres de control. No cambian los permisos de ninguna ruta.
- [ ] AC7 — Los productos existentes quedan sin ubicación; no se toca ningún dato.
- [ ] AC8 — Contraste y objetivos táctiles como en el spec 011; la ubicación no solo se distingue por color.
- [ ] AC9 — `npm test`, `typecheck`, `lint` y `build` pasan. Hay tests de la función que da formato a la ubicación y de la validación.

## Datos
Migración `0008`: dos columnas nulas en `products` — `shelf text` y `shelf_row text`, con `check (char_length <= 20)`. Sin relleno de datos.

## Decisiones tomadas
- Estante y fila separados (no un texto libre) para poder filtrar o agrupar por estante más adelante.
- Ubicación por producto, no por lote.
