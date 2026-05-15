import { supabase } from "./supabaseClient"

/**
 * Returns the authenticated teacher's user id for defense-in-depth queries.
 * RLS should also enforce ownership; explicit filters prevent leaks if RLS is off.
 */
export async function requireTeacherId() {
  const { data: userRes, error } = await supabase.auth.getUser()
  const id = userRes?.user?.id
  if (error || !id) {
    console.error("❌ requireTeacherId: not authenticated", error?.message)
    throw new Error("You must be signed in.")
  }
  console.log("🔐 Current Teacher:", id)
  return id
}
