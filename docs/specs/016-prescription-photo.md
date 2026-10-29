---
id: 016
title: Receta asistida, etapa 2 (foto recortada a lista, piloto con Gemini gratis)
status: done
module: sales
scope: all
---

# 016 — Receta asistida, etapa 2: foto de la receta a texto

## Objetivo
Que el cajero fotografíe la receta, **recorte solo la zona de los medicamentos** y obtenga la lista escrita en el diálogo «Receta» del spec 015, lista para revisar y mandar al carrito. Es un piloto con el plan gratuito de Gemini.

## Contexto
- Decisión del usuario: piloto con Gemini gratis y recorte obligatorio sin el nombre del paciente.
- **Riesgo de privacidad, a conocer antes de usarlo con recetas reales.** Los términos de la API de Gemini para servicios sin pago dicen que Google usa lo que se envía y las respuestas para mejorar sus productos, que personas pueden leerlo, y piden no enviar información sensible, confidencial ni personal. Una receta es dato de salud. El recorte reduce el riesgo (sin paciente, sin diagnóstico, sin firma) pero **no lo elimina**. Por eso: (a) es piloto, (b) hay interruptor de apagado, (c) el paso a producción es activar facturación en el proyecto de Google (con eso rigen los términos de pago, donde el contenido no se usa para mejorar productos) y fijar un tope de gasto; el código no cambia, solo la clave. Datos de salud en Perú caen bajo la Ley 29733: conviene validar con un asesor antes de producción.
- El texto devuelto **nunca se agrega solo al carrito**: cae en el cuadro de texto del spec 015 y el cajero confirma cada producto. La letra de médico puede leerse mal; la foto recortada se muestra al lado para comparar.
- Los límites exactos del plan gratuito no están publicados en la documentación (se ven en el panel de Google AI Studio) y no están garantizados; el sistema debe tratar un 429 como caso normal.

## Alcance
Incluye: botón «Foto de la receta» en el diálogo del spec 015, recorte obligatorio en el navegador, envío de la imagen recortada al servidor, lectura con Gemini, líneas en el cuadro de texto, límite de uso por usuario, interruptor por variable de entorno.
No incluye: guardar la foto o su texto (en ningún lado), leer nombre/edad/diagnóstico del paciente, enviar la foto completa, otros proveedores de IA (queda aislado para cambiarlo), lectura automática sin revisión, historial de recetas.

## Criterios de aceptación
- [ ] AC1 — En el diálogo «Receta» (paso del texto) hay «Foto de la receta» solo si el servidor tiene `GEMINI_API_KEY`. Sin la clave el botón no aparece y todo funciona como en el spec 015 (interruptor de apagado: quitar la clave).
- [ ] AC2 — Tras elegir la foto se abre un paso de **recorte obligatorio**: el cajero dibuja un rectángulo (con el dedo o el mouse) sobre la zona de los medicamentos. No hay botón para enviar la foto completa: «Leer receta» queda deshabilitado hasta que haya un recorte válido (mínimo 10 % y máximo 70 % del área de la foto) y esté marcada la casilla «El recorte no incluye nombre ni datos del paciente».
- [ ] AC3 — Junto al selector se muestra siempre el aviso: «Piloto: la imagen recortada se envía a Google (plan gratuito) para leerla. No incluyas datos del paciente.»
- [ ] AC4 — Solo se envía la imagen **recortada**, reducida a 1280 px de lado mayor, re-codificada como JPEG en el navegador (esto elimina los metadatos de la foto original, como ubicación). Menos de 1 MB.
- [ ] AC5 — `POST /api/prescriptions/read` (multipart) exige `sales.create`, valida con Zod/`proofFileError`-style (JPEG, ≤1 MB, firma de bytes verificada) y llama a Gemini desde el servidor (modelo en `GEMINI_MODEL`, por defecto `gemini-3.5-flash-lite`). La clave nunca llega al navegador. Un componente no llama a Google; sigue la arquitectura servicio → ruta → proveedor.
- [ ] AC6 — La instrucción al modelo pide: transcribir solo medicamentos, uno por línea, con concentración y cantidad si aparecen («Amoxicilina 500 mg x 21»); **ignorar** nombres de personas, edades, diagnósticos, firmas y sellos; **no adivinar** lo ilegible (marcarlo con «?»). La respuesta se pide como JSON de líneas y se valida en `src/lib/prescription-read.ts` (puro): máximo 30 líneas, 120 caracteres por línea, se descartan líneas vacías o con caracteres de control.
- [ ] AC7 — Las líneas leídas se vuelcan en el cuadro de texto del spec 015 (editable), junto a la miniatura del recorte para comparar, con el aviso «Revisa cada línea: puede haber errores de lectura». Las líneas con «?» se ven resaltadas. No se busca ni se agrega nada hasta que el cajero pulse «Buscar productos» como siempre.
- [ ] AC8 — No se guarda nada: ni la imagen ni el texto leído (ni en base de datos, ni en Blob, ni en logs). El registro de auditoría guarda solo `prescription.read` (reserva del cupo) y `prescription.read_result` (cantidad de líneas), con el usuario. La miniatura vive en memoria del navegador y se descarta al cerrar el diálogo.
- [ ] AC9 — Límite de uso: máximo 15 lecturas por usuario cada 10 minutos, contado en `audit_logs` (no en memoria, porque en Vercel cada petición puede ir a otra instancia). Excederlo da 429 con mensaje claro. Un 429 o error de Google se muestra como «El lector de recetas no está disponible ahora; escribe las líneas a mano» y el cuadro de texto sigue usable.
- [ ] AC10 — Estados de carga («Leyendo receta…», cancelable), error y vacío claros; cámara o galería en celular; accesible por teclado donde aplique (el recorte con el dedo/mouse tiene alternativa: botones «Recortar al centro»/«Quitar recorte» no sustituyen la regla de AC2, pero permiten ajustar sin arrastrar).
- [ ] AC11 — `.env.example` documenta `GEMINI_API_KEY` y `GEMINI_MODEL`. `npm test`, `typecheck`, `lint` y `build` pasan. Tests de: validación del recorte (área mínima/máxima, fuera de límites), parseo de la respuesta (JSON válido, con basura, más de 30 líneas, líneas largas, caracteres de control, «?») y ventana del límite de uso.

