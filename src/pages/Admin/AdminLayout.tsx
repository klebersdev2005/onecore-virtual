import { ArrowLeft, FolderTree, LayoutDashboard, MessageSquare, Package, Settings, ShoppingCart } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { RequireAdmin } from '../../components/auth/Guards'
import { LogoMark } from '../../components/ui/Logo'
import { cx } from '../../lib/format'
import { useSeo } from '../../lib/seo'

const links = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/categorias', label: 'Categorias e coleções', icon: FolderTree },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: MessageSquare },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export default function AdminLayout() {
  useSeo({ title: 'Admin', noindex: true })
  return (
    <RequireAdmin>
      <div className="min-h-dvh bg-soft lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center gap-2.5 px-5">
            <LogoMark className="h-7 w-7" />
            <span className="text-[15px] font-extrabold tracking-tight">OneCore <span className="font-medium text-muted">Admin</span></span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0 [scrollbar-width:none]">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx('flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-[14px] font-semibold transition-colors', isActive ? 'bg-ink text-white' : 'text-ink/75 hover:bg-soft hover:text-ink')
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <Link to="/" className="mx-3 mt-6 hidden h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-muted hover:text-ink lg:flex">
            <ArrowLeft className="h-4 w-4" /> Voltar à loja
          </Link>
        </aside>
        <main className="min-w-0 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </RequireAdmin>
  )
}

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl border border-line bg-white p-5 sm:p-6', className)}>{children}</div>
}
