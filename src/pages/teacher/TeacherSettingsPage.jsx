import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Save,
  Settings as SettingsIcon,
  User,
} from "lucide-react"
import { supabase } from "../../lib/supabaseClient"
import { useAuth } from "../../hooks/useAuth"
import { getPasswordResetRedirectUrl } from "../../auth/authPaths"
import { formatAuthError } from "../../auth/formatAuthError"

const PREFS_KEY_PREFIX = "autoexam.teacherPrefs:"

const DEFAULT_PREFS = {
  defaultDuration: 60,
  defaultMarks: 100,
  aiFlagThreshold: 70,
  evaluationStrictness: "medium",
}

function loadPrefs(userId) {
  if (!userId) return { ...DEFAULT_PREFS }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY_PREFIX + userId)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(userId, prefs) {
  if (!userId) return
  try {
    window.localStorage.setItem(PREFS_KEY_PREFIX + userId, JSON.stringify(prefs))
  } catch {
    // localStorage may be unavailable in private mode — swallow silently.
  }
}

export default function TeacherSettingsPage() {
  const { user, refreshSession } = useAuth()
  const userId = user?.id

  // ----- Profile -----
  const initialProfile = useMemo(
    () => ({
      name: user?.user_metadata?.full_name || "",
      department: user?.user_metadata?.department || "",
      subjects: Array.isArray(user?.user_metadata?.subjects)
        ? user.user_metadata.subjects.join(", ")
        : user?.user_metadata?.subjects || "",
    }),
    [user?.user_metadata?.full_name, user?.user_metadata?.department, user?.user_metadata?.subjects],
  )
  const [profile, setProfile] = useState(initialProfile)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null) // { ok, text }

  useEffect(() => {
    setProfile(initialProfile)
  }, [initialProfile])

  const profileDirty =
    profile.name !== initialProfile.name ||
    profile.department !== initialProfile.department ||
    profile.subjects !== initialProfile.subjects

  const onSaveProfile = useCallback(async () => {
    if (!profileDirty || profileBusy) return
    setProfileBusy(true)
    setProfileMsg(null)
    try {
      const subjects = profile.subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.name.trim() || null,
          department: profile.department.trim() || null,
          subjects,
        },
      })
      if (error) throw error
      await refreshSession()
      setProfileMsg({ ok: true, text: "Profile saved." })
    } catch (err) {
      setProfileMsg({ ok: false, text: formatAuthError(err) })
    } finally {
      setProfileBusy(false)
    }
  }, [profile, profileDirty, profileBusy, refreshSession])

  // ----- Security -----
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState(null)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [signOutMsg, setSignOutMsg] = useState(null)

  const onSendReset = useCallback(async () => {
    if (!user?.email || resetBusy) return
    setResetBusy(true)
    setResetMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: getPasswordResetRedirectUrl(),
      })
      if (error) throw error
      setResetMsg({ ok: true, text: `Sent to ${user.email}. Check your inbox.` })
    } catch (err) {
      setResetMsg({ ok: false, text: formatAuthError(err) })
    } finally {
      setResetBusy(false)
    }
  }, [user?.email, resetBusy])

  const onSignOutOthers = useCallback(async () => {
    if (signOutBusy) return
    setSignOutBusy(true)
    setSignOutMsg(null)
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" })
      if (error) throw error
      setSignOutMsg({ ok: true, text: "Other sessions signed out." })
    } catch (err) {
      setSignOutMsg({ ok: false, text: formatAuthError(err) })
    } finally {
      setSignOutBusy(false)
    }
  }, [signOutBusy])

  // ----- Preferences -----
  const initialPrefs = useMemo(() => loadPrefs(userId), [userId])
  const [prefs, setPrefs] = useState(initialPrefs)
  const [prefsMsg, setPrefsMsg] = useState(null)

  useEffect(() => {
    setPrefs(initialPrefs)
  }, [initialPrefs])

  const prefsDirty =
    prefs.defaultDuration !== initialPrefs.defaultDuration ||
    prefs.defaultMarks !== initialPrefs.defaultMarks ||
    prefs.aiFlagThreshold !== initialPrefs.aiFlagThreshold ||
    prefs.evaluationStrictness !== initialPrefs.evaluationStrictness

  const onSavePrefs = useCallback(() => {
    if (!userId) return
    savePrefs(userId, prefs)
    setPrefsMsg({ ok: true, text: "Preferences saved locally." })
    window.setTimeout(() => setPrefsMsg(null), 2400)
  }, [prefs, userId])

  const onResetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS)
    setPrefsMsg(null)
  }, [])

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">
          Profile, security, and AI defaults. Profile changes are stored in your account,
          preferences stay in this browser.
        </p>
      </div>

      {/* ---------- PROFILE ---------- */}
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <User className="h-4 w-4 text-[#6562f1]" />
            Profile
          </h2>
          <p className="text-xs text-[#8a93ad]">
            Signed in as <span className="font-semibold text-[#313a58]">{user?.email || "—"}</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={profile.name}
              placeholder="e.g. Dr. Faculty"
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              disabled={profileBusy}
            />
          </Field>
          <Field label="Department">
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={profile.department}
              placeholder="e.g. Computer Science"
              onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
              disabled={profileBusy}
            />
          </Field>
          <Field label="Subjects (comma-separated)" wide>
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={profile.subjects}
              placeholder="Data Structures, Databases, Operating Systems"
              onChange={(e) => setProfile((p) => ({ ...p, subjects: e.target.value }))}
              disabled={profileBusy}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={!profileDirty || profileBusy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#151d3a] px-4 text-sm font-semibold text-white hover:bg-[#252f55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
          {profileDirty && !profileBusy ? (
            <button
              type="button"
              onClick={() => setProfile(initialProfile)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#5d6580] hover:bg-[#fafbff]"
            >
              Reset
            </button>
          ) : null}
          <StatusInline msg={profileMsg} />
        </div>
      </section>

      {/* ---------- SECURITY ---------- */}
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <KeyRound className="h-4 w-4 text-[#6562f1]" />
          Security
        </h2>
        <p className="mt-2 text-sm text-[#5d6580]">
          Manage password reset and end sessions on other devices.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
              <Mail className="h-4 w-4 text-[#6562f1]" /> Reset password
            </div>
            <p className="mt-1 text-xs text-[#7f88a6]">
              We'll send a secure link to <span className="font-semibold">{user?.email || "—"}</span>.
            </p>
            <button
              type="button"
              onClick={onSendReset}
              disabled={resetBusy || !user?.email}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] hover:bg-[#f6f7fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send password reset email
            </button>
            <StatusInline msg={resetMsg} className="mt-2" />
          </div>

          <div className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
              <LogOut className="h-4 w-4 text-[#6562f1]" /> Sign out other sessions
            </div>
            <p className="mt-1 text-xs text-[#7f88a6]">
              Ends every session except this one — useful if you forgot to sign out elsewhere.
            </p>
            <button
              type="button"
              onClick={onSignOutOthers}
              disabled={signOutBusy}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58] hover:bg-[#f6f7fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signOutBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out other sessions
            </button>
            <StatusInline msg={signOutMsg} className="mt-2" />
          </div>
        </div>
      </section>

      {/* ---------- PREFERENCES ---------- */}
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <SettingsIcon className="h-4 w-4 text-[#6562f1]" />
          Preferences
        </h2>
        <p className="mt-1 text-xs text-[#7f88a6]">
          Defaults used when generating new exams. Stored in this browser only.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Default duration (min)">
            <input
              type="number"
              min={5}
              max={600}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.defaultDuration}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, defaultDuration: clampInt(e.target.value, 5, 600, 60) }))
              }
            />
          </Field>
          <Field label="Default total marks">
            <input
              type="number"
              min={1}
              max={1000}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.defaultMarks}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, defaultMarks: clampInt(e.target.value, 1, 1000, 100) }))
              }
            />
          </Field>
          <Field label="AI flag threshold %">
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.aiFlagThreshold}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, aiFlagThreshold: clampInt(e.target.value, 0, 100, 70) }))
              }
            />
          </Field>
          <Field label="Evaluation behavior">
            <select
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.evaluationStrictness}
              onChange={(e) => setPrefs((p) => ({ ...p, evaluationStrictness: e.target.value }))}
            >
              <option value="lenient">Lenient</option>
              <option value="medium">Medium</option>
              <option value="strict">Strict</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSavePrefs}
            disabled={!prefsDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#151d3a] px-4 text-sm font-semibold text-white hover:bg-[#252f55] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save preferences
          </button>
          <button
            type="button"
            onClick={onResetPrefs}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#5d6580] hover:bg-[#fafbff]"
          >
            Reset to defaults
          </button>
          <StatusInline msg={prefsMsg} />
        </div>
      </section>
    </div>
  )
}

// ---------- helpers ----------

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function Field({ label, children, wide }) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[#5d6580]">{label}</span>
      {children}
    </label>
  )
}

function StatusInline({ msg, className = "" }) {
  if (!msg) return null
  const ok = msg.ok
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        ok ? "text-[#1f9d67]" : "text-[#c94a4a]"
      } ${className}`}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      <span className="break-words">{msg.text}</span>
    </div>
  )
}
