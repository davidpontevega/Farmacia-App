---
id: 020
title: Nombres alternativos de producto (alias) para búsqueda y receta
status: done
module: products
scope: all
---

# 020 — Nombres alternativos (alias)

## Objetivo
Que un producto se encuentre también por otros nombres con que lo piden en recetas y en el mostrador (marcas, abreviaturas, nombre del principio activo), para que la receta asistida y la búsqueda acierten más.

## Contexto
- Las recetas escriben «Ondansetrón 8 mg» y el catálogo tiene «ONDAPRIM 8MG AMP»; hoy esa línea queda «No encontrado» aunque el producto exista.
- El emparejado actual solo mira nombre comercial, genérico y laboratorio.

## Alcance
Incluye: campo «Nombres alternativos» por producto (administración), búsqueda y emparejado por alias, y una pista visible cuando el producto coincide por un alias.
No incluye: aprender alias solo a partir de lo que elige el cajero en una receta, importación masiva, sinónimos globales fuera de un producto.

## Criterios de aceptación
- [ ] AC1 — `products.aliases` (lista de texto, vacía por defecto): hasta 10 alias, cada uno de 2–60 caracteres, sin caracteres de control, sin repetir (sin distinguir tildes ni mayúsculas) y distintos del nombre comercial. Migración `0013`; los productos existentes quedan sin alias.
- [ ] AC2 — El formulario de Nuevo/Editar producto tiene «Nombres alternativos»: se escribe uno y se pulsa Enter o coma para añadirlo; cada uno se quita con un botón. Quien tiene `products.create` o `products.update` los edita; Zod valida en la API y rechaza con 400 lo inválido; el cambio queda en la auditoría como cualquier edición.
- [ ] AC3 — `GET /api/products` con `q` y con `names` también coincide por alias (sin tildes ni mayúsculas), igual que por nombre comercial y genérico. La respuesta incluye `aliases` y qué alias coincidió.
- [ ] AC4 — El emparejado de `match.ts` considera cada alias como un candidato más: la puntuación del producto es la **mejor** entre su etiqueta habitual y cada alias por separado (para que los alias extra no diluyan la coincidencia). Cambia el comportamiento de Compras, Receta y Faltantes de forma coherente; los tests existentes siguen pasando.
- [ ] AC5 — Cuando un producto se muestra como resultado por coincidir con un alias (caja, receta, consulta), una línea discreta lo indica: «Coincide con «alias»».
- [ ] AC6 — Tests de: validación de la lista (límites, repetidos con tildes, igual al nombre comercial), `score`/`bestMatches` con alias (mejor de varias etiquetas, sin dilución) y la pista de coincidencia por alias. `npm test`, `typecheck`, `lint` y `build` pasan.

## Datos
Migración `0013`: `products.aliases text[] not null default '{}'`.

## Decisiones tomadas
- Solo administración edita alias: es información del catálogo que afecta a todos.
- La puntuación por mejor etiqueta evita que añadir alias empeore las coincidencias existentes.
- Aprender alias desde la receta (con confirmación del administrador) queda para una versión posterior.
