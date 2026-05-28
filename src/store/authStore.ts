import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useShopStore } from './shopStore'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  authError: string | null

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  updateCurrencyOnServer: (amount: number) => Promise<void>
  updateSkinOnServer: (skinId: string, inventory: string[]) => Promise<void>
  setError: (e: string | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  authError: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().loadProfile(session.user.id)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().loadProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  signIn: async (email, password) => {
    set({ authError: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ authError: error.message }); throw error }
  },

  signUp: async (email, password, username) => {
    set({ authError: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { set({ authError: error.message }); throw error }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        currency: 0,
        inventory: ['classic'],
        current_skin: 'classic',
        mp_wins: 0,
      })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  loadProfile: async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      set({ profile: data as Profile })
      useShopStore.getState().syncFromProfile(data.currency, data.inventory, data.current_skin)
    }
  },

  updateCurrencyOnServer: async (amount) => {
    const { user, profile } = get()
    if (!user || !profile) return
    const newAmount = profile.currency + amount
    await supabase.from('profiles').update({ currency: newAmount }).eq('id', user.id)
    set(s => ({ profile: s.profile ? { ...s.profile, currency: newAmount } : null }))
  },

  updateSkinOnServer: async (skinId, inventory) => {
    const { user } = get()
    if (!user) return
    await supabase.from('profiles').update({ current_skin: skinId, inventory }).eq('id', user.id)
  },

  setError: (authError) => set({ authError }),
}))
