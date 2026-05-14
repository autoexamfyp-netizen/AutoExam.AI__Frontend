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

// Apply to every fetch — `cache: "no-store"` makes Chromium bypass its disk
// cache entirely, sidestepping `net::ERR_CACHE_READ_FAILURE` (a known Chrome
// bug where a corrupt cached entry returns an empty 200 response). We also
// send Pragma/Cache-Control headers so any intermediate proxy honours the same.
const NO_CACHE_INIT = {
  cache: "no-store",
}
const NO_CACHE_HEADERS = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
}

async function safeFetch(url, init) {
  try {
    return await fetch(url, init)
  } catch (err) {
    const message = err?.message || String(err)
    // Browser-level network failure (server down, CORS, cache corruption, etc.)
    const wrapped = new Error(
      `Could not reach the API at ${typeof url === "string" ? url : url.toString()}. ${message}`,
    )
    wrapped.cause = err
    wrapped.networkError = true
    throw wrapped
  }
}

async function handle(res) {
  // Read as text first so we can still report a clear error if the server
  // sent an empty body, HTML, or anything that fails JSON.parse.
  const text = await res.text().catch(() => "")
  let body = null
  let parseError = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch (e) {
      parseError = e
    }
  }
  if (!res.ok) {
    const msg =
      body?.error ||
      (text && text.length < 240 ? text : `${res.status} ${res.statusText}`)
    const err = new Error(msg)
    err.status = res.status
    err.body = body
    err.raw = text
    throw err
  }
  // A 2xx response with no body is almost always a Chromium disk-cache failure
  // (`net::ERR_CACHE_READ_FAILURE`). Tell the user how to recover.
  if (!text) {
    const err = new Error(
      "The browser returned an empty cached response. Please reload the page (Ctrl+F5) — if it keeps happening, clear the site's cache for localhost.",
    )
    err.status = res.status
    err.networkError = true
    throw err
  }
  if (parseError) {
    const err = new Error(
      `Server returned a non-JSON response (status ${res.status}). ${
        text && text.length < 240 ? text : ""
      }`.trim(),
    )
    err.status = res.status
    err.raw = text
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
  // Cache-bust query param defeats any stale entry that the browser is still
  // holding onto from before this fix shipped.
  url.searchParams.set("_", Date.now().toString())
  const headers = { ...NO_CACHE_HEADERS, ...(await authHeader()) }
  const res = await safeFetch(url, { method: "GET", headers, ...NO_CACHE_INIT })
  return handle(res)
}

export async function apiPost(path, body) {
  const headers = {
    "Content-Type": "application/json",
    ...NO_CACHE_HEADERS,
    ...(await authHeader()),
  }
  const res = await safeFetch(BASE + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
    ...NO_CACHE_INIT,
  })
  return handle(res)
}

export async function apiPatch(path, body) {
  const headers = {
    "Content-Type": "application/json",
    ...NO_CACHE_HEADERS,
    ...(await authHeader()),
  }
  const res = await safeFetch(BASE + path, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body || {}),
    ...NO_CACHE_INIT,
  })
  return handle(res)
}

export async function apiDelete(path) {
  const headers = { ...NO_CACHE_HEADERS, ...(await authHeader()) }
  const res = await safeFetch(BASE + path, {
    method: "DELETE",
    headers,
    ...NO_CACHE_INIT,
  })
  return handle(res)
}

export const API_BASE = BASE
