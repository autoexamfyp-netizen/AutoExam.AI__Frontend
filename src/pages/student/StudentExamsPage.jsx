import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AlarmClock, AlertCircle, BookOpenCheck, ClipboardList, Eye, PlayCircle, RefreshCw } from "lucide-react"
import StatusBadge from "../../components/student/StatusBadge"
import EmptyState from "../../components/student/EmptyState"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchStudentExamsCatalog } from "../../services/studentExamService"

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "missed", label: "Missed" },
]

function fmt(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

function ExamRowCard({ row }) {
  const p = row.published
  const publishedId = p.id
  const title = p.title
  const subj = p.category?.title || "Subject"
  const deadline = p.end_time
  const duration = p.duration_minutes
  const { studentStatus, windowStatus } = row

  let badgeStatus = "available"
  let badgeLabel = undefined
  if (studentStatus === "completed") {
    badgeStatus = "completed"
  } else if (studentStatus === "missed" || windowStatus === "expired") {
    badgeStatus = "expired"
  } else if (studentStatus === "in_progress") {
    badgeStatus = "available"
    badgeLabel = "In progress"
  } else if (windowStatus === "upcoming") {
    badgeStatus = "upcoming"
  } else if (windowStatus === "active") {
    badgeStatus = "available"
  }

  const action = (() => {
    if (studentStatus === "completed") {
      return (
        <Link
          to="/student-dashboard/results"
          state={{ submissionId: row.submission?.id, publishedId }}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] sm:w-auto sm:min-w-[120px]"
        >
          <Eye className="h-4 w-4" />
          View result
        </Link>
      )
    }
    if (studentStatus === "in_progress") {
      if (windowStatus === "expired" || studentStatus === "missed") {
        return (
          <button
            type="button"
            disabled
            className="h-10 w-full cursor-not-allowed rounded-xl bg-[#f1f3f8] text-sm font-semibold text-[#8a93ad] sm:w-auto sm:min-w-[120px]"
          >
            Expired
          </button>
        )
      }
      return (
        <Link
          to={`/student-dashboard/exams/${publishedId}/attempt`}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] sm:w-auto sm:min-w-[120px]"
        >
          <PlayCircle className="h-4 w-4" />
          Continue
        </Link>
      )
    }
    if (windowStatus === "upcoming") {
      return (
        <button
          type="button"
          disabled
          className="h-10 w-full cursor-not-allowed rounded-xl bg-[#f1f3f8] text-sm font-semibold text-[#8a93ad] sm:w-auto sm:min-w-[120px]"
        >
          Not yet open
        </button>
      )
    }
    if (windowStatus === "expired") {
      return (
        <button
          type="button"
          disabled
          className="h-10 w-full cursor-not-allowed rounded-xl bg-[#f1f3f8] text-sm font-semibold text-[#8a93ad] sm:w-auto sm:min-w-[120px]"
        >
          Expired
        </button>
      )
    }
    return (
      <Link
        to={`/student-dashboard/exams/${publishedId}/attempt`}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] sm:w-auto sm:min-w-[120px]"
      >
        <PlayCircle className="h-4 w-4" />
        Start exam
      </Link>
    )
  })()

  return (
    <article className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-[#171f3c]">{title}</h3>
            <span className="shrink-0 pt-0.5">
              <StatusBadge status={badgeStatus} label={badgeLabel} />
            </span>
          </div>
          <p className="text-xs text-[#7f88a6]">{subj}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#697391]">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {p.total_questions ?? 0} questions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4" />
              {duration} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlarmClock className="h-4 w-4" />
              {fmt(deadline)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col justify-center sm:pt-1">{action}</div>
      </div>
    </article>
  )
}

export default function StudentExamsPage() {
  const [tab, setTab] = useState("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [raw, setRaw] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const exams = await fetchStudentExamsCatalog()
      setRaw(exams)
    } catch (e) {
      setError(
        e?.message?.includes("Failed to fetch")
          ? "Cannot reach the API — is the backend running on port 4000?"
          : e?.message || "Could not load exams.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const list = useMemo(() => {
    return raw.filter((row) => {
      const { studentStatus } = row
      if (tab === "all") return true
      if (tab === "completed") return studentStatus === "completed"
      if (tab === "missed") return studentStatus === "missed"
      return studentStatus !== "completed" && studentStatus !== "missed"
    })
  }, [raw, tab])

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Exams</h1>
          <p className="mt-1 break-words text-sm text-[#7d86a5]">Browse scheduled assessments</p>
        </div>
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Exams</h1>
          <p className="mt-1 break-words text-sm text-[#7d86a5]">
            Browse all assessments or filter by active, completed, and missed
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm font-semibold text-[#313a58]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex min-w-0 max-w-full flex-wrap gap-1 rounded-xl border border-[#e7eaf3] bg-white p-1 shadow-sm sm:flex-nowrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-w-[4.5rem] flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              tab === t.id ? "bg-[#f1efff] text-[#5f4ce6]" : "text-[#5d6580] hover:bg-[#fafbff]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description={
              tab === "all"
                ? "When your teachers publish exams, they will show up here."
                : tab === "active"
                  ? "You have no active or upcoming exams right now."
                  : tab === "completed"
                    ? "Completed attempts will appear in this tab."
                    : "Missed or expired windows are listed here."
            }
          />
        ) : (
          list.map((row) => <ExamRowCard key={row.published.id} row={row} />)
        )}
      </div>
    </div>
  )
}