## Datos
Sin migraciones: el límite se cuenta sobre `audit_logs` existente.

## Criterio del piloto (fuera de los AC)
Con 10 recetas reales (recortadas) se anota cuántas líneas salen correctas, cuántas con error y cuántas ilegibles. Si menos de 7 de cada 10 líneas salen bien, no vale la pena seguir y se vuelve a escribir a mano o se amplía el diccionario.

## Decisiones tomadas
- Recorte obligatorio y en el navegador: lo que no se recorta nunca sale del equipo del cajero.
- Sin almacenamiento de ningún tipo: no hay nada que retener ni purgar.
- **Latencia del plan gratuito (29/10/2026).** Una receta pequeña tardaba 17-27 s con `gemini-3.5-flash-lite` y el límite de 30 s cortaba la lectura con «no está disponible»; `gemini-3.5-flash` respondía 503 «alta demanda». Ahora se consultan a la vez `GEMINI_MODEL` y los modelos de respaldo (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`); gana el primero con una lectura válida, los otros se cancelan, el tiempo máximo es 55 s (`maxDuration = 60` en la ruta) y el mensaje distingue «muy ocupado» (cupo, 429) de «no disponible». Medido: 3-5 s. Cada lectura cuenta una sola vez en el límite de uso del spec, aunque se consulten varios modelos.
- El lector es reemplazable: la llamada a Gemini queda en un solo archivo de servidor (`src/server/ai/prescription-reader.ts`) para cambiar de proveedor o pasar al plan de pago sin tocar pantallas.
- Límite conocido: que la imagen sea un recorte solo se exige en el navegador; el servidor no puede saber qué contiene. Quien llame a la API directamente con una sesión de cajero válida podría enviar una foto completa. Se acepta en el piloto (el cajero es personal de confianza y ya tiene acceso a las recetas); la auditoría registra cada lectura.
- El cupo de 15 lecturas se reserva con un candado por usuario antes de llamar a Google (así peticiones simultáneas no lo saltan); el resultado se registra aparte como `prescription.read_result`.
- El cupo se consume aunque Google falle: protege contra abuso y contra gastar la cuota gratuita en reintentos.
- La IA propone texto, el humano decide: el resultado pasa por la misma confirmación del spec 015.

## Pendiente del usuario
- Crear una clave en Google AI Studio (aistudio.google.com/apikey) y ponerla en `.env.local` como `GEMINI_API_KEY`. Sin ella solo se pueden probar las partes puras.
- Antes de usarlo con recetas de clientes reales, decidir si se activa facturación en el proyecto de Google (recomendado) y validar la Ley 29733 con un asesor.
