import { db } from './database.ts'
import { NOMBRES_CADENAS } from './cadenas.ts'

const KEYS = {
  ubicacion: 'ubicacion',
  cadenas: 'cadenas',
  radio: 'radio',
} as const

export const CADENAS_DEFAULT: readonly string[] = ['Coto', 'Carrefour', 'Vea']
export const RADIO_DEFAULT = 3
export const RADIOS: readonly number[] = [1, 3, 5, 10]

export interface UbicacionGuardada {
  lat: number
  lng: number
}

export async function getConfig<T>(key: string): Promise<T | null> {
  const fila = await db.configuracion.get(key)
  return fila ? (fila.value as T) : null
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  await db.configuracion.put({ key, value })
}

export const getUbicacion = () => getConfig<UbicacionGuardada>(KEYS.ubicacion)
export const guardarUbicacion = (u: UbicacionGuardada) => setConfig(KEYS.ubicacion, u)

export const getCadenas = () => getConfig<string[]>(KEYS.cadenas)
export const guardarCadenas = (cadenas: string[]) => setConfig(KEYS.cadenas, cadenas)

export const getRadio = () => getConfig<number>(KEYS.radio)
export const guardarRadio = (km: number) => setConfig(KEYS.radio, km)

// null = sin selección guardada (mostrar todas)
export async function cadenasActivas(): Promise<Set<string> | null> {
  const c = await getCadenas()
  return c && c.length > 0 ? new Set(c) : null
}

// Cadenas que aparecieron en las sucursales cercanas (derivadas de los precios guardados)
export async function cadenasDisponibles(): Promise<string[]> {
  const presentes = new Set<string>()
  for (const r of await db.precios.toArray()) presentes.add(r.cadena)
  const orden = new Map(NOMBRES_CADENAS.map((c, i) => [c, i]))
  return [...presentes].sort((a, b) => (orden.get(a) ?? 99) - (orden.get(b) ?? 99))
}

export function filtrarPrecios<T extends { precios: readonly { cadena: string }[] }>(
  items: T[],
  seleccionadas: ReadonlySet<string>,
): T[] {
  return items.map((p) => ({ ...p, precios: p.precios.filter((pr) => seleccionadas.has(pr.cadena)) }))
}

export async function borrarTodosLosDatos(): Promise<void> {
  await db.transaction('rw', db.productos, db.precios, db.configuracion, async () => {
    await db.productos.clear()
    await db.precios.clear()
    await db.configuracion.clear()
  })
}
