import { ChevronDown, Menu,ShoppingBag, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { cx } from '../../lib/format'
import { getCategories, getCollections } from '../../services/catalog'
import { useCart } from '../cart/CartContext'
import { useAuth } from '../auth/AuthContext'
import { SearchBox } from '../navigation/SearchBox'
import { Logo } from '../ui/Logo'

export function Header() {
  const { count, open, pulse } = useCart()
  const { user, profile } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collOpen, setCollOpen] = useState(false)
  const collRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const { data: cats } = useAsync(getCategories, [])
  const { data: colls } = useAsync(getCollections, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setCollOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
  }, [menuOpen])

  useEffect(() => {
    if (!collOpen) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !collRef.current?.contains(e.target as Node)) setCollOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [collOpen])

  return (
    <>
      <header
        className={cx(
          'sticky top-0 z-40 bg-white/95 backdrop-blur-md transition-shadow duration-300',
          scrolled ? 'shadow-[0_1px_0_#EAEAEA,0_8px_24px_-16px_rgba(0,0,0,.18)]' : 'shadow-[0_1px_0_#EAEAEA]',
        )}
      >
        <div className={cx('container-x flex items-center gap-4 transition-[height] duration-300', scrolled ? 'h-16' : 'h-[72px]')}>
          <button
            className="-ml-2 grid h-11 w-11 place-items-center rounded-lg lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <div className="mx-auto hidden w-full max-w-[520px] md:block">
            <SearchBox />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link to="/conta" className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-soft sm:flex">
              <User className="h-5 w-5" /> <span className="hidden max-w-[140px] truncate xl:inline">{user ? profile?.full_name?.split(" ")[0] || "Minha conta" : "Entrar"}</span>
            </Link>
            <button
              onClick={open}
              className="relative grid h-11 w-11 place-items-center rounded-lg hover:bg-soft"
              aria-label={`Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span
                  key={pulse}
                  className="anim-pop absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="container-x pb-3 md:hidden">
          <SearchBox />
        </div>

        <nav aria-label="Categorias" className="hidden border-t border-line lg:block">
          <div className="container-x flex h-12 items-center gap-1 text-[14px]">
            {cats?.map((c) => (
              <NavLink
                key={c.slug}
                to={`/categoria/${c.slug}`}
                className={({ isActive }) =>
                  cx(
                    'relative flex h-full items-center px-3 font-medium transition-colors',
                    'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-300 hover:after:scale-x-100',
                    isActive ? 'text-ink after:scale-x-100' : 'text-muted hover:text-ink',
                  )
                }
              >
                {c.name}
              </NavLink>
            ))}
            <div ref={collRef} className="relative ml-auto">
              <button
                onClick={() => setCollOpen((v) => !v)}
                aria-expanded={collOpen}
                aria-haspopup="true"
                className="flex h-9 items-center gap-1.5 rounded-lg px-3 font-medium text-ink hover:bg-soft"
              >
                Coleções <ChevronDown className={cx('h-4 w-4 transition-transform', collOpen && 'rotate-180')} />
              </button>
              <div
                className={cx(
                  'absolute right-0 top-full mt-2 w-80 origin-top-right rounded-xl border border-line bg-white p-2 shadow-[0_24px_48px_-24px_rgba(0,0,0,.25)] transition-all duration-200',
                  collOpen ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
                )}
              >
                {colls?.map((c) => (
                  <Link key={c.slug} to={`/colecao/${c.slug}`} className="block rounded-lg px-3 py-2.5 hover:bg-soft">
                    <span className="block text-sm font-semibold">{c.name}</span>
                    <span className="block text-[13px] text-muted line-clamp-1">{c.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Menu mobile */}
      <div className={cx('fixed inset-0 z-50 lg:hidden', menuOpen ? 'visible' : 'invisible')} aria-hidden={!menuOpen}>
        <div
          className={cx('absolute inset-0 bg-black/40 transition-opacity duration-300', menuOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cx(
            'absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] flex-col bg-white transition-transform duration-400 ease-[var(--ease-out-expo)]',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Logo />
            <button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-lg" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <p className="eyebrow mb-2">Categorias</p>
            <ul>
              {cats?.map((c) => (
                <li key={c.slug}>
                  <Link to={`/categoria/${c.slug}`} className="flex min-h-12 items-center border-b border-line text-[15px] font-semibold">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow mb-2 mt-7">Coleções</p>
            <ul>
              {colls?.map((c) => (
                <li key={c.slug}>
                  <Link to={`/colecao/${c.slug}`} className="flex min-h-12 items-center border-b border-line text-[15px] font-medium">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line p-4">
            <Link to="/conta" className="flex min-h-12 items-center gap-3 text-[15px] font-semibold">
              <User className="h-5 w-5" /> Minha conta
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}
