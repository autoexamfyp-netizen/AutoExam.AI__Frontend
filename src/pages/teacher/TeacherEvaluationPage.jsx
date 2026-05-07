import { useEffect, useState } from "react"
import { RefreshCw, Sliders } from "lucide-react"
import SectionSkeleton from "../../components/ui/SectionSkeleton"
import { fetchTeacherEvaluationsMock, TEACHER_EVALUATION_DETAIL } from "../../data/teacherMockData"

export default function TeacherEvaluationPage() {
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [strictness, setStrictness] = useState(TEACHER_EVALUATION_DETAIL.strictness)

  useEffect(() => {
    let c = false
    ;(async () => {
      const d = await fetchTeacherEvaluationsMock()
      if (!c) {
        setBatches(d)
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
        <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Evaluation</h1>
        <p className="mt-1 text-sm text-[#7d86a5]">Automated grading pipeline and re-run controls</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#151d3a]">Written evaluation signals</h2>
          <p className="text-xs text-[#7f88a6]">Last selected batch (mock)</p>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f4f6fb] p-3">
              <dt className="text-xs text-[#8a93ad]">Semantic similarity</dt>
              <dd className="text-lg font-semibold text-[#151d3a]">{Math.round(TEACHER_EVALUATION_DETAIL.semanticSimilarity * 100)}%</dd>
            </div>
            <div className="rounded-xl bg-[#f4f6fb] p-3">
              <dt className="text-xs text-[#8a93ad]">Keyword match</dt>
              <dd className="text-lg font-semibold text-[#151d3a]">{Math.round(TEACHER_EVALUATION_DETAIL.keywordMatch * 100)}%</dd>
            </div>
            <div className="rounded-xl bg-[#f4f6fb] p-3">
              <dt className="text-xs text-[#8a93ad]">Rubric score</dt>
              <dd className="text-lg font-semibold text-[#151d3a]">{TEACHER_EVALUATION_DETAIL.rubricScore}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <Sliders className="h-4 w-4 text-[#6562f1]" />
            Strictness
          </div>
          <select className="mt-3 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm" value={strictness} onChange={(e) => setStrictness(e.target.value)}>
            <option value="lenient">Lenient</option>
            <option value="medium">Medium</option>
            <option value="strict">Strict</option>
          </select>
          <button type="button" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white">
            <RefreshCw className="h-4 w-4" />
            Re-run evaluation
          </button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#151d3a]">Batches</h2>
        <div className="space-y-2">
          {batches.map((b) => (
            <article key={b.id} className="flex flex-col gap-2 rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#151d3a]">{b.examTitle}</p>
                <p className="text-xs text-[#7f88a6]">{b.batch}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f4f6fb] px-2.5 py-0.5 text-xs font-semibold capitalize text-[#313a58]">{b.status}</span>
                <span className="text-xs text-[#5d6580]">
                  {b.total - b.pending}/{b.total} done
                </span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-[#eef1f7]">
                  <div className="h-full bg-[#6562f1]" style={{ width: `${((b.total - b.pending) / b.total) * 100}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
