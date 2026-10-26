import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-line" aria-hidden />}
            {it.path && i < items.length - 1 ? (
              <Link to={it.path} className="hover:text-ink transition-colors">{it.name}</Link>
            ) : (
              <span aria-current="page" className="text-ink font-medium">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
