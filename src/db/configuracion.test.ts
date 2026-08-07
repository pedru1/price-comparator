import 'fake-indexeddb/auto'
import { db } from './database.ts'
import {
  borrarTodosLosDatos,
  cadenasActivas,
  cadenasDisponibles,
  filtrarPrecios,
  getCadenas,
  getRadio,
  getUbicacion,
  guardarCadenas,
  guardarRadio,
  guardarUbicacion,
} from './configuracion.ts'

function iguales(actual: unknown, esperado: unknown, msg: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(esperado)
  if (a !== e) {
    throw new Error(`FAIL ${msg}: esperaba ${e}, recibí ${a}`)
  }
}

async function main() {
  // Migración: simular la DB de la app vieja (versión 10) antes de abrir con el esquema actual.
  // Dexie abre de forma perezosa, así que esto corre antes de la primera operación.
  const vieja = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('comparador-precios', 10)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains('productos')) {
        d.createObjectStore('productos', { keyPath: 'id', autoIncrement: true })
        d.createObjectStore('precios', { keyPath: 'id', autoIncrement: true })
      }
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  await new Promise((res, rej) => {
    const tx = vieja.transaction('productos', 'readwrite')
    tx.objectStore('productos').add({
      idProductoPreciosClaros: 'e-viejo',
      nombreBusqueda: 'viejo',
      nombreMostrado: 'Producto Viejo',
      fechaAgregado: new Date('2026-08-01T10:00:00'),
    })
    tx.oncomplete = res
    tx.onerror = () => rej(tx.error)
  })
  vieja.close()

  const id = await db.productos.add({
    idProductoPreciosClaros: '779001',
    nombreBusqueda: 'arroz',
    nombreMostrado: 'Arroz',
    fechaAgregado: new Date('2026-08-02T10:00:00'),
  })
  await db.precios.bulkAdd([
    { productoId: id, cadena: 'Jumbo', sucursalId: 'j1', sucursalNombre: 'Jumbo 1', precio: 140, fechaConsulta: new Date() },
    { productoId: id, cadena: 'Vea', sucursalId: 'v1', sucursalNombre: 'Vea 1', precio: 150, fechaConsulta: new Date() },
  ])

  iguales((await db.productos.get(1))?.nombreMostrado, 'Producto Viejo', 'migración conserva datos de la DB vieja')
  iguales(await db.configuracion.count(), 0, 'tabla configuracion creada en la migración')

  await guardarUbicacion({ lat: -34.6037, lng: -58.3816 })
  iguales(await getUbicacion(), { lat: -34.6037, lng: -58.3816 }, 'ubicación se guarda y recupera')

  await guardarRadio(5)
  iguales(await getRadio(), 5, 'radio se guarda y recupera')

  await guardarCadenas(['Coto', 'Jumbo'])
  iguales(await getCadenas(), ['Coto', 'Jumbo'], 'cadenas se guardan y recuperan')
  iguales([...(await cadenasActivas())!], ['Coto', 'Jumbo'], 'cadenasActivas con selección')

  iguales(await cadenasDisponibles(), ['Vea', 'Jumbo'], 'cadenasDisponibles ordenadas por NOMBRES_CADENAS')

  const filtrado = filtrarPrecios(
    [
      { id: 1, precios: [{ cadena: 'Coto' }, { cadena: 'Vea' }] },
      { id: 2, precios: [{ cadena: 'Jumbo' }] },
    ],
    new Set(['Coto', 'Jumbo']),
  )
  iguales(
    filtrado.map((p) => p.precios.map((pr) => pr.cadena)),
    [['Coto'], ['Jumbo']],
    'filtrarPrecios solo deja las cadenas seleccionadas',
  )

  await borrarTodosLosDatos()
  iguales(await db.productos.count(), 0, 'borrarTodosLosDatos limpia productos')
  iguales(await db.precios.count(), 0, 'borrarTodosLosDatos limpia precios')
  iguales(await db.configuracion.count(), 0, 'borrarTodosLosDatos limpia configuración')

  console.log('configuracion.test.ts: OK')
}

await main()
