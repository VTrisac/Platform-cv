# CV Studio · Aplicar

Rellena el formulario de candidatura del portal con el CV adaptado en CV Studio.
**Nunca pulsa enviar**: deja todo listo y confirmas tú.

## Instalar

1. `chrome://extensions` → activa **Modo de desarrollador** (arriba a la derecha).
2. **Cargar descomprimida** → elige esta carpeta (`extension/`).
3. Listo. En CV Studio, el botón «Aplicar» ya la encuentra.

No está en la Chrome Web Store a propósito: es para un usuario y publicarla
metería cada cambio en una cola de revisión.

## Qué hace

```
CV Studio  ──postMessage──►  bridge.js  ──►  sw.js  ──abre la pestaña──►  portal
                                                                            │
                                            rellenar.js  ◄──────────────────┘
                                              ├ abre el formulario si hace falta
                                              ├ mapea cada campo por su etiqueta
                                              ├ adjunta el PDF adaptado
                                              ├ lo que no sabe → /api/answers
                                              ├ pasa de paso mientras no falte nada
                                              └ panel con lo hecho y lo que falta
```

| Fichero | Qué es |
|---|---|
| `campos.js` | La tabla etiqueta→dato. Lógica pura, sin DOM. La prueba `scripts/apply-test.js`. |
| `rellenar.js` | El que toca el formulario del portal. |
| `bridge.js` | Content script en el origen de CV Studio; el único que habla con la web. |
| `sw.js` | Guarda el paquete, abre la pestaña y llama a `/api/answers`. |
| `popup.js` | La bóveda de contraseñas de las cuentas que se han creado. |

## Portales

Greenhouse, Lever, Ashby, Workable, LinkedIn, Workday, SmartRecruiters,
Recruitee, Teamtailor, Personio y Factorial. Para uno nuevo, añádelo a
`host_permissions` y a `content_scripts` en `manifest.json`.

Probado a fondo contra formularios reales de **Greenhouse** (11 campos + CV) y
**Lever** (10 campos + CV) el 18-08-2026.

## Los botones: las tres reglas

Recorrer un alta de cuenta o un formulario de varias pantallas obliga a pulsar
botones. Cuáles se pulsan y cuáles no está en `campos.js` (`botonPara`), y las
reglas de cuándo, en `rellenar.js`:

| Clase | Ejemplos | Cuándo se pulsa |
|---|---|---|
| `enviar` | Submit Application, Send Application, Enviar candidatura, Finish | **Nunca.** La lista existe para reconocerlo y no tocarlo. Gana sobre las otras dos: «Continue and submit» es `enviar`. |
| `abrir` | Apply for this job, Easy Apply, Create Account | Solo **antes de escribir nada**. Si resultara ser el envío de un formulario vacío, no hay nada que enviar. |
| `siguiente` | Next, Continue, Save and Continue, Review | Solo con el paso **relleno y sin ningún campo obligatorio pendiente**. Si queda uno en naranja, se para y te espera. |

Techo de 6 pasos, contados en `sw.js` y no en la página: un alta de verdad
*navega*, así que el content script arranca de cero en cada pantalla y perdería
la cuenta. Un formulario que se repitiera a sí mismo te dejaría dando vueltas.

La contraseña del alta también se genera en `sw.js`, **una por pestaña**. Cuando
la generaba la página, cada pantalla escribía una distinta y el alta no llegaba a
completarse nunca.

### LinkedIn, en concreto

Lo que se puede hacer es el **Easy Apply asistido**: el modal multi-paso, en la
sesión que ya tienes abierta, en la oferta que tú has mandado. Una cada vez.

Lo que **no** hay, y no es por no haberlo intentado:

- LinkedIn **no tiene API pública** de candidaturas ni de búsquedas guardadas.
- Automatizar tu sesión autenticada —leer tus recomendadas, aplicar en masa— va
  contra sus términos y el riesgo real es que te restrinjan la cuenta.

Por eso el feed usa el **buscador público de invitado** (`jobs-guest/…`), que no
pide login: se puede paginar y filtrar por antigüedad sin poner tu cuenta de por
medio. No lo cambies por scraping autenticado para sacar unas ofertas más.

## Límites

- **No envía.** Ese botón es tuyo, siempre, incluso al final de un alta de seis
  pantallas.
- **No lee tu correo**, así que no completa la verificación de una cuenta nueva.
  La contraseña que genere está en el popup, con botón de copiar.
- Un campo que no sabe qué es y el formulario no exige se deja en blanco. Si lo
  exige, se lo pregunta al modelo con la oferta y tu CV delante; si el CV no lo
  respalda, se queda vacío y marcado en naranja. Nunca se inventa una respuesta.

## Si algo falla

`chrome://extensions` → **Inspeccionar vistas: service worker** para los logs de
`sw.js`; la consola de la pestaña del portal para los de `rellenar.js`.

Tras recargar la extensión hay que **refrescar la pestaña de CV Studio**: el
puente se queda inyectado apuntando a una extensión que ya no existe. Lo dice
con esas palabras en vez de fallar en silencio.
