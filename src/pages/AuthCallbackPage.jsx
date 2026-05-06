import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import { getEmailConfirmRedirectUrl } from "../auth/authPaths"
import { parseUrlAuthError } from "../auth/parseUrlAuthError"
import { dashboardPathForRole, resolveRole } from "../auth/roles"
import { waitForAuthSession } from "../auth/waitForSession"
import FullPageLoader from "../components/ui/FullPageLoader"

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState("Completing sign in…")

  useEffect(() => {
    const run = async () => {
      const urlErr = parseUrlAuthError()
      if (urlErr.error) {
        navigate("/auth/verification-failed", {
          replace: true,
          state: {
            errorCode: urlErr.errorCode,
            description: urlErr.errorDescription || urlErr.error,
          },
        })
        return
      }

      const selectedRole = searchParams.get("role") || "teacher"

      setMessage("Securing your session…")
      const { session, error: sessionError } = await waitForAuthSession()

      if (sessionError || !session?.user) {
        navigate("/login", { replace: true })
        return
      }

      const user = session.user
      const existingRole = resolveRole(user)

      if (!existingRole) {
        await supabase.auth.updateUser({
          data: {
            role: selectedRole === "student" ? "student" : "teacher",
          },
        })
      }

      const { data: refreshed } = await supabase.auth.getSession()
      const finalUser = refreshed.session?.user ?? user
      const finalRole = resolveRole(finalUser) || (selectedRole === "student" ? "student" : "teacher")

      navigate(dashboardPathForRole(finalRole), { replace: true })
    }

    run()
  }, [navigate, searchParams])

  return (
    <FullPageLoader
      title={message}
      subtitle="Please wait while we finish email confirmation or Google sign-in."
      footer={
        <p className="text-center text-xs text-[#99a0b7]">
          If this takes too long, confirm{" "}
          <code className="rounded bg-[#f1f3f8] px-1">{getEmailConfirmRedirectUrl()}</code> is listed under Supabase Auth
          URL configuration.
        </p>
      }
    />
  )
}
