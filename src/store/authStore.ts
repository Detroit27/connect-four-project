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
  updateCurrencyOnServer: () => Promise<void>
  updateSkinOnServer: (skinId: string, inventory: string[]) => Promise<void>
  updateUsername: (username: string) => Promise<void>
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
    // Pass username in metadata so the DB trigger picks it up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) { set({ authError: error.message }); throw error }
    if (data.user) {
      // Upsert so we win over the trigger's fallback (email-prefix) if it already ran
      await supabase.from('profiles').upsert({
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

  // Writes the shop store's ABSOLUTE balance (single source of truth) so that
  // earnings, purchases and case-openings all persist consistently.
  updateCurrencyOnServer: async () => {
    const { user } = get()
    if (!user) return
    const currency = useShopStore.getState().currency
    await supabase.from('profiles').update({ currency }).eq('id', user.id)
    set(s => ({ profile: s.profile ? { ...s.profile, currency } : null }))
  },

  updateSkinOnServer: async (skinId, inventory) => {
    const { user } = get()
    if (!user) return
    await supabase.from('profiles').update({ current_skin: skinId, inventory }).eq('id', user.id)
  },

  updateUsername: async (username) => {
    const { user } = get()
    if (!user) return
    const trimmed = username.trim()
    if (trimmed.length < 3) throw new Error('Username must be at least 3 characters.')
    if (trimmed.length > 20) throw new Error('Username must be 20 characters or less.')
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)
    if (error) {
      // Unique constraint violation
      if (error.code === '23505') throw new Error('That username is already taken.')
      throw new Error(error.message)
    }
    set(s => ({ profile: s.profile ? { ...s.profile, username: trimmed } : null }))
  },

  setError: (authError) => set({ authError }),
}))
