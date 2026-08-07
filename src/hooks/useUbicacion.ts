import { useCallback, useEffect, useRef, useState } from 'react'
import { getSucursalesCercanas, type Sucursal } from '@/services/preciosClaros'
import { getRadio, getUbicacion, guardarUbicacion, RADIO_DEFAULT } from '@/db/configuracion'

export interface Ubicacion {
  lat: number
  lng: number
}

function filtrarPorRadio(sucursales: Sucursal[], radio: number): Sucursal[] {
  // distanciaNumero viene en kilómetros
  return sucursales.filter((s) => s.distanciaNumero == null || s.distanciaNumero <= radio)
}

export function useUbicacion({ auto = true }: { auto?: boolean } = {}) {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargandoSucursales, setCargandoSucursales] = useState(false)

  const ubicacionRef = useRef<Ubicacion | null>(null)
  ubicacionRef.current = ubicacion
  const sucursalesRef = useRef<Sucursal[]>([])
  sucursalesRef.current = sucursales

  const pedirGeolocalizacion = useCallback(
    () =>
      new Promise<Ubicacion | null>((resolve) => {
        if (!('geolocation' in navigator)) {
          setGeoError('Tu navegador no soporta geolocalización. Cargá tu ubicación manualmente.')
          resolve(null)
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGeoError(null)
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          },
          () => {
            setGeoError('No se pudo obtener tu ubicación. Cargala manualmente abajo.')
            resolve(null)
          },
          { timeout: 10000 },
        )
      }),
    [],
  )

  const buscarSucursales = useCallback(async (loc: Ubicacion) => {
    const radio = (await getRadio()) ?? RADIO_DEFAULT
    setCargandoSucursales(true)
    const r = await getSucursalesCercanas(loc.lat, loc.lng)
    setCargandoSucursales(false)
    if (!r.ok) {
      setGeoError(r.error)
      return
    }
    setSucursales(filtrarPorRadio(r.data, radio))
  }, [])

  const usarUbicacion = useCallback(
    async (loc: Ubicacion) => {
      setUbicacion(loc)
      setGeoError(null)
      await guardarUbicacion(loc)
      await buscarSucursales(loc)
    },
    [buscarSucursales],
  )

  const pedirUbicacion = useCallback(() => {
    void pedirGeolocalizacion().then((loc) => {
      if (loc) void usarUbicacion(loc)
    })
  }, [pedirGeolocalizacion, usarUbicacion])

  // Usa la ubicación guardada si existe; si no, pide permiso o queda a la espera del formulario manual
  const cargarUbicacionInicial = useCallback(async () => {
    const guardada = await getUbicacion()
    if (guardada) {
      setUbicacion(guardada)
      await buscarSucursales(guardada)
    } else {
      pedirUbicacion()
    }
  }, [buscarSucursales, pedirUbicacion])

  const obtenerSucursales = useCallback(async (): Promise<Sucursal[] | null> => {
    if (sucursalesRef.current.length > 0) return sucursalesRef.current
    let loc = ubicacionRef.current
    if (!loc) {
      const guardada = await getUbicacion()
      if (guardada) {
        loc = guardada
      } else {
        loc = await pedirGeolocalizacion()
      }
      if (!loc) return null
      setUbicacion(loc)
    }
    await buscarSucursales(loc)
    return sucursalesRef.current.length > 0 ? sucursalesRef.current : null
  }, [buscarSucursales, pedirGeolocalizacion])

  useEffect(() => {
    if (!auto) return
    void cargarUbicacionInicial()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !ubicacionRef.current) {
        void cargarUbicacionInicial()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [auto, cargarUbicacionInicial])

  return {
    ubicacion,
    geoError,
    sucursales,
    cargandoSucursales,
    usarUbicacion,
    pedirUbicacion,
    cargarUbicacionInicial,
    obtenerSucursales,
  }
}
