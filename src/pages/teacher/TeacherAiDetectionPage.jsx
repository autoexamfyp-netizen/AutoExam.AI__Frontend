import { useEffect, useState } from "react"
import { AlertTriangle, Check, Flag, Shield } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherAiDetectionsMock, TEACHER_AI_SETTINGS_DEFAULT } from "../../data/teacherMockData"

export default function TeacherAiDetectionPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [sensitivity, setSensitivity] = useState(TEACHER_AI_SETTINGS_DEFAULT.sensitivity)
  const [threshold, setThreshold] = useState(TEACHER_AI_SETTINGS_DEFAULT.flagThreshold)

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherAiDetectionsMock()
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
    <div className="min-w-0 max-w-full space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">AI detection</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Risk scoring, thresholds, and review actions</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <Shield className="h-4 w-4 text-[#6562f1]" />
            Threshold settings
          </h2>
          <label className="mt-4 block text-sm">
            <span className="text-[#5d6580]">Detection sensitivity ({sensitivity})</span>
            <input type="range" min={40} max={95} className="mt-2 w-full accent-[#6562f1]" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} />
          </label>
          <label className="mt-4 block text-sm">
            <span className="text-[#5d6580]">Flag threshold % ({threshold})</span>
            <input type="range" min={50} max={95} className="mt-2 w-full accent-[#6562f1]" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </label>
        </div>
        <div className="rounded-2xl border border-dashed border-[#d8ddf0] bg-[#fafbff] p-5 text-sm text-[#5d6580]">
          Adjust sensitivity to trade off false positives vs missed AI-assisted responses. Threshold marks submissions for manual review when probability exceeds the value.
        </div>
      </div>

      <section className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className={`rounded-2xl border p-4 shadow-sm ${r.flagged ? "border-amber-200 bg-amber-50/40" : "border-[#e7eaf3] bg-white"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#151d3a]">{r.student}</p>
                <p className="text-xs text-[#7f88a6]">{r.exam}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${r.risk === "high" ? "bg-red-100 text-red-800" : r.risk === "medium" ? "bg-amber-100 text-amber-900" : "bg-[#e8fbf3] text-[#1f9d67]"}`}>
                  {r.risk} risk
                </span>
                {r.flagged ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-2 py-0.5 text-xs font-semibold text-amber-950">
                    <Flag className="h-3 w-3" /> Flagged
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#5d6580]">AI probability</span>
                <span className="font-semibold tabular-nums text-[#151d3a]">{Math.round(r.probability * 100)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eef1f7]">
                <div className={`h-full rounded-full ${r.probability >= 0.7 ? "bg-red-500" : "bg-[#6562f1]"}`} style={{ width: `${r.probability * 100}%` }} />
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-[#e7eaf3] bg-white/80 p-3 text-sm italic text-[#313a58]">&ldquo;{r.excerpt}&rdquo;</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded-xl border border-[#e3e6ef] bg-white px-3 py-2 text-xs font-semibold text-[#313a58]">
                <Check className="mr-1 inline h-3.5 w-3.5" />
                Mark valid
              </button>
              <button type="button" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                Suspicious
              </button>
              <button type="button" className="rounded-xl bg-[#151d3a] px-3 py-2 text-xs font-semibold text-white">
                Request resubmission
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
