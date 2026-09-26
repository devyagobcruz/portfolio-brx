import { BADGE_PATHS } from './badgePaths'

export type BadgeId = 'daniel' | 'debora' | 'hbs'

/** Cores de cada brasão, tiradas da identidade visual de cada cliente */
const PALETTE: Record<BadgeId, { bg: string; fg: string; accent: string }> = {
  daniel: { bg: '#0E1219', fg: '#F4F5F7', accent: '#F4F5F7' },
  debora: { bg: '#FBF3E8', fg: '#5B3F2A', accent: '#C39A55' },
  hbs: { bg: '#F4F0E8', fg: '#1B2438', accent: '#1B2438' },
}

/** Escudo de 200 x 240: topo reto com cantos arredondados e ponta embaixo */
const SHIELD = 'M28 8 H172 Q192 8 192 28 V128 C192 176 152 210 100 234 C48 210 8 176 8 128 V28 Q8 8 28 8 Z'
const SHIELD_INNER = 'M32 18 H168 Q182 18 182 32 V127 C182 170 146 201 100 223 C54 201 18 170 18 127 V32 Q18 18 32 18 Z'

/** Monograma geométrico do Daniel Burlini: D e B em traço, dividindo as hastes */
function DanielMark({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" transform="translate(52 78) scale(0.86)">
      <path d="M0 0 H52 C86 0 104 26 104 55 C104 84 86 110 52 110 H0 Z" />
      <path d="M26 0 V110" />
      <path d="M52 0 V110 M52 0 H84 A27.5 27.5 0 0 1 84 55 H52 M52 55 H86 A27.5 27.5 0 0 1 86 110 H52" />
    </g>
  )
}

/** Brasão de um cliente, desenhado em SVG (leve e nítido em qualquer tamanho) */
export function ProjectBadge({ id }: { id: BadgeId }) {
  const c = PALETTE[id]
  return (
    <svg className="badge-svg" viewBox="0 0 200 242" aria-hidden="true">
      <path d={SHIELD} fill={c.bg} stroke={c.fg} strokeOpacity="0.35" strokeWidth="2" />
      <path d={SHIELD_INNER} fill="none" stroke={c.fg} strokeOpacity={id === 'daniel' ? 0.25 : 0.45} strokeWidth="1.2" />
      {id === 'hbs' && (
        <g stroke={c.fg} strokeWidth="1" fill="none">
          <path d="M34 38 H166 M34 64 H166" />
          <path d="M80 74 H120" strokeOpacity="0.7" />
        </g>
      )}
      {id === 'daniel'
        ? <DanielMark color={c.fg} />
        : BADGE_PATHS[id].map((p, i) => <path key={i} d={p.d} fill={c[p.fill]} />)}
    </svg>
  )
}
