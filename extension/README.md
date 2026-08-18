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
                                              ├ mapea cada campo por su etiqueta
                                              ├ adjunta el PDF adaptado
                                              ├ lo que no sabe → /api/answers
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

## Límites

- **No envía.** Ese botón es tuyo.
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
