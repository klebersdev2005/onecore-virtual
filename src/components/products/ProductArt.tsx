import type { ArtKind } from '../../types/catalog'

/**
 * Ilustração vetorial de produto. É usada enquanto o produto não tem fotos
 * reais cadastradas — é sempre identificada como "imagem ilustrativa".
 */
interface Props {
  kind: ArtKind
  tone: string
  view?: 'front' | 'detail' | 'context'
  className?: string
  title?: string
}

const isDark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 90
}

export function ProductArt({ kind, tone, view = 'front', className, title }: Props) {
  const dark = isDark(tone)
  const c = {
    body: dark ? '#F4F4F5' : '#1F1F1F',
    face: dark ? '#D9D9DC' : '#3A3A3A',
    hi: dark ? '#FFFFFF' : '#565656',
    accent: '#FF6A00',
    shadow: dark ? 'rgba(0,0,0,.45)' : 'rgba(23,23,23,.12)',
    deco: dark ? 'rgba(255,255,255,.08)' : 'rgba(23,23,23,.05)',
  }
  const zoom = view === 'detail' ? 'translate(200 215) scale(1.55) translate(-200 -215)' : undefined

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={title} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill={tone} />
      {view === 'context' && (
        <g>
          <rect x="0" y="292" width="400" height="108" fill={c.deco} />
          <circle cx="322" cy="84" r="46" fill="none" stroke={c.accent} strokeOpacity=".35" strokeWidth="1.5" />
          <rect x="44" y="60" width="56" height="56" fill="none" stroke={c.body} strokeOpacity=".12" strokeWidth="1.5" transform="rotate(12 72 88)" />
        </g>
      )}
      {view === 'front' && <circle cx="200" cy="200" r="140" fill={c.deco} />}
      <ellipse cx="200" cy="312" rx="96" ry="10" fill={c.shadow} />
      <g transform={zoom}>{shapes[kind](c)}</g>
    </svg>
  )
}

type C = Record<'body' | 'face' | 'hi' | 'accent' | 'shadow' | 'deco', string>

