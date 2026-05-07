import { useState } from "react"
import { KeyRound, User } from "lucide-react"
import { TEACHER_PREFERENCES, TEACHER_PROFILE } from "../../data/teacherMockData"

export default function TeacherSettingsPage() {
  const [profile, setProfile] = useState({ ...TEACHER_PROFILE })
  const [prefs, setPrefs] = useState({ ...TEACHER_PREFERENCES })
  const [subjectsText, setSubjectsText] = useState(TEACHER_PROFILE.subjects.join(", "))

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Profile, security, and AI defaults</p>
      </div>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <User className="h-4 w-4 text-[#6562f1]" />
          Profile
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[#5d6580]">Name</span>
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#5d6580]">Department</span>
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={profile.department}
              onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-[#5d6580]">Subjects (comma-separated)</span>
            <input
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              value={subjectsText}
              onChange={(e) => {
                setSubjectsText(e.target.value)
                setProfile((p) => ({ ...p, subjects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
          <KeyRound className="h-4 w-4 text-[#6562f1]" />
          Security
        </h2>
        <p className="mt-2 text-sm text-[#5d6580]">Password changes use Supabase recovery flow (mock buttons).</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-[#e3e6ef] bg-white px-4 py-2 text-sm font-semibold text-[#313a58]">
            Send password reset email
          </button>
          <button type="button" className="rounded-xl border border-[#e3e6ef] bg-white px-4 py-2 text-sm font-semibold text-[#313a58]">
            Sign out other sessions
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-[#151d3a]">Preferences</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[#5d6580]">Default duration (min)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.defaultDuration}
              onChange={(e) => setPrefs((p) => ({ ...p, defaultDuration: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#5d6580]">Default total marks</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.defaultMarks}
              onChange={(e) => setPrefs((p) => ({ ...p, defaultMarks: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#5d6580]">AI flag threshold %</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.aiFlagThreshold}
              onChange={(e) => setPrefs((p) => ({ ...p, aiFlagThreshold: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#5d6580]">Evaluation behavior</span>
            <select
              className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
              value={prefs.evaluationStrictness}
              onChange={(e) => setPrefs((p) => ({ ...p, evaluationStrictness: e.target.value }))}
            >
              <option value="lenient">Lenient</option>
              <option value="medium">Medium</option>
              <option value="strict">Strict</option>
            </select>
          </label>
        </div>
        <button type="button" className="mt-6 rounded-xl bg-[#151d3a] px-4 py-2.5 text-sm font-semibold text-white">
          Save preferences
        </button>
      </section>
    </div>
  )
}
