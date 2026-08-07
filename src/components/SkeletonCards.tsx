export function SkeletonCards({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
          <div className="mb-3 h-4 w-2/3 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-5/6 rounded bg-muted/70" />
            <div className="h-3 w-4/6 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  )
}
