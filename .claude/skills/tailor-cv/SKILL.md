---
name: tailor-cv
description: Adapta el CV (src/data.js) a una oferta de trabajo pegada como argumento. Reordena y reescribe perfil, logros y skills para encajar con la oferta, sin inventar nada.
argument-hint: <texto completo de la oferta>
---

# Tailor CV

Adapta el CV a la oferta pegada en $ARGUMENTS.

## Pasos

1. **Baseline**: ejecuta `git status --short src/data.js`. Si hay cambios sin commitear, avisa: probablemente queda un tailoring anterior; pregunta si restaurar primero (`git restore src/data.js`) o partir de la versión actual.
2. Lee `src/data.js` completo (`dataES` y `dataEN`, misma estructura).
3. Analiza la oferta: rol exacto, keywords técnicas, seniority, dominio.
4. Edita `src/data.js` en sitio:
   - `title`: alinéalo con el nombre del rol solo si la experiencia real lo respalda.
   - `profile`: reescríbelo (3-4 frases máx.) usando el vocabulario de la oferta, con hechos que ya están en el CV.
   - `experience`: no toques `project` ni `dates` ni el orden cronológico. Reescribe `description` y `achievements` para enfatizar lo relevante; dentro de cada puesto ordena los `achievements` de más a menos relevante. Reordena `tech` poniendo primero lo que pide la oferta.
   - `skills`: reordena dentro de cada categoría, lo pedido primero.
   - `certifications`: solo reordenar (las relevantes primero); nunca añadir ni renombrar.
   - Aplica los MISMOS cambios en `dataES` y `dataEN` (traducción fiel en cada idioma).

## Reglas duras

- **Nunca inventes**: ni experiencia, ni tecnologías, ni métricas, ni fechas, ni empresas, ni certificaciones. Solo reformular, reordenar y enfatizar lo existente.
- No toques: `contact`, `dates`, `education`, `languages`, `labels`, nombres de proyectos/empresas.
- No elimines puestos de `experience`.
- Longitud: igual o menor. Debe seguir cabiendo en 1 página de PDF: perfil <= 4 líneas, <= 3 achievements por puesto, frases cortas.
- Si la oferta pide algo que el CV no tiene, NO lo añadas: menciónalo al usuario al final como gap.

## Cobertura ATS

Tras editar, extrae de la oferta las keywords duras (tecnologías, herramientas, metodologías, título del rol) y comprueba cuáles aparecen literalmente en `dataEN`. Imprime:

- `Cobertura: N/M (X%)`
- `Faltan: <keyword — dónde encajaría, o "gap real, no inventar">`

Solo cuenta literales: un ATS busca strings, no sinónimos. Si una keyword falta pero el CV tiene el equivalente real (p. ej. pide "LangGraph" y tienes "LangChain"), dilo, no lo sustituyas.

## Al terminar

1. Resume los cambios en 2-4 líneas y lista los gaps detectados.
2. Indica: "Arranca `npm run dev`, elige diseño y pulsa el botón PDF (imprime con 'Guardar como PDF')."
3. Indica: "Para volver al CV maestro: `git restore src/data.js` (o pídemelo)."
