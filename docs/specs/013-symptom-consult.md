---
id: 013
title: Consulta de medicamentos por síntoma
status: done
module: consult
scope: all
---

# 013 — Consulta por síntoma

## Objetivo
Que el cajero escriba lo que le pasa al cliente («dolor de cabeza», «pastilla para los riñones») y el sistema le muestre qué productos del local sirven para eso, con stock, precio y ubicación en el estante.

## Contexto
- El sistema anterior tenía la pantalla «Consulta de medicamentos»: un diccionario fijo de 23 grupos de síntomas (palabras clave → categoría → principios activos → texto de uso) que se cruzaba con el stock. Es de solo lectura y no da diagnóstico.
- Ese sistema tenía fallos que aquí se corrigen: coincidía con **todos** los productos sin nombre genérico (comparaba contra un texto vacío), no ignoraba tildes ni mayúsculas, y mostraba productos inactivos.
- El spec 012 añade la ubicación del producto; esta pantalla la muestra.

## Alcance
Incluye: pantalla `/consulta` con buscador, sugerencias rápidas, resultados con stock, precio y ubicación, aviso médico, y las últimas 5 consultas de la sesión.
No incluye: editar el diccionario desde la pantalla (queda en el código), agregar el producto a la venta desde aquí, diagnóstico, interacciones entre medicamentos, contraindicaciones, uso de IA.

## Criterios de aceptación
- [ ] AC1 — Pantalla `/consulta` con ítem «Consulta» en el menú, para quien tenga `products.read` (cajero y administrador).
- [ ] AC2 — El diccionario (los 23 grupos del sistema anterior, con sus palabras clave, categoría, principios activos y descripción) vive en `src/lib/symptoms.ts` como datos y funciones puras, sin acceso a base de datos.
- [ ] AC3 — La búsqueda ignora mayúsculas y tildes («cefalea», «Cefálea»). Primero se buscan los grupos cuyas palabras clave aparecen en lo escrito; si no hay, se prueba palabra por palabra (palabras de más de 3 letras) contra palabras clave y principios activos. Sin coincidencias se muestra «No encontré coincidencias» y 6 sugerencias.
- [ ] AC4 — De los grupos coincidentes se juntan los principios activos sin repetir. Se muestran los **productos activos** cuyo nombre comercial o genérico contiene alguno (sin tildes ni mayúsculas); un producto sin nombre genérico no coincide por eso. Cada resultado: nombre, genérico, precio, stock vendible, ubicación (formato del spec 012) y el texto de uso.
- [ ] AC5 — Los productos con stock vendible > 0 van primero (los vencidos no cuentan como stock vendible, igual que en caja). Los sin stock se muestran atenuados y con la etiqueta «Sin stock». Los principios que no están en el catálogo se listan como referencia, máximo 3, sin precio ni stock.
- [ ] AC6 — Se muestra siempre el aviso «Se recomienda consultar con un médico para un diagnóstico adecuado». Ningún texto afirma un diagnóstico.
- [ ] AC7 — La consulta de productos usa la API existente `GET /api/products` ampliada con el parámetro `names` (lista de hasta 30 nombres de hasta 60 caracteres, validada con Zod); mismo permiso `products.read`. No se crea otra ruta.
- [ ] AC8 — Sugerencias rápidas (8 botones), «Enter» consulta, estados de carga y de error claros, y las últimas 5 consultas de la sesión (solo en memoria, no se guardan).
- [ ] AC9 — Accesible: campo con etiqueta, resultados en lista, cantidades de stock como texto (no solo color), contraste del spec 011.
- [ ] AC10 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: coincidencia por clave, por palabra, sin coincidencias, tildes/mayúsculas, principios sin repetir, y el caso del producto sin genérico.
- [ ] AC11 — (enmienda) Los productos cuyo principio activo exige receta (antibióticos, antihipertensivos, antidiabéticos, ondansetrón, metoclopramida) llevan la etiqueta «Requiere receta» en el resultado. Los psicotrópicos (alprazolam) se quitan del diccionario: no se sugieren.

## Datos
Sin migraciones. El diccionario es un archivo de código.

## Decisiones tomadas
- El diccionario queda fijo en código: es contenido sanitario que debe revisarse como cualquier cambio, no editarse a la ligera desde una pantalla.
- Sin IA: la coincidencia es por palabras clave, predecible y gratuita.
