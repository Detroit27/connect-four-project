import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SKINS, getSkin, applySkinVars } from '../lib/skins'

interface ShopState {
  currency: number
  inventory: string[]
  currentSkin: string

  addCurrency: (amount: number) => void
  setCurrency: (amount: number) => void
  buySkin: (skinId: string) => boolean   // false = недостаточно монет
  equipSkin: (skinId: string) => void
  owns: (skinId: string) => boolean
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
        if (inventory.includes(skinId)) return true   // уже куплен
        if (currency < skin.price) return false
        set(s => ({ currency: s.currency - skin.price, inventory: [...s.inventory, skinId] }))
        return true
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
