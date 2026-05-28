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
  { id: 'cappucino', nameKey: 'cappucino', price: -1, p1Color: '#6F4E37', p1Shadow: 'rgba(111,78,55,0.40)',  image: '/skins/cappucino.jpg' },
  { id: 'chimp',     nameKey: 'chimp',     price: -1, p1Color: '#F9A825', p1Shadow: 'rgba(249,168,37,0.40)', image: '/skins/chimp.jpg' },
  { id: 'ballerina', nameKey: 'ballerina', price: -1, p1Color: '#E91E8C', p1Shadow: 'rgba(233,30,140,0.40)', image: '/skins/ballerina.jpg' },
  { id: 'patapim',   nameKey: 'patapim',   price: -1, p1Color: '#00BCD4', p1Shadow: 'rgba(0,188,212,0.40)',  glowColor: 'rgba(0,188,212,0.55)',  image: '/skins/patapim.jpg' },
  { id: 'tralala',   nameKey: 'tralala',   price: -1, p1Color: '#2196F3', p1Shadow: 'rgba(33,150,243,0.40)', glowColor: 'rgba(33,150,243,0.55)', image: '/skins/tralala.jpg' },
  { id: 'lirili',    nameKey: 'lirili',    price: -1, p1Color: '#4CAF50', p1Shadow: 'rgba(76,175,80,0.40)',  glowColor: 'rgba(76,175,80,0.50)',  image: '/skins/lirili.jpg' },
  { id: 'bomba',     nameKey: 'bomba',     price: -1, p1Color: '#FF5722', p1Shadow: 'rgba(255,87,34,0.40)',  glowColor: 'rgba(255,87,34,0.55)',  image: '/skins/bomba.jpg' },
  { id: 'trippi',    nameKey: 'trippi',    price: -1, p1Color: '#9C27B0', p1Shadow: 'rgba(156,39,176,0.45)', glowColor: 'rgba(156,39,176,0.55)', image: '/skins/trippi.jpg' },
  { id: 'sahur',     nameKey: 'sahur',     price: -1, p1Color: '#FF8F00', p1Shadow: 'rgba(255,143,0,0.40)',  glowColor: 'rgba(255,143,0,0.60)',  image: '/skins/sahur.jpg' },
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
