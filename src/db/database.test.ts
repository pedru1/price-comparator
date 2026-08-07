import 'fake-indexeddb/auto'
import { db } from './database.ts'
import { eliminarProducto, listarComparar, listarProductos } from './productos.ts'

function iguales(actual: unknown, esperado: unknown, msg: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(esperado)
  if (a !== e) {
    throw new Error(`FAIL ${msg}: esperaba ${e}, recibí ${a}`)
  }
}

async function seed(): Promise<number> {
  const id = await db.productos.add({
    idProductoPreciosClaros: '7790070012345',
    nombreBusqueda: 'leche',
    nombreMostrado: 'Leche Entera',
    fechaAgregado: new Date('2026-08-01T10:00:00'),
  })
  const consulta1 = new Date('2026-08-01T10:00:00')
  await db.precios.bulkAdd([
    { productoId: id, cadena: 'Coto', sucursalId: 'c1', sucursalNombre: 'Coto 1', precio: 120, fechaConsulta: consulta1 },
    { productoId: id, cadena: 'Jumbo', sucursalId: 'j1', sucursalNombre: 'Jumbo 1', precio: 110, fechaConsulta: consulta1 },
  ])
  const consulta2 = new Date('2026-08-02T10:00:00')
  await db.precios.bulkAdd([
    { productoId: id, cadena: 'Coto', sucursalId: 'c2', sucursalNombre: 'Coto 2', precio: 100, fechaConsulta: consulta2 },
  ])
  return id
}

async function main() {
  const id = await seed()
  await db.productos.add({
    idProductoPreciosClaros: '7790000000000',
    nombreBusqueda: 'sin precios',
    nombreMostrado: 'Producto Sin Precios',
    fechaAgregado: new Date('2026-08-01T10:00:00'),
  })

  // listarProductos: usa SOLO la última consulta, min por cadena, ordenado asc
  const lista = await listarProductos()
  const leche = lista.find((p) => p.id === id)!
  iguales(
    leche.precios.map((p) => ({ cadena: p.cadena, precio: p.precio })),
    [{ cadena: 'Coto', precio: 100 }],
    'precios de última consulta',
  )
  iguales(leche.fechaUltimaConsulta?.getTime(), new Date('2026-08-02T10:00:00').getTime(), 'fecha última consulta')
  const sinPrecios = lista.find((p) => p.nombreMostrado === 'Producto Sin Precios')!
  iguales(sinPrecios.precios, [], 'sin precios vacío')
  iguales(sinPrecios.fechaUltimaConsulta, null, 'sin consulta aún')

  // historial se conserva (2 consultas de precios)
  iguales(await db.precios.count(), 3, 'historial conservado')

  // eliminarProducto: cascada
  await eliminarProducto(id)
  iguales(await db.productos.where('id').equals(id).count(), 0, 'producto eliminado')
  iguales(await db.precios.where('productoId').equals(id).count(), 0, 'precios eliminados en cascada')
  iguales(await db.precios.count(), 0, 'no quedan precios del producto')

  // listarComparar: por cadena toma la fecha MÁS reciente (Jumbo solo tiene consulta vieja y aparece)
  await seed()
  const comparar = await listarComparar()
  const lecheC = comparar.find((p) => p.nombreMostrado === 'Leche Entera')!
  iguales(
    lecheC.precios.map((p) => `${p.cadena}:${p.precio}`).sort(),
    ['Coto:100', 'Jumbo:110'],
    'listarComparar por cadena más reciente',
  )

  console.log('database.test.ts: OK')
}

await main()
