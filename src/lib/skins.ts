export interface Skin {
  id: string
  nameKey: string   // key in t.shop.skins
  price: number     // 0 = free
  p1Color: string   // YOUR chips
  p1Shadow: string
  /**
   * Optional texture.  Put the file in /public/skins/<name>.png
   * Format: PNG or JPG, square, min 200×200 px.
   * Example: '/skins/marble.png'
   * The texture is rendered over the colour using background-image.
   *
   * HOW TO ADD A CUSTOM SKIN:
   * 1. Add an object to the SKINS array below.
   * 2. In src/i18n/en.ts → shop.skins → add:  yourId: 'Your Name'
   * 3. In src/i18n/ru.ts → shop.skins → add:  yourId: 'Название'
   * 4. If you have a texture — put it in /public/skins/ and set image: '/skins/yourfile.png'
   * 5. Set the price (0 = free).
   */
  image?: string
}

export const SKINS: Skin[] = [
  // ─── FREE ────────────────────────────────────────────────────────────────
  {
    id: 'classic',
    nameKey: 'classic',
    price: 0,
    p1Color: '#E63946',
    p1Shadow: 'rgba(230,57,70,0.30)',
  },
  // ─── CHEAP (affordable after a few games) ────────────────────────────────
  {
    id: 'slate',
    nameKey: 'slate',
    price: 120,
    p1Color: '#3B82F6',
    p1Shadow: 'rgba(59,130,246,0.30)',
  },
  // ─── MID-TIER ─────────────────────────────────────────────────────────────
  {
    id: 'forest',
    nameKey: 'forest',
    price: 500,
    p1Color: '#16A34A',
    p1Shadow: 'rgba(22,163,74,0.30)',
  },
  {
    id: 'dusk',
    nameKey: 'dusk',
    price: 1000,
    p1Color: '#9333EA',
    p1Shadow: 'rgba(147,51,234,0.30)',
  },
  // ─── RARE ────────────────────────────────────────────────────────────────
  {
    id: 'obsidian',
    nameKey: 'obsidian',
    price: 2000,
    p1Color: '#18181B',
    p1Shadow: 'rgba(24,24,27,0.45)',
  },
  {
    id: 'gold',
    nameKey: 'gold',
    price: 3500,
    p1Color: '#F59E0B',
    p1Shadow: 'rgba(245,158,11,0.38)',
  },
]

// Opponent chip colour — always the same regardless of your skin
export const DEFAULT_P2_COLOR  = '#4F56E3'
export const DEFAULT_P2_SHADOW = 'rgba(79,86,227,0.30)'

export function getSkin(id: string): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0]
}

/** Apply skin — changes ONLY player-1 (your) chips */
export function applySkinVars(skin: Skin) {
  const r = document.documentElement
  r.style.setProperty('--player1', skin.p1Color)
  r.style.setProperty('--player1-shadow', skin.p1Shadow)
  // p2 is always the default colour
  r.style.setProperty('--player2', DEFAULT_P2_COLOR)
  r.style.setProperty('--player2-shadow', DEFAULT_P2_SHADOW)
}
