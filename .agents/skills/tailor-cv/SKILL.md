---
name: tailor-cv
description: Adapta el CV (src/data.js) a una oferta de trabajo, pasada como URL o como texto pegado. Scrapea la oferta si es URL, reordena y reescribe perfil, logros y skills para encajar, sin inventar nada, y verifica que el PDF pasa el parseo ATS.
argument-hint: <URL de la oferta, o su texto completo>
---

# Tailor CV

Adapta el CV a la oferta de $ARGUMENTS.

## Pasos

0. **Si $ARGUMENTS es una URL**, baja el texto antes de nada:
   `npm run oferta -- "<URL>" --out ofertas/<AAAA-MM-DD>-<empresa>-<rol>.md`
   Si el script avisa de que la oferta exige login, pide el texto pegado y sigue.
   Guarda esa ruta: la necesitas en el paso de verificación.
   Del volcado extrae: rol exacto, empresa, ubicación/modalidad, idioma del CV,
   stack pedido, seniority y dominio. El volcado de LinkedIn trae ~40 líneas de
   morralla de su interfaz al principio y al final: ignóralas.
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

## Cobertura ATS (criterio — lo pones tú)

Tras editar, extrae de la oferta las keywords duras (tecnologías, herramientas, metodologías, título del rol) y comprueba cuáles aparecen literalmente en `dataEN`. Imprime:

- `Cobertura: N/M (X%)`
- `Faltan: <keyword — dónde encajaría, o "gap real, no inventar">`

Solo cuenta literales: un ATS busca strings, no sinónimos. Si una keyword falta pero el CV tiene el equivalente real (p. ej. pide "LangGraph" y tienes "LangChain"), dilo, no lo sustituyas.

**Nunca**: texto blanco sobre blanco, keywords en tamaño 0, bloques ocultos ni listas de tecnologías que no ha tocado. Los ATS extraen el texto invisible igual que el visible, y un recruiter que lo ve descarta por fraude. La ventaja se saca de que el PDF se parsee bien y de ordenar lo cierto, no de esconder nada.

## Verificación del PDF (mecánico — lo comprueba el script)

El tailoring no sirve de nada si el PDF no se deja leer. Genera el PDF ATS y audítalo:

```
npm run build
npm run pdf -- --design 5 --lang en --out CV_ATS_EN.pdf
npm run ats CV_ATS_EN.pdf ofertas/<la-oferta>.md
```

`scripts/ats.js` extrae el texto con pdfminer (el motor que hay bajo la mayoría de ATS) y falla con exit 1 si: hay pocas fechas parseables, hay texto roto por `tracking-*`, o algún string de `data.js` no se extrae como palabra suelta. Si sale ⚠, arréglalo antes de enviar; no lo des por bueno.

**El diseño 5 (ATS) es el único que envías a un portal.** Los diseños 0-4 son bonitos pero usan rejillas de 2-3 columnas y `tracking-*` en las fechas: el extractor entrelaza las columnas y las fechas salen como `F E B .  2 0 2 6`, así que el ATS no puede calcular tu antigüedad. Úsalos para adjuntar en un email a una persona o para el portfolio, no para subirlos a un formulario.

## Al terminar

1. Resume los cambios en 2-4 líneas y lista los gaps detectados.
2. Pega la salida de `npm run ats`.
3. Indica: "Para volver al CV maestro: `git restore src/data.js` (o pídemelo)."
