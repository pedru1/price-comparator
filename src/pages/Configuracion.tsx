import { useCallback, useEffect, useState } from 'react'
import { Loader2, MapPin, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UbicacionManual } from '@/components/UbicacionManual'
import { useUbicacion } from '@/hooks/useUbicacion'
import { cn } from '@/lib/utils'
import {
  borrarTodosLosDatos,
  cadenasDisponibles,
  CADENAS_DEFAULT,
  getCadenas,
  getRadio,
  guardarCadenas,
  guardarRadio,
  RADIO_DEFAULT,
  RADIOS,
} from '@/db/configuracion'

function Configuracion() {
  const { ubicacion, geoError, usarUbicacion, pedirUbicacion, cargarUbicacionInicial } = useUbicacion({
    auto: false,
  })
  const [disponibles, setDisponibles] = useState<string[]>([])
  const [seleccionadas, setSeleccionadas] = useState<Set<string> | null>(null)
  const [radio, setRadio] = useState<number | null>(null)
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false)

  const recargar = useCallback(async () => {
    const [d, c, r] = await Promise.all([cadenasDisponibles(), getCadenas(), getRadio()])
    const lista = d.length > 0 ? d : [...CADENAS_DEFAULT]
    setDisponibles(lista)
    setSeleccionadas(c && c.length > 0 ? new Set(c) : new Set(lista))
    setRadio(r ?? RADIO_DEFAULT)
  }, [])

  useEffect(() => {
    void recargar()
    void cargarUbicacionInicial()
  }, [recargar, cargarUbicacionInicial])

  const alternarCadena = async (cadena: string) => {
    const base = seleccionadas ?? new Set(disponibles)
    const nuevas = new Set(base)
    if (nuevas.has(cadena)) nuevas.delete(cadena)
    else nuevas.add(cadena)
    setSeleccionadas(nuevas)
    await guardarCadenas([...nuevas])
  }

  const cambiarRadio = async (km: number) => {
    setRadio(km)
    await guardarRadio(km)
  }

  const borrar = async () => {
    await borrarTodosLosDatos()
    setConfirmandoBorrar(false)
    await recargar()
    await cargarUbicacionInicial()
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Settings size={22} /> Configuración
      </h1>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">Ubicación</p>
          {ubicacion ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                lat: {ubicacion.lat.toFixed(4)}, lng: {ubicacion.lng.toFixed(4)}
              </p>
              <Button variant="secondary" size="sm" onClick={pedirUbicacion}>
                Actualizar ubicación
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay ubicación guardada.</p>
          )}
          {!ubicacion && geoError && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-destructive">
                <MapPin size={14} /> {geoError}
              </p>
              <UbicacionManual onUbicar={(loc) => void usarUbicacion(loc)} />
            </div>
          )}
          {ubicacion && !geoError && (
            <p className="text-xs text-muted-foreground">
              Guardada en este dispositivo. No se volverá a pedir permiso de geolocalización.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">Cadenas</p>
          <p className="text-xs text-muted-foreground">
            Las pantallas de productos, comparación y resumen muestran solo estas cadenas.
          </p>
          {seleccionadas === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Cargando…
            </p>
          ) : (
            <ul className="divide-y">
              {disponibles.map((cadena) => (
                <li key={cadena}>
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                    <span className="text-sm font-medium">{cadena}</span>
                    <input
                      type="checkbox"
                      checked={seleccionadas.has(cadena)}
                      onChange={() => void alternarCadena(cadena)}
                      className="h-5 w-5 accent-primary"
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">Radio de búsqueda</p>
          <p className="text-xs text-muted-foreground">
            Aplica a las próximas búsquedas de sucursales cercanas.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {RADIOS.map((km) => (
              <Button
                key={km}
                variant={radio === km ? 'default' : 'outline'}
                onClick={() => void cambiarRadio(km)}
              >
                {km} km
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">Datos</p>
          {!confirmandoBorrar ? (
            <Button
              variant="destructive"
              className={cn('w-full')}
              onClick={() => setConfirmandoBorrar(true)}
            >
              <Trash2 /> Borrar todos los datos
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro? Esto borra todos tus productos guardados y la configuración.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmandoBorrar(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={borrar}>
                  Borrar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Configuracion
