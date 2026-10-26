import { LogOut, MapPin, Package, Shield, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { RequireAuth } from '../../components/auth/Guards'
import { cx } from '../../lib/format'

export default function AccountLayout() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  )
}

function Inner() {
  const { profile, user, signOut, isAdmin } = useAuth()
  const nav = useNavigate()
  const links = [
    { to: '/conta/pedidos', label: 'Meus pedidos', icon: Package },
    { to: '/conta', label: 'Dados pessoais', icon: UserRound, end: true },
    { to: '/conta/enderecos', label: 'Endereços', icon: MapPin },
  ]
  return (
    <div className="container-x grid gap-8 py-10 lg:grid-cols-[240px_1fr] lg:gap-14">
      <aside>
        <p className="text-[13px] text-muted">Olá,</p>
        <p className="truncate text-[18px] font-extrabold">{profile?.full_name || user?.email}</p>
        <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0 [scrollbar-width:none]">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex h-11 shrink-0 items-center gap-3 rounded-[10px] px-3.5 text-[14px] font-semibold transition-colors', isActive ? 'bg-ink text-white' : 'hover:bg-soft')
              }
            >
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className="flex h-11 shrink-0 items-center gap-3 rounded-[10px] px-3.5 text-[14px] font-semibold text-brand-dark hover:bg-soft">
              <Shield className="h-4 w-4" /> Painel admin
            </NavLink>
          )}
          <button
            onClick={async () => {
              await signOut()
              nav('/')
            }}
            className="flex h-11 shrink-0 items-center gap-3 rounded-[10px] px-3.5 text-[14px] font-semibold text-muted hover:bg-soft hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
