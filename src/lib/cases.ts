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
    id: 'grand',
    nameKey: 'grandCase',
    price: 750,
    color: '#F4AE52',
    // One case — any character skin can drop
    items: [
      { skinId: 'cappucino', rarity: 'common',    weight: 16 },
      { skinId: 'chimp',     rarity: 'common',    weight: 16 },
      { skinId: 'ballerina', rarity: 'rare',      weight: 14 },
      { skinId: 'patapim',   rarity: 'rare',      weight: 12 },
      { skinId: 'tralala',   rarity: 'rare',      weight: 12 },
      { skinId: 'lirili',    rarity: 'epic',      weight: 10 },
      { skinId: 'bomba',     rarity: 'epic',      weight: 9  },
      { skinId: 'trippi',    rarity: 'epic',      weight: 6  },
      { skinId: 'sahur',     rarity: 'legendary', weight: 5  },
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
