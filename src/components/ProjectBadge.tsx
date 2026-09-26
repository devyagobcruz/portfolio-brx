import daniel from '../assets/badges/daniel.webp'
import debora from '../assets/badges/debora.webp'
import hbs from '../assets/badges/hbs.webp'

export type BadgeId = 'daniel' | 'debora' | 'hbs'

/** Brasões oficiais de cada cliente (WebP de 360 px de altura, fundo transparente) */
const BADGES: Record<BadgeId, { src: string; w: number }> = {
  daniel: { src: daniel, w: 317 },
  debora: { src: debora, w: 289 },
  hbs: { src: hbs, w: 301 },
}

export function ProjectBadge({ id }: { id: BadgeId }) {
  const b = BADGES[id]
  return <img className="badge-img" src={b.src} width={b.w} height={360} alt="" decoding="async" draggable={false} />
}
