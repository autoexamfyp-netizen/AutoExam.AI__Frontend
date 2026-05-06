import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { AuthContext } from "./authContext"

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let cancelled = false

    const syncSession = (nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    }

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (cancelled) return
      syncSession(initial)
      setInitialized(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession)
      if (!cancelled) setInitialized(true)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) return { error }
    setSession(data.session)
    setUser(data.session?.user ?? null)
    return { error: null }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      initialized,
      loading: !initialized,
      signOut,
      refreshSession,
    }),
    [session, user, initialized, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
