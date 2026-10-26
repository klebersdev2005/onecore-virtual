import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  cpf: string | null
  role: 'customer' | 'admin'
}

interface AuthCtx {
  enabled: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!supabase || !uid) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('id, full_name, phone, cpf, role').eq('id', uid).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // fora do callback para não travar o cliente de auth
      setTimeout(() => loadProfile(s?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value: AuthCtx = {
    enabled: !!supabase,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    // Apenas para a interface; a autorização real é a RLS no banco.
    isAdmin: profile?.role === 'admin',
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => {
      await supabase?.auth.signOut()
      setProfile(null)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
