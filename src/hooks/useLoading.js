import { useContext } from "react"
import { LoadingContext } from "../context/loadingContext"

export function useLoading() {
  const ctx = useContext(LoadingContext)
  if (!ctx) {
    throw new Error("useLoading must be used within LoadingProvider")
  }
  return ctx
}
