import { cadenaDe, minimoPorCadena, precioEfectivo } from './cadenas.ts'
import type { PrecioEnSucursal } from '../services/preciosClaros.ts'

function iguales(actual: unknown, esperado: unknown, msg: string): void {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(esperado)
  if (a !== e) {
    throw new Error(`FAIL ${msg}: esperaba ${e}, recibí ${a}`)
  }
}

function precio(over: Partial<PrecioEnSucursal>): PrecioEnSucursal {
  return {
    sucursalId: 'x',
    comercioId: 0,
    banderaDescripcion: '',
    comercioRazonSocial: '',
    sucursalNombre: '',
    direccion: '',
    localidad: '',
    precioLista: null,
    promo1Precio: null,
    promo1Descripcion: '',
    promo2Precio: null,
    promo2Descripcion: '',
    actualizadoHoy: false,
    ...over,
  }
}

// cadenaDe
iguales(cadenaDe({ banderaDescripcion: 'COTO', comercioRazonSocial: 'CICSA' }), 'Coto', 'cadenaDe coto')
iguales(
  cadenaDe({ banderaDescripcion: 'CARREFOUR', comercioRazonSocial: 'AR S.A.' }),
  'Carrefour',
  'cadenaDe carrefour',
)
iguales(
  cadenaDe({ banderaDescripcion: 'LA ANÓNIMA', comercioRazonSocial: 'SA' }),
  'La Anónima',
  'cadenaDe anonima',
)
iguales(
  cadenaDe({ banderaDescripcion: 'CHANGO MÁS', comercioRazonSocial: 'SA' }),
  'Chango Más',
  'cadenaDe chango mas',
)
iguales(cadenaDe({ banderaDescripcion: 'OTRO', comercioRazonSocial: 'SA' }), 'Otras', 'cadenaDe otras')

// precioEfectivo: mínimo entre lista y promos; null si no hay ninguno
iguales(
  precioEfectivo(precio({ precioLista: 100, promo1Precio: 80, promo2Precio: null })),
  80,
  'precioEfectivo con promo',
)
iguales(precioEfectivo(precio({ precioLista: null, promo2Precio: 90 })), 90, 'precioEfectivo solo promo')
iguales(precioEfectivo(precio({})), null, 'precioEfectivo sin precio')

// minimoPorCadena: min por cadena, saltea sin precio, ordenado asc
const resultado = minimoPorCadena([
  precio({ banderaDescripcion: 'COTO', precioLista: 120, sucursalId: 'c1', sucursalNombre: 'Coto 1' }),
  precio({ banderaDescripcion: 'COTO', precioLista: 100, sucursalId: 'c2', sucursalNombre: 'Coto 2' }),
  precio({ banderaDescripcion: 'JUMBO', precioLista: 110, sucursalId: 'j1', sucursalNombre: 'Jumbo 1' }),
  precio({ banderaDescripcion: 'JUMBO', precioLista: 105, promo1Precio: 90, sucursalId: 'j2', sucursalNombre: 'Jumbo 2' }),
  precio({ banderaDescripcion: 'SIN PRECIO' }),
])
iguales(
  resultado,
  [
    { cadena: 'Jumbo', sucursalId: 'j2', sucursalNombre: 'Jumbo 2', precio: 90 },
    { cadena: 'Coto', sucursalId: 'c2', sucursalNombre: 'Coto 2', precio: 100 },
  ],
  'minimoPorCadena',
)

console.log('cadenas.test.ts: OK')
