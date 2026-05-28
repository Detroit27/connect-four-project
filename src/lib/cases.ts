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
    color: '#6F4E37',
    items: [
      { skinId: 'cappucino', rarity: 'common', weight: 50 },
      { skinId: 'chimp',     rarity: 'common', weight: 30 },
      { skinId: 'ballerina', rarity: 'rare',   weight: 20 },
    ],
  },
  {
    id: 'neon',
    nameKey: 'neonCase',
    price: 400,
    color: '#00BCD4',
    items: [
      { skinId: 'patapim', rarity: 'common', weight: 40 },
      { skinId: 'tralala', rarity: 'rare',   weight: 35 },
      { skinId: 'lirili',  rarity: 'epic',   weight: 25 },
    ],
  },
  {
    id: 'gold',
    nameKey: 'goldCase',
    price: 900,
    color: '#F59E0B',
    items: [
      { skinId: 'bomba',  rarity: 'rare',      weight: 40 },
      { skinId: 'trippi', rarity: 'epic',      weight: 35 },
      { skinId: 'sahur',  rarity: 'legendary', weight: 25 },
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
