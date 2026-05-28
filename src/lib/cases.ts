export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface CaseItem {
  skinId: string
  rarity: Rarity
  weight: number
}

export interface CaseDefinition {
  id: string
  nameKey: string
  price: number
  color: string
  items: CaseItem[]
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#94A3B8',
  rare:      '#3B82F6',
  epic:      '#9333EA',
  legendary: '#F59E0B',
}

export const CASES: CaseDefinition[] = [
  {
    id: 'starter',
    nameKey: 'starterCase',
    price: 150,
    color: '#3B82F6',
    items: [
      { skinId: 'slate',  rarity: 'common', weight: 50 },
      { skinId: 'forest', rarity: 'rare',   weight: 30 },
      { skinId: 'chrome', rarity: 'rare',   weight: 20 },
    ],
  },
  {
    id: 'neon',
    nameKey: 'neonCase',
    price: 400,
    color: '#06B6D4',
    items: [
      { skinId: 'chrome', rarity: 'common', weight: 40 },
      { skinId: 'neon',   rarity: 'rare',   weight: 30 },
      { skinId: 'aurora', rarity: 'epic',   weight: 20 },
      { skinId: 'lava',   rarity: 'epic',   weight: 10 },
    ],
  },
  {
    id: 'gold',
    nameKey: 'goldCase',
    price: 900,
    color: '#F59E0B',
    items: [
      { skinId: 'dusk',     rarity: 'rare',      weight: 35 },
      { skinId: 'lava',     rarity: 'epic',      weight: 25 },
      { skinId: 'void',     rarity: 'epic',      weight: 20 },
      { skinId: 'gold',     rarity: 'legendary', weight: 12 },
      { skinId: 'obsidian', rarity: 'legendary', weight: 8  },
    ],
  },
]

/** Weighted-random roll from a case's item pool */
export function rollCase(caseId: string): CaseItem | null {
  const c = CASES.find(c => c.id === caseId)
  if (!c) return null
  const total = c.items.reduce((s, i) => s + i.weight, 0)
  let rand = Math.random() * total
  for (const item of c.items) {
    rand -= item.weight
    if (rand <= 0) return item
  }
  return c.items[c.items.length - 1]
}

export function getCase(id: string): CaseDefinition | undefined {
  return CASES.find(c => c.id === id)
}
