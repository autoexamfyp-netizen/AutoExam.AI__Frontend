import { useEffect, useState } from "react"
import { Eye, PenLine } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherSubmissionsMock, TEACHER_SUBMISSION_DETAIL } from "../../data/teacherMockData"

export default function TeacherSubmissionsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [openId, setOpenId] = useState(null)
  const [overrideScore, setOverrideScore] = useState("")
  const [remarks, setRemarks] = useState("")

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherSubmissionsMock()
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
        <SectionSkeleton rows={5} />
      </div>
    )
  }

  const open = openId ? rows.find((r) => r.id === openId) : null

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Submissions</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Monitor attempts, review answers, manual overrides</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-[#eef1f7] bg-[#fafbff] text-xs font-semibold uppercase tracking-wide text-[#8a93ad]">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#f4f6fb]">
                <td className="px-4 py-3 font-medium text-[#151d3a]">{r.studentName}</td>
                <td className="px-4 py-3 text-[#5d6580]">{r.examTitle}</td>
                <td className="px-4 py-3 text-[#7f88a6]">{new Date(r.submittedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#f4f6fb] px-2 py-0.5 text-xs font-semibold capitalize text-[#313a58]">{r.status}</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-[#151d3a]">
                  {r.score != null ? `${r.score}/${r.maxScore}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(r.id)
                      setOverrideScore(r.score != null ? String(r.score) : "")
                      setRemarks("")
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e3e6ef] px-2 py-1.5 text-xs font-semibold text-[#313a58] hover:bg-[#fafbff]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0f1730]/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e7eaf3] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#151d3a]">{TEACHER_SUBMISSION_DETAIL.studentName}</h2>
                <p className="text-xs text-[#7f88a6]">{TEACHER_SUBMISSION_DETAIL.examTitle}</p>
              </div>
              <button type="button" className="text-sm font-semibold text-[#6e63f6]" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {TEACHER_SUBMISSION_DETAIL.answers.map((a, i) => (
                <div key={i} className="rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3 text-sm">
                  <p className="font-medium text-[#151d3a]">{a.q}</p>
                  <p className="mt-1 text-[#5d6580]">
                    <span className="text-xs font-semibold text-[#8a93ad]">Student</span> {a.student}
                  </p>
                  <p className="mt-1 text-[#5d6580]">
                    <span className="text-xs font-semibold text-[#8a93ad]">Model</span> {a.model}
                  </p>
                  <p className="mt-1 text-xs text-[#6562f1]">Semantic similarity: {Math.round(a.similarity * 100)}%</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#eef1f7] pt-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[#5d6580]">Adjust score</span>
                <input
                  className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[#5d6580]">Remarks</span>
                <textarea className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </label>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#151d3a] px-4 text-sm font-semibold text-white"
              onClick={() => alert("Demo: override saved")}
            >
              <PenLine className="h-4 w-4" />
              Apply override
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
