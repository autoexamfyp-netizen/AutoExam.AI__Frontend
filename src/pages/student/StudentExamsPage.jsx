import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AlarmClock, BookOpenCheck, ClipboardList, Eye, PlayCircle } from "lucide-react"
import StatusBadge from "../../components/student/StatusBadge"
import EmptyState from "../../components/student/EmptyState"
import { filterExamsByTab } from "../../data/studentMockData"

const TABS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "missed", label: "Missed" },
]

function ExamRowCard({ exam }) {
  const deadlineLabel = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(exam.deadline))
    } catch {
      return exam.deadline
    }
  })()

  const badgeStatus =
    exam.status === "available"
      ? "available"
      : exam.status === "upcoming"
        ? "upcoming"
        : exam.status === "completed"
          ? "completed"
          : "expired"

  const action =
    exam.tab === "active" && exam.status === "available" ? (
      <Link
        to={`/student-dashboard/exams/${exam.id}/attempt`}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] sm:w-auto sm:min-w-[120px]"
      >
        <PlayCircle className="h-4 w-4" />
        Start
      </Link>
    ) : exam.tab === "completed" ? (
      <Link
        to="/student-dashboard/results"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-sm font-semibold text-[#313a58] transition hover:bg-[#fafbff] sm:w-auto sm:min-w-[120px]"
      >
        <Eye className="h-4 w-4" />
        View
      </Link>
    ) : exam.tab === "missed" || exam.status === "expired" ? (
      <button
        type="button"
        disabled
        className="h-10 w-full cursor-not-allowed rounded-xl bg-[#f1f3f8] text-sm font-semibold text-[#8a93ad] sm:w-auto sm:min-w-[120px]"
      >
        Expired
      </button>
    ) : (
      <button
        type="button"
        disabled
        className="h-10 w-full cursor-not-allowed rounded-xl bg-[#f1f3f8] text-sm font-semibold text-[#8a93ad] sm:w-auto sm:min-w-[120px]"
      >
        Not yet open
      </button>
    )

  return (
    <article className="min-w-0 max-w-full rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-[0_1px_3px_rgba(27,39,94,0.04)] transition hover:shadow-[0_8px_24px_rgba(27,39,94,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-[#171f3c]">{exam.title}</h3>
            <span className="shrink-0 pt-0.5">
              <StatusBadge status={badgeStatus} />
            </span>
          </div>
          <p className="text-xs text-[#7f88a6]">{exam.code}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#697391]">
            <span className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {exam.questionsCount} questions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck className="h-4 w-4" />
              {exam.durationMinutes} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <AlarmClock className="h-4 w-4" />
              {deadlineLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#99a0b7]">
            Attempts: {exam.attemptsUsed}/{exam.attemptsAllowed}
          </p>
        </div>
        <div className="flex shrink-0 flex-col justify-center sm:pt-1">{action}</div>
      </div>
    </article>
  )
}

export default function StudentExamsPage() {
  const [tab, setTab] = useState("active")

  const list = useMemo(() => filterExamsByTab(tab), [tab])

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="min-w-0 max-w-full">
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[#151d3a] sm:text-2xl">Exams</h1>
        <p className="mt-1 break-words text-sm text-[#7d86a5]">Browse active, completed, and missed assessments</p>
      </div>

      <div className="flex min-w-0 max-w-full gap-1 rounded-xl border border-[#e7eaf3] bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
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
            description="When exams are scheduled for this category, they will appear in this list."
          />
        ) : (
          list.map((exam) => <ExamRowCard key={exam.id} exam={exam} />)
        )}
      </div>
    </div>
  )
}
