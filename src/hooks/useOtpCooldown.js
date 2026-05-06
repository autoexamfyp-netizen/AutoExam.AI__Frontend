import { useCallback, useEffect, useState } from "react"

/**
 * Countdown for resend OTP (seconds). Starts at `initialSeconds` after start() or mount if autoStart.
 */
export function useOtpCooldown(initialSeconds = 60, autoStart = true) {
  const [remaining, setRemaining] = useState(autoStart ? initialSeconds : 0)

  useEffect(() => {
    if (remaining <= 0) return undefined
    const t = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [remaining])

  const start = useCallback(
    (seconds = initialSeconds) => {
      setRemaining(seconds)
    },
    [initialSeconds],
  )

  const reset = useCallback(() => {
    setRemaining(0)
  }, [])

  return { remaining, canResend: remaining === 0, start, reset }
}
