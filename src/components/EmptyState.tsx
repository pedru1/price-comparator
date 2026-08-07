import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon size={22} />
        </span>
        <p className="font-heading font-medium">{title}</p>
        <p className="max-w-64 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default EmptyState
