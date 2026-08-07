import { NOMBRES_CADENAS } from './cadenas.ts'

export interface Resumen {
  productos: number
  ahorro: number
}

export function calcularResumen(
  items: ReadonlyArray<{ precios: ReadonlyArray<{ precio: number }> }>,
): Resumen {
  let productos = 0
  let ahorro = 0
  for (const p of items) {
    if (p.precios.length < 2) continue
    let min = Infinity
    let max = -Infinity
    for (const { precio } of p.precios) {
      if (precio < min) min = precio
      if (precio > max) max = precio
    }
    productos++
    ahorro += max - min
  }
  return { productos, ahorro }
}

export interface PrecioItem {
  cadena: string
  precio: number
}

export interface ItemConPrecios {
  nombreMostrado: string
  precios: PrecioItem[]
}

export interface CadenaResumen {
  cadena: string
  total: number
  faltan: number
}

export interface ProductoAsignado {
  nombreMostrado: string
  cadena: string
}

export interface ResumenDetallado {
  totalProductos: number
  sinDatos: string[]
  cadenas: CadenaResumen[]
  optimoCombinado: number
  mejorCadena: string | null
  ahorroExtra: number | null
  asignacion: ProductoAsignado[]
}

const ORDEN_CADENAS: readonly string[] = [...NOMBRES_CADENAS, 'Otras']

const redondear = (n: number) => Math.round(n * 100) / 100

export function calcularResumenDetallado(items: readonly ItemConPrecios[]): ResumenDetallado {
  const comprables = items.filter((p) => p.precios.length > 0)
  const sinDatos = items.filter((p) => p.precios.length === 0).map((p) => p.nombreMostrado)

  // a) total por cadena: suma los precios de los productos que tiene cada una
  const porCadena = new Map<string, { total: number; con: number }>()
  for (const p of comprables) {
    for (const { cadena, precio } of p.precios) {
      const c = porCadena.get(cadena) ?? { total: 0, con: 0 }
      c.total += precio
      c.con++
      porCadena.set(cadena, c)
    }
  }
  const cadenas = [...porCadena.entries()]
    .map(([cadena, v]) => ({
      cadena,
      total: redondear(v.total),
      faltan: comprables.length - v.con,
    }))
    .sort((a, b) => a.total - b.total)

  const indiceOrden = (cadena: string) => {
    const i = ORDEN_CADENAS.indexOf(cadena)
    return i === -1 ? ORDEN_CADENAS.length : i
  }

  // b) óptimo combinado + d) dónde conviene comprar cada producto
  const asignacion: ProductoAsignado[] = []
  let optimo = 0
  for (const p of comprables) {
    let mejorPrecio = Infinity
    let mejorCadena = ''
    let mejorIndice = Infinity
    for (const { cadena, precio } of p.precios) {
      const i = indiceOrden(cadena)
      if (precio < mejorPrecio || (precio === mejorPrecio && i < mejorIndice)) {
        mejorPrecio = precio
        mejorCadena = cadena
        mejorIndice = i
      }
    }
    optimo += mejorPrecio
    asignacion.push({ nombreMostrado: p.nombreMostrado, cadena: mejorCadena })
  }
  optimo = redondear(optimo)

  // c) mejor opción de un solo lugar = cadena más barata que tenga el 100% de la lista
  const completa = cadenas.find((c) => c.faltan === 0) ?? null
  const ahorroExtra = completa ? redondear(completa.total - optimo) : null

  return {
    totalProductos: comprables.length,
    sinDatos,
    cadenas,
    optimoCombinado: optimo,
    mejorCadena: completa?.cadena ?? null,
    ahorroExtra,
    asignacion,
  }
}
