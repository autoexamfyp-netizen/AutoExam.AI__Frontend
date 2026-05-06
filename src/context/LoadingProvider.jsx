import { useCallback, useMemo, useRef, useState } from "react"
import { LoadingContext } from "./loadingContext"
import Spinner from "../components/ui/Spinner"

/**
 * Global overlay: increment when long async work should block interaction.
 * Use begin()/end() or run() for automatic pairing.
 */
export function LoadingProvider({ children }) {
  const countRef = useRef(0)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [message, setMessage] = useState("")

  const begin = useCallback((msg = "") => {
    countRef.current += 1
    if (countRef.current === 1) {
      setOverlayVisible(true)
      if (msg) setMessage(msg)
    }
    let done = false
    return () => {
      if (done) return
      done = true
      countRef.current = Math.max(0, countRef.current - 1)
      if (countRef.current === 0) {
        setOverlayVisible(false)
        setMessage("")
      }
    }
  }, [])

  const run = useCallback(
    async (task, msg = "") => {
      const end = begin(msg)
      try {
        return await task()
      } finally {
        end()
      }
    },
    [begin],
  )

  const value = useMemo(() => ({ begin, run, overlayVisible }), [begin, run, overlayVisible])

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {overlayVisible ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b1538]/25 backdrop-blur-[2px] transition-opacity duration-200"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center rounded-2xl border border-[#e3e6ef] bg-white px-10 py-8 shadow-xl">
            <Spinner size="lg" label={message || "Loading"} />
            {message ? <p className="mt-4 max-w-xs text-center text-sm font-medium text-[#141a32]">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </LoadingContext.Provider>
  )
}
