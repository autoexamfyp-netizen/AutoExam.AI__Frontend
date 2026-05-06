/**
 * Supabase may return OAuth / email-link errors in the query string or URL hash.
 */
export function parseUrlAuthError() {
  const result = {
    error: null,
    errorCode: null,
    errorDescription: null,
  }

  if (typeof window === "undefined") return result

  const search = new URLSearchParams(window.location.search)
  if (search.get("error")) {
    result.error = search.get("error")
    result.errorCode = search.get("error_code")
    result.errorDescription = search.get("error_description")?.replace(/\+/g, " ") ?? null
    return result
  }

  const raw = window.location.hash.replace(/^#/, "")
  if (!raw) return result

  const hashParams = new URLSearchParams(raw)
  if (hashParams.get("error")) {
    result.error = hashParams.get("error")
    result.errorCode = hashParams.get("error_code")
    result.errorDescription = hashParams.get("error_description")?.replace(/\+/g, " ") ?? null
  }

  return result
}
