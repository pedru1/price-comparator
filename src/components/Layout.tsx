import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, Scale, Settings, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/productos', label: 'Productos', icon: ShoppingCart },
  { to: '/comparar', label: 'Comparar', icon: Scale },
  { to: '/resumen', label: 'Resumen', icon: ClipboardList },
  { to: '/configuracion', label: 'Config', icon: Settings },
]

function Layout() {
  const location = useLocation()
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-4">
        <div key={location.pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Outlet />
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[0.7rem] font-medium text-muted-foreground transition-all duration-150 active:scale-95',
                isActive && 'text-primary',
              )
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout
