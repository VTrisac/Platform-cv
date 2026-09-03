// El catálogo de diseños, compartido por el editor y el visor de impresión.
//
// Los `id` son los que entiende `scripts/pdf.py --design N`, y por eso están
// salteados: 5 es el ATS y 3 son las Tarjetas, que son los cuatro PDF del repo.
// NO los renumeres para que queden bonitos: renumerarlos cambia qué PDF genera
// `npm run pdf` sin que nada falle a la vista.
import { lazy } from 'react'

export const DESIGNS = [
  { id: 5, name: 'ATS', load: () => import('./Design6ATS') },
  { id: 0, name: 'Minimalista', load: () => import('./Design1Minimal') },
  { id: 3, name: 'Tarjetas', load: () => import('./Design4Cards') },
]

export const components = DESIGNS.map((d) => lazy(d.load))

// Del id de la URL a la posición en DESIGNS. -1 si no es uno de los tres.
export const porId = (id) => DESIGNS.findIndex((d) => d.id === Number(id))
