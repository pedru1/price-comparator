import type { PrecioEnSucursal } from '../services/preciosClaros.ts'

// ponytail: heurística de cadenas por coincidencia de texto en bandera/razón social.
// El texto se aplanan acentos para que "Chango Más" y "LA ANÓNIMA" matcheen.
const CADENAS: ReadonlyArray<readonly [patron: string, nombre: string]> = [
  ['coto', 'Coto'],
  ['carrefour', 'Carrefour'],
  ['vea', 'Vea'],
  ['chango', 'Chango Más'],
  ['jumbo', 'Jumbo'],
  ['disco', 'Disco'],
  ['dia', 'Dia'],
  ['makro', 'Makro'],
  ['libertad', 'Libertad'],
  ['naldo', 'Naldo'],
  ['anonima', 'La Anónima'],
  ['frate', 'Fraté'],
]

const aplanar = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

export const NOMBRES_CADENAS: readonly string[] = CADENAS.map(([, nombre]) => nombre)

export function cadenaDe(p: { banderaDescripcion: string; comercioRazonSocial: string }): string {
  const nombre = aplanar(`${p.banderaDescripcion} ${p.comercioRazonSocial}`)
  for (const [patron, nombreCadena] of CADENAS) {
    if (nombre.includes(patron)) return nombreCadena
  }
  return 'Otras'
}

export function precioEfectivo(p: PrecioEnSucursal): number | null {
  const candidatos = [p.precioLista, p.promo1Precio, p.promo2Precio].filter(
    (n): n is number => n !== null,
  )
  if (candidatos.length === 0) return null
  return Math.min(...candidatos)
}

export interface PrecioMinimo {
  cadena: string
  sucursalId: string
  sucursalNombre: string
  precio: number
}

export function minimoPorCadena(precios: PrecioEnSucursal[]): PrecioMinimo[] {
  const mejor = new Map<string, PrecioMinimo>()
  for (const p of precios) {
    const precio = precioEfectivo(p)
    if (precio === null) continue
    const cadena = cadenaDe(p)
    const actual = mejor.get(cadena)
    if (!actual || precio < actual.precio) {
      mejor.set(cadena, {
        cadena,
        sucursalId: p.sucursalId,
        sucursalNombre: p.sucursalNombre,
        precio,
      })
    }
  }
  return [...mejor.values()].sort((a, b) => a.precio - b.precio)
}
