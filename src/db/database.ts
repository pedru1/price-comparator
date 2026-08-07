import Dexie, { type Table } from 'dexie'

export interface ProductoGuardado {
  id?: number
  idProductoPreciosClaros: string
  nombreBusqueda: string
  nombreMostrado: string
  fechaAgregado: Date
}

export interface PrecioRegistrado {
  id?: number
  productoId: number
  cadena: string
  sucursalId: string
  sucursalNombre: string
  precio: number
  fechaConsulta: Date
}

export interface ConfiguracionEntrada {
  key: string
  value: unknown
}

class ComparadorPreciosDB extends Dexie {
  productos!: Table<ProductoGuardado, number>
  precios!: Table<PrecioRegistrado, number>
  configuracion!: Table<ConfiguracionEntrada, string>

  constructor() {
    super('comparador-precios')
    this.version(1).stores({
      productos: '++id, &idProductoPreciosClaros',
      precios: '++id, productoId',
    })
    this.version(2).stores({ configuracion: 'key' })
  }
}

export const db = new ComparadorPreciosDB()
