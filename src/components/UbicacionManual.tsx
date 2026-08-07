import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Ubicacion } from '@/hooks/useUbicacion'

interface Props {
  onUbicar: (loc: Ubicacion) => void
}

function desglosarDireccion(direccion: string): { lat: number; lng: number } | null {
  const match = direccion.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

export function UbicacionManual({ onUbicar }: Props) {
  const [texto, setTexto] = useState('')

  const ubicar = () => {
    const loc = desglosarDireccion(texto)
    if (!loc) return
    onUbicar(loc)
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-input p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        Cargá tus coordenadas manualmente (ej. <code>-34.6037, -58.3816</code> para Buenos Aires):
      </p>
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="-34.6037, -58.3816"
          inputMode="decimal"
          onKeyDown={(e) => {
            if (e.key === 'Enter') ubicar()
          }}
        />
        <Button type="button" variant="secondary" onClick={ubicar} disabled={!desglosarDireccion(texto)}>
          Ubicar
        </Button>
      </div>
    </div>
  )
}
