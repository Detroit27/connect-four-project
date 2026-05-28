import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SKINS, getSkin, applySkinVars } from '../lib/skins'
import { CASES, rollCase } from '../lib/cases'
import type { Rarity } from '../lib/cases'

export interface OpenCaseResult {
  skinId: string
  rarity: Rarity
  isDuplicate: boolean
}

interface ShopState {
  currency: number
  inventory: string[]
  currentSkin: string

  addCurrency:     (amount: number) => void
  setCurrency:     (amount: number) => void
  buySkin:         (skinId: string) => boolean
  openCase:        (caseId: string) => OpenCaseResult | null
  equipSkin:       (skinId: string) => void
  owns:            (skinId: string) => boolean
  syncFromProfile: (currency: number, inventory: string[], currentSkin: string) => void
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      currency: 0,
      inventory: ['classic'],
      currentSkin: 'classic',

      addCurrency: (amount) => set(s => ({ currency: s.currency + amount })),
      setCurrency: (amount) => set({ currency: amount }),

      buySkin: (skinId) => {
        const skin = SKINS.find(s => s.id === skinId)
        if (!skin) return false
        const { currency, inventory } = get()
        if (inventory.includes(skinId)) return true
        if (currency < skin.price) return false
        set(s => ({ currency: s.currency - skin.price, inventory: [...s.inventory, skinId] }))
        return true
      },

      openCase: (caseId) => {
        const def = CASES.find(c => c.id === caseId)
        if (!def) return null
        const { currency, inventory } = get()
        if (currency < def.price) return null
        const rolled = rollCase(caseId)
        if (!rolled) return null
        const isDuplicate = inventory.includes(rolled.skinId)
        // Deduct price; add skin only if not already owned
        // Duplicates: refund half the case price as consolation
        const refund = isDuplicate ? Math.floor(def.price * 0.5) : 0
        set(s => ({
          currency: s.currency - def.price + refund,
          inventory: isDuplicate ? s.inventory : [...s.inventory, rolled.skinId],
        }))
        return { skinId: rolled.skinId, rarity: rolled.rarity, isDuplicate }
      },

      equipSkin: (skinId) => {
        set({ currentSkin: skinId })
        applySkinVars(getSkin(skinId))
      },

      owns: (skinId) => get().inventory.includes(skinId),

      syncFromProfile: (currency, inventory, currentSkin) => {
        set({ currency, inventory, currentSkin })
        applySkinVars(getSkin(currentSkin))
      },
    }),
    { name: 'connect-four-shop' }
  )
)
