---
id: 021
title: Ampliar el diccionario de síntomas y registrar las consultas sin resultado
status: approved
module: consult
scope: all
---

# 021 — Diccionario de síntomas: crecer con datos

## Objetivo
Ampliar el diccionario de la consulta por síntoma con más situaciones comunes de botica y empezar a registrar lo que los cajeros buscan y no se encuentra, para que el diccionario crezca con lo que de verdad se pregunta.

## Contexto
- El spec 013 trajo 23 grupos del sistema anterior; el diccionario vive en `src/lib/symptoms.ts` y no tiene forma de saber qué le falta.
- Es contenido sanitario: los grupos nuevos deben ser revisados por un químico farmacéutico antes de usarse con clientes. El sistema orienta sobre qué hay en el local; no diagnostica ni receta.

## Alcance
Incluye: unos 14 grupos nuevos de síntomas (en código, con sus principios activos y marca de «Requiere receta»), registro anónimo de consultas sin resultado y una lista para administración.
No incluye: editar el diccionario desde la pantalla, uso de IA, interacciones o contraindicaciones, guardar quién consultó, guardar consultas que sí tuvieron resultado.

## Criterios de aceptación
- [ ] AC1 — Grupos nuevos en `src/lib/symptoms.ts`, cada uno con palabras clave (como lo dice el cliente), categoría, principios activos y descripción de uso: acné; quemaduras leves y quemadura de sol; herpes labial; hemorroides; piojos; congestión nasal y sinusitis; dolor articular; piernas cansadas y várices; aftas y dolor de boca; pañalitis y dermatitis; picadura de insectos; ojo seco; colesterol y ácido úrico; deshidratación (suero). Los principios que exigen receta entran en la lista de «Requiere receta» del spec 013.
- [ ] AC2 — El diccionario sigue siendo datos puros y testeados: cada grupo nuevo tiene palabras clave únicas respecto a los demás (sin que una palabra dispare dos grupos por error), ningún psicotrópico, y tests de que una frase típica de cada grupo nuevo lo encuentra.
- [ ] AC3 — Cuando una consulta no encuentra nada («No encontré coincidencias»), el navegador la envía a `POST /api/consult/misses` (permiso `products.read`). El servidor la normaliza (sin tildes ni mayúsculas, espacios simples) y la guarda **solo si** tiene hasta 6 palabras, hasta 80 caracteres y ningún dígito (frases más largas pueden traer nombres o datos de un paciente y se descartan). No se guarda quién consultó.
- [ ] AC4 — Tabla `symptom_misses` (texto normalizado único, contador, primera y última vez). Una consulta repetida suma 1 al contador (`insert … on conflict do update`). Validación con Zod. Sin límite de envíos por usuario: el tope de longitud y el upsert (una fila por texto) ya acotan el tamaño de la tabla.
- [ ] AC5 — `GET /api/consult/misses` (permiso `shortages.read`, el de administración) devuelve las 100 consultas sin resultado con más repeticiones en los últimos 90 días; y la pantalla `/consulta` muestra, a quien tenga ese permiso, el bloque «Consultas sin resultado» con el texto, las veces y la última vez. Un botón «Quitar» (permiso `products.update`) borra una fila ya atendida.
- [ ] AC6 — Una purga mantiene la tabla pequeña: las filas con última vez de hace más de 90 días se borran en el mismo cron diario del spec 014 (`/api/cron/purge-proofs` pasa a llamar a ambas purgas), sin perder el comportamiento actual.
- [ ] AC7 — `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: normalización y regla de qué se guarda (límites de palabras, longitud, dígitos), y los grupos nuevos (AC2).

## Datos
Migración `0014`: tabla `symptom_misses` (`id`, `query` único, `count`, `first_at`, `last_at`). Sin datos personales.

## Decisiones tomadas
- Contenido en código y no editable en pantalla: es información sanitaria que debe revisarse como cualquier cambio.
- Sin guardar usuario ni consultas largas: lo que se escribe en un buscador puede incluir datos de un paciente.
- Los grupos nuevos son un borrador técnico; **un químico farmacéutico debe revisarlos** antes de usarlos con clientes.

## Pendiente del usuario
- Que un químico farmacéutico revise los grupos y principios activos nuevos antes de producción.
