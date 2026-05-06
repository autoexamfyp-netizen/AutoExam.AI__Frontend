import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const completeOAuth = async () => {
      const selectedRole = searchParams.get("role") || "teacher"

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session?.user) {
        navigate("/login", { replace: true })
        return
      }

      const existingRole = session.user.user_metadata?.role

      if (!existingRole) {
        await supabase.auth.updateUser({
          data: {
            role: selectedRole,
          },
        })
      }

      const finalRole = existingRole || selectedRole
      navigate(finalRole === "student" ? "/student-dashboard" : "/teacher-dashboard", {
        replace: true,
      })
    }

    completeOAuth()
  }, [navigate, searchParams])

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6">
      <div className="rounded-2xl border border-[#e3e6ef] bg-white px-8 py-6 text-center">
        <h1 className="text-xl font-semibold text-[#141a32]">Completing sign in...</h1>
        <p className="mt-2 text-sm text-[#6d7491]">Please wait while we finish your Google authentication.</p>
      </div>
    </main>
  )
}
