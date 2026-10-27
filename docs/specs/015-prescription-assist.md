---
id: 015
title: Receta asistida, etapa 1 (lista de medicamentos a carrito, sin IA)
status: done
module: sales
scope: all
---

# 015 — Receta asistida, etapa 1

## Objetivo
Que el cajero pase una receta larga al carrito en una sola pantalla: escribe o pega la lista de medicamentos (una línea por medicamento), el sistema propone el producto del catálogo para cada línea con su stock y ubicación, el cajero confirma, y todo entra al carrito de una vez.

## Contexto
- Hoy cada medicamento de una receta se busca y se agrega uno por uno; con recetas de 8–15 líneas (por ejemplo antes de una operación) tarda y el cliente espera.
- Ya existe el emparejado de texto con catálogo (`src/lib/match.ts`: `bestMatches`, `autoMatch`) usado en Compras, y la ubicación del producto (spec 012).
- **Esta etapa no usa IA ni lee fotos.** Es la parte que sirve igual cuando la lista viene de un humano o, más adelante, de una foto. La etapa 2 (foto de la receta a texto) será otro spec (016) y reutiliza esta pantalla.
- Límite honesto: con esta etapa sola, alguien tiene que teclear o pegar las líneas. El ahorro grande llega con la etapa 2; aquí se gana en no buscar producto por producto y en ver stock y ubicación juntos.

## Alcance
Incluye: botón «Receta» en `/pos`, diálogo con cuadro de texto, propuesta de producto por línea, cantidad por línea, confirmar y agregar al carrito.
No incluye: lectura de fotos o IA (spec 016), alias de nombres comerciales por producto, guardar ni imprimir la receta, validar dosis o interacciones, marcar venta con receta en reportes, dividir por unidades (tabletas sueltas).

## Criterios de aceptación
- [ ] AC1 — En `/pos` hay un botón «Receta» (visible con turno abierto, junto al buscador). Abre un diálogo con un cuadro de texto: «Una línea por medicamento», con ejemplo («Amoxicilina 500 mg x 21»).
- [ ] AC2 — Cada línea no vacía se interpreta: la cantidad es el número tras «x» o «#» al final («x 21», «#21»); si no hay, es 1. Un número al inicio seguido de la descripción («2 paracetamol 500») también es la cantidad. Máximo 30 líneas; las demás se avisan y se ignoran. Lógica en `src/lib/prescription.ts` como funciones puras.
- [ ] AC3 — Para cada línea se buscan candidatos en el catálogo activo con la API existente `GET /api/products?names=…` (término principal de la línea) y se ordenan con `bestMatches`. Se muestran hasta 3 candidatos por línea con nombre, stock vendible, precio y ubicación (formato del spec 012). No se crea otra ruta.
- [ ] AC4 — Si `autoMatch` encuentra una coincidencia clara (misma regla que Compras: números compatibles y ventaja sobre la segunda), queda preseleccionada y marcada «Sugerido». Si no, la línea queda «Por elegir» sin preselección. Nunca se agrega nada sin que el cajero lo vea.
- [ ] AC5 — El cajero puede, por línea: elegir otro candidato, cambiar la cantidad (1–9999, entero), o descartar la línea. Una línea sin candidatos dice «No encontrado en el catálogo» y no bloquea las demás.
- [ ] AC6 — Candidatos sin stock vendible se muestran atenuados con «Sin stock», no se pueden elegir (stock en texto, no solo color). La cantidad no puede pasar del stock visto; se avisa si la receta pide más.
- [ ] AC7 — «Agregar al carrito» agrega todas las líneas elegidas con su cantidad (usa el mismo store del carrito; un producto repetido suma, igual que hoy), cierra el diálogo y avisa «N productos agregados». Si no hay ninguna línea elegida el botón está deshabilitado.
- [ ] AC8 — Accesible: cuadro con etiqueta, candidatos como grupo de opciones por línea (radio), teclado completo, estados de carga y error claros, contraste del spec 011. Usable en celular.
- [ ] AC9 — Permisos y datos: mismo permiso que `/pos` (`sales.create`) y `products.read` para la búsqueda. No hay migraciones ni datos nuevos; el texto de la receta no se guarda ni se envía a ningún servicio externo (solo los términos de búsqueda al propio servidor).
- [ ] AC10 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: cantidad con «x», «#» y al inicio; línea vacía; tope de 30 líneas; término principal de la línea; y que una línea sin coincidencia clara no se preseleccione.

## Datos
Sin migraciones.

## Decisiones tomadas
- Reutilizar `match.ts` y `GET /api/products?names=` en vez de crear un buscador nuevo: ya probados con Compras y con la consulta por síntoma.
- Preselección solo con coincidencia clara; ante duda, el cajero elige. Es un medicamento: un error silencioso es peor que un clic extra.
- Sin IA en esta etapa: no hay costo, ni datos de pacientes saliendo del local.

## Para el spec 016 (etapa 2, no se hace aquí)
Foto de la receta a texto. Antes hay que decidir el proveedor de IA (el plan gratuito de Gemini puede usar el contenido para mejorar productos de Google; con datos de pacientes eso exige recorte obligatorio sin nombre del paciente, o un proveedor de pago/local). Se decide cuando esta etapa esté en uso.
