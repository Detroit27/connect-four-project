export interface Skin {
  id: string
  nameKey: string
  /** 0 = free, -1 = case-only (cannot buy directly) */
  price: number
  p1Color: string
  p1Shadow: string
  /** Optional neon glow rendered as a box-shadow ring */
  glowColor?: string
  /** Optional texture from /public/skins/<file>.png */
  image?: string
}

/** ── Directly purchasable skins ────────────────────────────────────────── */
export const SKINS: Skin[] = [
  { id: 'classic',  nameKey: 'classic',  price: 0,    p1Color: '#E63946', p1Shadow: 'rgba(230,57,70,0.30)' },
  { id: 'slate',    nameKey: 'slate',    price: 120,  p1Color: '#3B82F6', p1Shadow: 'rgba(59,130,246,0.30)' },
  { id: 'forest',   nameKey: 'forest',   price: 500,  p1Color: '#16A34A', p1Shadow: 'rgba(22,163,74,0.30)' },
  { id: 'dusk',     nameKey: 'dusk',     price: 1000, p1Color: '#9333EA', p1Shadow: 'rgba(147,51,234,0.30)' },
  { id: 'obsidian', nameKey: 'obsidian', price: 2000, p1Color: '#18181B', p1Shadow: 'rgba(24,24,27,0.45)' },
  { id: 'gold',     nameKey: 'gold',     price: 3500, p1Color: '#F59E0B', p1Shadow: 'rgba(245,158,11,0.38)' },
]

/** ── Case-exclusive skins (obtained via case opening only) ─────────────── */
export const CASE_SKINS: Skin[] = [
  { id: 'neon',    nameKey: 'neon',    price: -1, p1Color: '#06B6D4', p1Shadow: 'rgba(6,182,212,0.40)',   glowColor: 'rgba(6,182,212,0.55)' },
  { id: 'lava',    nameKey: 'lava',    price: -1, p1Color: '#FF4500', p1Shadow: 'rgba(255,69,0,0.40)',    glowColor: 'rgba(255,100,0,0.50)' },
  { id: 'aurora',  nameKey: 'aurora',  price: -1, p1Color: '#10B981', p1Shadow: 'rgba(16,185,129,0.40)',  glowColor: 'rgba(16,185,129,0.50)' },
  { id: 'void',    nameKey: 'void',    price: -1, p1Color: '#7C3AED', p1Shadow: 'rgba(124,58,237,0.45)',  glowColor: 'rgba(167,139,250,0.55)' },
  { id: 'chrome',  nameKey: 'chrome',  price: -1, p1Color: '#94A3B8', p1Shadow: 'rgba(148,163,184,0.40)' },
]

/** All skins combined — used for lookup */
export const ALL_SKINS: Skin[] = [...SKINS, ...CASE_SKINS]

export const DEFAULT_P2_COLOR  = '#4F56E3'
export const DEFAULT_P2_SHADOW = 'rgba(79,86,227,0.30)'

export function getSkin(id: string): Skin {
  return ALL_SKINS.find(s => s.id === id) ?? SKINS[0]
}

export function applySkinVars(skin: Skin) {
  const r = document.documentElement
  r.style.setProperty('--player1',       skin.p1Color)
  r.style.setProperty('--player1-shadow', skin.p1Shadow)
  r.style.setProperty('--player1-glow',  skin.glowColor ?? 'transparent')
  r.style.setProperty('--player2',        DEFAULT_P2_COLOR)
  r.style.setProperty('--player2-shadow', DEFAULT_P2_SHADOW)
}
