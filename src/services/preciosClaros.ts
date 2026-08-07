/**
 * Cliente de la API pública "Precios Claros" (SEPA) del gobierno argentino.
 *
 * Base: https://d3e6htiiul5ek9.cloudfront.net/prod
 *
 * ENDPOINT DE BÚSQUEDA POR TEXTO (el que no venía documentado):
 *   GET /productos?string={texto}&lat={lat}&lng={lng}&offset=0&limit=50&sort=-cant_sucursales_disponible
 *   - Responde: { productos: [{ id, nombre, marca, presentacion, precioMin, precioMax, ... }] }
 *   - Requiere lat/lng o array_sucursales (si faltan devuelve status 400).
 *   - No está publicado en la documentación oficial; se descubrió en
 *     fasiluva/Precios-Claros-Requests y franxifra/controlador-precios
 *     (GitHub), y se verificó contra la API real el 06/08/2026.
 *     Por eso la función buscarProductos recibe lat/lng como parámetro.
 *
 * Otros endpoints usados:
 *   GET /sucursales?lat={lat}&lng={lng}&limit=3000
 *     -> { sucursales: Sucursal[] } ordenadas por distancia
 *   GET /producto?limit=50&id_producto={id}&array_sucursales={ids separados por coma}
 *     -> { producto, sucursales: SucursalConPrecio[] } (máx 50 sucursales)
 *
 * El id de producto es el EAN. El id de sucursal tiene formato "{comercioId}-1-{sucursalId}".
 */

const BASE = 'https://d3e6htiiul5ek9.cloudfront.net/prod'
const LIMITE_SUCURSALES = 50

export interface Sucursal {
  id: string
  comercioId: number
  banderaId: number
  sucursalId: string
  sucursalNombre: string
  sucursalTipo: string
  banderaDescripcion: string
  comercioRazonSocial: string
  direccion: string
  localidad: string
  provincia: string
  lat: string
  lng: string
  distanciaNumero: number
  distanciaDescripcion: string
}

export interface Producto {
  id: string
  nombre: string
  marca: string
  presentacion: string
  precioMin: number
  precioMax: number
  cantSucursalesDisponible: number
}

export interface PrecioEnSucursal {
  sucursalId: string
  comercioId: number
  banderaDescripcion: string
  comercioRazonSocial: string
  sucursalNombre: string
  direccion: string
  localidad: string
  precioLista: number | null
  promo1Precio: number | null
  promo1Descripcion: string
  promo2Precio: number | null
  promo2Descripcion: string
  actualizadoHoy: boolean
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

interface SucursalesResponse {
  status: number
  sucursales?: Sucursal[]
  errorDescription?: string
}

interface ProductosResponse {
  status: number
  productos?: Producto[]
  errorDescription?: string
}

interface PromoRaw {
  descripcion: string
  precio: string | number | null
}

interface SucursalConPrecio {
  id: string
  comercioId: number
  banderaDescripcion: string
  comercioRazonSocial: string
  sucursalNombre: string
  direccion: string
  localidad: string
  actualizadoHoy: boolean
  preciosProducto: {
    precioLista: string | number | null
    promo1: PromoRaw | null
    promo2: PromoRaw | null
  }
}

interface ProductoResponse {
  status: number
  sucursales?: SucursalConPrecio[]
  errorDescription?: string
}

function toNum(v: string | number | null | undefined): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function promoPrecio(p: PromoRaw | null): number | null {
  return p ? toNum(p.precio) : null
}

const TIEMPO_MAXIMO_MS = 15000

async function getJson(path: string): Promise<Response> {
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS)
  try {
    const res = await fetch(`${BASE}${path}`, { signal: control.signal })
    if (!res.ok) throw new Error(`La API respondió con HTTP ${res.status}`)
    return res
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('La API tardó demasiado en responder. Probá de nuevo.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function getSucursalesCercanas(
  lat: number,
  lng: number,
  limit = 3000,
): Promise<ApiResult<Sucursal[]>> {
  try {
    const res = await getJson(`/sucursales?lat=${lat}&lng=${lng}&limit=${limit}`)
    const json = (await res.json()) as SucursalesResponse
    if (json.status !== 200 || !json.sucursales) {
      throw new Error(json.errorDescription ?? 'Respuesta inválida de la API')
    }
    return { ok: true, data: json.sucursales }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export async function buscarProductos(
  texto: string,
  lat: number,
  lng: number,
): Promise<ApiResult<Producto[]>> {
  const q = encodeURIComponent(texto)
  const params = (limit: number) =>
    `/productos?string=${q}&lat=${lat}&lng=${lng}&offset=0&limit=${limit}&sort=-cant_sucursales_disponible`

  // ponytail: el backend 500ea toda la respuesta si un producto del rango tiene un campo null
  // (bug conocido de la API). Reintento con límites menores que excluyen el producto roto.
  let ultimoError = 'La API respondió con un error'
  for (const limit of [50, 20, 10, 5, 1]) {
    try {
      const res = await getJson(params(limit))
      const json = (await res.json()) as ProductosResponse
      if (json.status !== 200 || !json.productos) {
        if (json.status === 500) {
          ultimoError = json.errorDescription ?? ultimoError
          continue
        }
        throw new Error(json.errorDescription ?? 'Respuesta inválida de la API')
      }
      return { ok: true, data: json.productos }
    } catch (err) {
      // error de red: reintentar con límites menores no sirve
      return { ok: false, error: errorMessage(err) }
    }
  }
  return { ok: false, error: ultimoError }
}

export async function getPreciosProducto(
  idProducto: string,
  sucursales: Sucursal[],
): Promise<ApiResult<PrecioEnSucursal[]>> {
  try {
    const ids = sucursales
      .slice(0, LIMITE_SUCURSALES)
      .map((s) => s.id)
      .join(',')
    const res = await getJson(
      `/producto?limit=${LIMITE_SUCURSALES}&id_producto=${encodeURIComponent(idProducto)}&array_sucursales=${ids}`,
    )
    const json = (await res.json()) as ProductoResponse
    if (json.status !== 200) {
      throw new Error(json.errorDescription ?? 'Respuesta inválida de la API')
    }
    const data = (json.sucursales ?? []).map((s) => ({
      sucursalId: s.id,
      comercioId: s.comercioId,
      banderaDescripcion: s.banderaDescripcion,
      comercioRazonSocial: s.comercioRazonSocial,
      sucursalNombre: s.sucursalNombre,
      direccion: s.direccion,
      localidad: s.localidad,
      precioLista: toNum(s.preciosProducto?.precioLista),
      promo1Precio: promoPrecio(s.preciosProducto?.promo1 ?? null),
      promo1Descripcion: s.preciosProducto?.promo1?.descripcion ?? '',
      promo2Precio: promoPrecio(s.preciosProducto?.promo2 ?? null),
      promo2Descripcion: s.preciosProducto?.promo2?.descripcion ?? '',
      actualizadoHoy: s.actualizadoHoy ?? false,
    }))
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
      return 'No se pudo conectar con Precios Claros. Comprobá tu conexión e intentá de nuevo.'
    }
    return err.message
  }
  return 'Error de red inesperado'
}
