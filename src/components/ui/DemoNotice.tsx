import { FlaskConical } from 'lucide-react'
import { isDemoMode } from '../../lib/supabase'

/** Faixa que deixa explícito que o catálogo atual é de demonstração. */
export function DemoNotice() {
  if (!isDemoMode) return null
  return (
    <div className="bg-ink text-white/80 text-[12px]">
      <div className="container-x flex h-8 items-center justify-center gap-2 text-center">
        <FlaskConical className="h-3.5 w-3.5 text-brand" aria-hidden />
        <span>Ambiente de demonstração — produtos, preços e imagens são ilustrativos. Pagamentos desativados.</span>
      </div>
    </div>
  )
}
