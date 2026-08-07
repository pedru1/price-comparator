import { db, type PrecioRegistrado } from './database.ts'
import { minimoPorCadena, type PrecioMinimo } from './cadenas.ts'
import {
  getPreciosProducto,
  type Producto,
  type Sucursal,
} from '../services/preciosClaros.ts'

export interface PrecioPorCadena {
  cadena: string
  sucursalId: string
  sucursalNombre: string
  precio: number
}

export interface ProductoListado {
  id: number
  idProductoPreciosClaros: string
  nombreBusqueda: string
  nombreMostrado: string
  fechaAgregado: Date
  precios: PrecioPorCadena[]
  fechaUltimaConsulta: Date | null
}

function filasPrecio(productoId: number, minimos: PrecioMinimo[]): PrecioRegistrado[] {
  const fechaConsulta = new Date()
  return minimos.map((m) => ({
    productoId,
    cadena: m.cadena,
    sucursalId: m.sucursalId,
    sucursalNombre: m.sucursalNombre,
    precio: m.precio,
    fechaConsulta,
  }))
}

async function consultarPrecios(idProducto: number, idPreciosClaros: string, sucursales: Sucursal[]) {
  const r = await getPreciosProducto(idPreciosClaros, sucursales)
  if (!r.ok) throw new Error(r.error)
  const filas = filasPrecio(idProducto, minimoPorCadena(r.data))
  if (filas.length > 0) await db.precios.bulkAdd(filas)
}

export async function agregarProducto(opts: {
  idProductoPreciosClaros: string
  nombreBusqueda: string
  producto: Producto
  sucursales: Sucursal[]
}): Promise<'agregado' | 'yaExiste'> {
  const existente = await db.productos
    .where('idProductoPreciosClaros')
    .equals(opts.idProductoPreciosClaros)
    .first()
  if (existente) return 'yaExiste'

  const r = await getPreciosProducto(opts.idProductoPreciosClaros, opts.sucursales)
  if (!r.ok) throw new Error(r.error)

  await db.transaction('rw', db.productos, db.precios, async () => {
    const id = await db.productos.add({
      idProductoPreciosClaros: opts.idProductoPreciosClaros,
      nombreBusqueda: opts.nombreBusqueda,
      nombreMostrado: opts.producto.nombre,
      fechaAgregado: new Date(),
    })
    const filas = filasPrecio(id, minimoPorCadena(r.data))
    if (filas.length > 0) await db.precios.bulkAdd(filas)
  })
  return 'agregado'
}

export async function refrescarPrecios(
  idProducto: number,
  idPreciosClaros: string,
  sucursales: Sucursal[],
): Promise<void> {
  await consultarPrecios(idProducto, idPreciosClaros, sucursales)
}

export interface ProductoComparar {
  id: number
  idProductoPreciosClaros: string
  nombreMostrado: string
  precios: PrecioMasReciente[]
}

export interface PrecioMasReciente {
  cadena: string
  sucursalId: string
  sucursalNombre: string
  precio: number
  fechaConsulta: Date
}

export async function listarComparar(): Promise<ProductoComparar[]> {
  const [productos, todosPrecios] = await Promise.all([
    db.productos.toArray(),
    db.precios.toArray(),
  ])
  const porProducto = new Map<number, PrecioRegistrado[]>()
  for (const r of todosPrecios) {
    const arr = porProducto.get(r.productoId) ?? []
    arr.push(r)
    porProducto.set(r.productoId, arr)
  }
  return productos
    .sort((a, b) => b.fechaAgregado.getTime() - a.fechaAgregado.getTime())
    .map((p) => {
      const filas = porProducto.get(p.id!) ?? []
      const porCadena = new Map<string, PrecioRegistrado>()
      for (const r of filas) {
        const actual = porCadena.get(r.cadena)
        if (!actual || r.fechaConsulta > actual.fechaConsulta) porCadena.set(r.cadena, r)
      }
      return {
        id: p.id!,
        idProductoPreciosClaros: p.idProductoPreciosClaros,
        nombreMostrado: p.nombreMostrado,
        precios: [...porCadena.values()].map((r) => ({
          cadena: r.cadena,
          sucursalId: r.sucursalId,
          sucursalNombre: r.sucursalNombre,
          precio: r.precio,
          fechaConsulta: r.fechaConsulta,
        })),
      }
    })
}

export async function eliminarProducto(id: number): Promise<void> {
  await db.transaction('rw', db.productos, db.precios, async () => {
    await db.precios.where('productoId').equals(id).delete()
    await db.productos.delete(id)
  })
}

export async function listarProductos(): Promise<ProductoListado[]> {
  const [productos, todosPrecios] = await Promise.all([
    db.productos.toArray(),
    db.precios.toArray(),
  ])
  const porProducto = new Map<number, PrecioRegistrado[]>()
  for (const r of todosPrecios) {
    const arr = porProducto.get(r.productoId) ?? []
    arr.push(r)
    porProducto.set(r.productoId, arr)
  }
  return productos
    .sort((a, b) => b.fechaAgregado.getTime() - a.fechaAgregado.getTime())
    .map((p) => {
      const precios = porProducto.get(p.id!) ?? []
      let fechaUltimaConsulta: Date | null = null
      for (const r of precios) {
        if (fechaUltimaConsulta === null || r.fechaConsulta > fechaUltimaConsulta) {
          fechaUltimaConsulta = r.fechaConsulta
        }
      }
      const t = fechaUltimaConsulta?.getTime()
      const porCadena = new Map<string, PrecioPorCadena>()
      for (const r of precios) {
        if (t === undefined || r.fechaConsulta.getTime() !== t) continue
        const actual = porCadena.get(r.cadena)
        if (!actual || r.precio < actual.precio) {
          porCadena.set(r.cadena, {
            cadena: r.cadena,
            sucursalId: r.sucursalId,
            sucursalNombre: r.sucursalNombre,
            precio: r.precio,
          })
        }
      }
      return {
        id: p.id!,
        idProductoPreciosClaros: p.idProductoPreciosClaros,
        nombreBusqueda: p.nombreBusqueda,
        nombreMostrado: p.nombreMostrado,
        fechaAgregado: p.fechaAgregado,
        precios: [...porCadena.values()].sort((a, b) => a.precio - b.precio),
        fechaUltimaConsulta,
      }
    })
}

export async function ultimaActualizacion(): Promise<Date | null> {
  let max: Date | null = null
  for (const r of await db.precios.toArray()) {
    if (max === null || r.fechaConsulta > max) max = r.fechaConsulta
  }
  return max
}