const shapes: Record<ArtKind, (c: C) => JSX.Element> = {
  holder: (c) => (
    <g>
      <rect x="186" y="230" width="28" height="80" rx="6" fill={c.face} />
      <circle cx="200" cy="228" r="20" fill={c.body} />
      <rect x="140" y="92" width="120" height="196" rx="20" fill={c.body} transform="rotate(-8 200 190)" />
      <rect x="150" y="104" width="100" height="172" rx="12" fill={c.face} transform="rotate(-8 200 190)" />
      <circle cx="200" cy="190" r="22" fill="none" stroke={c.accent} strokeWidth="5" />
    </g>
  ),
  organizer: (c) => (
    <g>
      <rect x="90" y="170" width="220" height="130" rx="10" fill={c.body} />
      <rect x="102" y="182" width="94" height="52" rx="5" fill={c.face} />
      <rect x="204" y="182" width="94" height="52" rx="5" fill={c.face} />
      <rect x="102" y="242" width="60" height="46" rx="5" fill={c.face} />
      <rect x="170" y="242" width="128" height="46" rx="5" fill={c.face} />
      <rect x="216" y="150" width="10" height="60" rx="3" fill={c.accent} transform="rotate(20 221 180)" />
      <rect x="236" y="140" width="8" height="70" rx="3" fill={c.hi} transform="rotate(-10 240 175)" />
    </g>
  ),
  earbuds: (c) => (
    <g>
      <rect x="128" y="196" width="144" height="110" rx="46" fill={c.body} />
      <line x1="134" y1="236" x2="266" y2="236" stroke={c.face} strokeWidth="3" />
      <circle cx="200" cy="270" r="4" fill={c.accent} />
      <g transform="translate(150 118) rotate(-18)">
        <circle cx="0" cy="0" r="24" fill={c.body} />
        <rect x="-8" y="10" width="16" height="52" rx="8" fill={c.body} />
        <circle cx="0" cy="0" r="10" fill={c.face} />
      </g>
      <g transform="translate(252 112) rotate(14)">
        <circle cx="0" cy="0" r="24" fill={c.body} />
        <rect x="-8" y="10" width="16" height="52" rx="8" fill={c.body} />
        <circle cx="0" cy="0" r="10" fill={c.face} />
      </g>
    </g>
  ),
  charger: (c) => (
    <g>
      <rect x="96" y="268" width="208" height="36" rx="18" fill={c.body} />
      <rect x="150" y="108" width="100" height="168" rx="16" fill={c.body} transform="rotate(-6 200 190)" />
      <rect x="160" y="120" width="80" height="144" rx="10" fill={c.face} transform="rotate(-6 200 190)" />
      <circle cx="278" cy="262" r="18" fill={c.hi} />
      <rect x="112" y="250" width="34" height="20" rx="10" fill={c.hi} />
      <circle cx="200" cy="286" r="3.5" fill={c.accent} />
    </g>
  ),
  lamp: (c) => (
    <g>
      <ellipse cx="170" cy="300" rx="60" ry="12" fill={c.body} />
      <line x1="170" y1="296" x2="210" y2="180" stroke={c.body} strokeWidth="10" strokeLinecap="round" />
      <line x1="210" y1="180" x2="150" y2="110" stroke={c.body} strokeWidth="10" strokeLinecap="round" />
      <circle cx="210" cy="180" r="9" fill={c.accent} />
      <path d="M128 92 L196 124 L170 168 Z" fill={c.body} />
      <path d="M172 150 L230 250 L120 250 Z" fill={c.accent} opacity=".14" />
    </g>
  ),
  bottle: (c) => (
    <g>
      <rect x="166" y="70" width="68" height="34" rx="10" fill={c.face} />
      <rect x="156" y="98" width="88" height="210" rx="34" fill={c.body} />
      <rect x="170" y="126" width="12" height="150" rx="6" fill={c.hi} opacity=".5" />
      <rect x="156" y="250" width="88" height="10" fill={c.accent} />
    </g>
  ),
  backpack: (c) => (
    <g>
      <path d="M172 96 a28 28 0 0 1 56 0" fill="none" stroke={c.body} strokeWidth="10" />
      <rect x="126" y="100" width="148" height="206" rx="40" fill={c.body} />
      <rect x="150" y="200" width="100" height="80" rx="18" fill={c.face} />
      <line x1="164" y1="214" x2="236" y2="214" stroke={c.accent} strokeWidth="4" strokeLinecap="round" />
      <rect x="150" y="128" width="100" height="10" rx="5" fill={c.face} />
    </g>
  ),
  wallet: (c) => (
    <g>
      <rect x="140" y="136" width="120" height="76" rx="8" fill={c.accent} transform="rotate(-8 200 174)" />
      <rect x="112" y="168" width="176" height="128" rx="16" fill={c.body} />
      <line x1="112" y1="206" x2="288" y2="206" stroke={c.face} strokeWidth="3" />
      <rect x="248" y="250" width="22" height="22" rx="4" fill={c.face} />
    </g>
  ),
  box: (c) => (
    <g>
      <path d="M200 110 L300 160 L300 270 L200 320 L100 270 L100 160 Z" fill={c.body} />
      <path d="M200 110 L300 160 L200 210 L100 160 Z" fill={c.hi} />
      <path d="M200 210 L200 320" stroke={c.face} strokeWidth="3" />
      <path d="M150 135 L250 185 L250 215" stroke={c.accent} strokeWidth="10" fill="none" />
    </g>
  ),
  cable: (c) => (
    <g>
      <path d="M120 250 C 120 150, 280 150, 280 210 C 280 270, 160 270, 170 200 C 178 150, 260 160, 250 120" fill="none" stroke={c.body} strokeWidth="12" strokeLinecap="round" />
      <rect x="96" y="246" width="48" height="26" rx="8" fill={c.body} />
      <rect x="140" y="252" width="14" height="14" rx="3" fill={c.face} />
      <rect x="232" y="88" width="36" height="40" rx="8" fill={c.accent} transform="rotate(15 250 108)" />
    </g>
  ),
  vacuum: (c) => (
    <g>
      <rect x="110" y="160" width="160" height="70" rx="35" fill={c.body} />
      <path d="M262 176 L320 210 L320 224 L262 214 Z" fill={c.face} />
      <path d="M150 230 C 150 300, 220 300, 230 230" fill="none" stroke={c.body} strokeWidth="18" strokeLinecap="round" />
      <circle cx="150" cy="195" r="18" fill={c.face} />
      <rect x="196" y="180" width="44" height="8" rx="4" fill={c.accent} />
    </g>
  ),
  mug: (c) => (
    <g>
      <path d="M262 160 a44 44 0 0 1 0 88" fill="none" stroke={c.body} strokeWidth="16" />
      <rect x="132" y="120" width="140" height="188" rx="24" fill={c.body} />
      <rect x="124" y="106" width="156" height="28" rx="12" fill={c.face} />
      <rect x="132" y="210" width="140" height="8" fill={c.accent} />
    </g>
  ),
}
