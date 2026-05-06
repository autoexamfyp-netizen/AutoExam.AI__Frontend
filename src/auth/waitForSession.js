import { supabase } from "../lib/supabaseClient"

/**
 * PKCE / hash token exchange can complete slightly after the first paint.
 */
export async function waitForAuthSession(maxAttempts = 14, baseDelayMs = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) return { session: null, error }
    if (session?.user) return { session, error: null }
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs + attempt * 40))
  }
  return { session: null, error: null }
}
