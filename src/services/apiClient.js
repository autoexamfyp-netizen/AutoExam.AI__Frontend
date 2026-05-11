/**
 * Tiny fetch wrapper for the AutoExam backend.
 *
 * Usage:
 *   import { apiPost, apiGet } from "../services/apiClient"
 *   await apiPost("/api/ai/generate-questions", { content, config })
 *
 * - Resolves the backend URL from VITE_API_BASE_URL (defaults to localhost:4000).
 * - Always attaches the current Supabase JWT as `Authorization: Bearer ...`.
 * - Surfaces structured `{ error }` payloads as Errors with the same message.
 */

import { supabase } from "../lib/supabaseClient"

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "")

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handle(res) {
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg = body?.error || `${res.status} ${res.statusText}`
    const err = new Error(msg)
    err.status = res.status
    err.body = body
    throw err
  }
  return body
}

export async function apiGet(path, params) {
  const url = new URL(BASE + path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue
      url.searchParams.set(k, String(v))
    }
  }
  const headers = await authHeader()
  const res = await fetch(url, { method: "GET", headers })
  return handle(res)
}

export async function apiPost(path, body) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) }
  const res = await fetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  })
  return handle(res)
}

export async function apiPatch(path, body) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) }
  const res = await fetch(BASE + path, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body || {}),
  })
  return handle(res)
}

export async function apiDelete(path) {
  const headers = await authHeader()
  const res = await fetch(BASE + path, { method: "DELETE", headers })
  return handle(res)
}

export const API_BASE = BASE
