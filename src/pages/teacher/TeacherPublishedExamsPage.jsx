import { useEffect, useState } from "react"
import { Bell, Clock, Lock, Shuffle } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherPublishedMock } from "../../data/teacherMockData"

function fmt(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function TeacherPublishedExamsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherPublishedMock()
      if (!c) {
        setRows(d)
        setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-w-0 max-w-full">
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Published exams</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Live schedules, access rules, and notifications</p>
      </div>

      <div className="space-y-3">
        {rows.map((e) => (
          <article key={e.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#151d3a]">{e.title}</p>
                <p className="text-xs text-[#7f88a6]">{e.code} · {e.group}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  e.status === "live" ? "bg-[#e8fbf3] text-[#1f9d67]" : "bg-[#f1f3f8] text-[#5a6178]"
                }`}
              >
                {e.status}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#5d6580] sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#8a93ad]" />
                <span>
                  {fmt(e.startAt)} → {fmt(e.endAt)}
                </span>
              </div>
              <div>
                Duration <span className="font-medium text-[#151d3a]">{e.durationMinutes} min</span>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {e.oneAttempt ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#f4f6fb] px-2 py-1 text-xs font-medium text-[#313a58]">
                  <Lock className="h-3.5 w-3.5" /> One attempt
                </span>
              ) : null}
              {e.randomized ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#f4f6fb] px-2 py-1 text-xs font-medium text-[#313a58]">
                  <Shuffle className="h-3.5 w-3.5" /> Randomized
                </span>
              ) : null}
              {e.notifyDeadline ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#fff6e3] px-2 py-1 text-xs font-medium text-[#8a5a12]">
                  <Bell className="h-3.5 w-3.5" /> Deadline alerts
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
