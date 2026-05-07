import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Cpu, RefreshCw, Sparkles, Wand2 } from "lucide-react"
import { TEACHER_GENERATED_QUESTIONS, TEACHER_GENERATION_CONFIG_DEFAULT } from "../../data/teacherMockData"

export default function TeacherGenerateExamPage() {
  const [cfg, setCfg] = useState(() => ({ ...TEACHER_GENERATION_CONFIG_DEFAULT }))
  const [questions, setQuestions] = useState(() => TEACHER_GENERATED_QUESTIONS.map((q) => ({ ...q })))
  const [generating, setGenerating] = useState(false)

  const regenOne = (id) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, prompt: `${q.prompt} (regenerated)`, generatedAt: new Date().toISOString() } : q)),
    )
  }

  const regenAll = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 900))
    setQuestions((prev) => prev.map((q) => ({ ...q, prompt: `${q.prompt.split(" (")[0]} — refreshed`, generatedAt: new Date().toISOString() })))
    setGenerating(false)
  }

  const summary = useMemo(
    () => ({
      totalQ: cfg.mcq + cfg.short + cfg.essay,
      marks: cfg.totalMarks,
    }),
    [cfg],
  )

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#151d3a] sm:text-2xl">Generate exam</h1>
          <p className="mt-1 text-sm text-[#7d86a5]">Configure AI output — Bloom levels, difficulty, question mix</p>
        </div>
        <Link
          to="/teacher-dashboard/exams/exam-draft-1/review"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white hover:bg-[#5a56e2]"
        >
          Continue to review →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-[#e7eaf3] bg-white p-5 shadow-sm xl:col-span-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <Cpu className="h-4 w-4 text-[#6562f1]" />
            Configuration
          </div>
          {[
            ["MCQ count", "mcq", cfg.mcq],
            ["Short answer", "short", cfg.short],
            ["Essay", "essay", cfg.essay],
            ["Total marks", "totalMarks", cfg.totalMarks],
          ].map(([label, key, val]) => (
            <label key={key} className="block text-sm">
              <span className="text-[#5d6580]">{label}</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
                value={val}
                onChange={(e) => setCfg((c) => ({ ...c, [key]: Number(e.target.value) }))}
              />
            </label>
          ))}
          <p className="text-xs text-[#8a93ad]">
            Difficulty: Easy {cfg.difficulty.easy}% · Med {cfg.difficulty.medium}% · Hard {cfg.difficulty.hard}%
          </p>
          <button
            type="button"
            disabled={generating}
            onClick={regenAll}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#151d3a] text-sm font-semibold text-white transition hover:bg-[#252f55] disabled:opacity-50"
          >
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Regenerate full exam
          </button>
          <p className="text-center text-xs text-[#8a93ad]">
            {summary.totalQ} questions · {summary.marks} marks (preview)
          </p>
        </div>

        <div className="min-w-0 space-y-4 xl:col-span-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
            <Sparkles className="h-4 w-4 text-[#6562f1]" />
            Generated output
          </div>
          {questions.map((q) => (
            <article key={q.id} className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-[#f1efff] px-2 py-0.5 font-medium text-[#5f4ce6]">{q.type}</span>
                <span className="text-[#7f88a6]">{q.topic}</span>
                <span className="text-[#7f88a6]">{q.difficulty}</span>
                <span className="text-[#7f88a6]">Bloom: {q.bloom}</span>
                <span className="text-[#99a0b7]">{new Date(q.generatedAt).toLocaleString()}</span>
                <span className="ml-auto font-medium text-[#151d3a]">{q.marks} pts</span>
              </div>
              <p className="mt-3 text-sm font-medium text-[#1a2341]">{q.prompt}</p>
              {q.options ? (
                <ul className="mt-2 space-y-1 text-sm text-[#5d6580]">
                  {q.options.map((o) => (
                    <li key={o}>· {o}</li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-[#8a93ad]">Model: {q.modelAnswer}</p>
              <button
                type="button"
                onClick={() => regenOne(q.id)}
                className="mt-3 text-xs font-semibold text-[#6e63f6] hover:underline"
              >
                Regenerate this question
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
