import { useMemo } from "react"
import { Loader2, Save } from "lucide-react"
import { displayExamTitle } from "../../../utils/examTitle"

function classNames(...xs) {
  return xs.filter(Boolean).join(" ")
}

function computeQuestionBreakdown(questions) {
  const out = {
    mcq: { count: 0, marksEach: 0, subtotal: 0 },
    short: { count: 0, marksEach: 0, subtotal: 0 },
    essay: { count: 0, marksEach: 0, subtotal: 0 },
    totalQuestions: 0,
    totalMarks: 0,
  }
  for (const q of questions) {
    const marks = Number(q.marks) || 0
    const type = q.question_type === "mcq" ? "mcq" : q.question_type === "essay" ? "essay" : "short"
    out[type].count += 1
    out[type].subtotal += marks
    out.totalMarks += marks
    out.totalQuestions += 1
  }
  for (const type of ["mcq", "short", "essay"]) {
    if (out[type].count > 0) out[type].marksEach = Math.round((out[type].subtotal / out[type].count) * 10) / 10
  }
  return out
}
export default function PostGenActionsPanel({
  exam,
  questions,
  isMultiSource = false,
  multiSource = null,
  breakdown,
  displayTitle,
  durationMinutes,
  difficultyLabel,
  draftSaving,
  publishPreparing = false,
  savingToBank = false,
  allInBank = false,
  settingsOpen,
  settingsForm,
  settingsSaving,
  onToggleSettings,
  onChangeSettings,
  onSaveSettings,
  onCancelSettings,
  onPublish,
  onSaveDraft,
  onSaveToBank,
  marksStatus,
}) {
  const liveBreakdown = useMemo(() => computeQuestionBreakdown(questions), [questions])
  const summaryQuestions = liveBreakdown.totalQuestions
  const summaryMarks = liveBreakdown.totalMarks

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 text-xs text-[#5d6580] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#151d3a]">Exam summary</p>
          <button
            type="button"
            onClick={onToggleSettings}
            className="shrink-0 text-xs font-semibold text-[#5f4ce6] hover:text-[#4a46d4] hover:underline"
          >
            Edit settings
          </button>
        </div>
        {settingsOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] p-3">
            <label className="block text-xs">
              <span className="text-[#5d6580]">Title</span>
              <input
                value={settingsForm.title}
                onChange={(e) => onChangeSettings((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[#5d6580]">Duration (minutes)</span>
              <input
                type="number"
                min={1}
                value={settingsForm.duration_minutes}
                onChange={(e) =>
                  onChangeSettings((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[#5d6580]">Description (optional)</span>
              <textarea
                rows={2}
                value={settingsForm.description}
                onChange={(e) => onChangeSettings((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full resize-none rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCancelSettings}
                disabled={settingsSaving}
                className="h-9 rounded-xl border border-[#e3e6ef] bg-white px-3 text-xs font-semibold text-[#313a58]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveSettings}
                disabled={settingsSaving || !settingsForm.title.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6562f1] px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {settingsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : null}
        <dl className="mt-3 space-y-1.5">
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Title</dt>
            <dd className="max-w-[58%] truncate text-right font-medium text-[#151d3a]">
              {displayExamTitle(displayTitle || exam.title)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Duration</dt>
            <dd className="font-medium text-[#151d3a]">{durationMinutes ?? exam.duration_minutes ?? 60} min</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#7f88a6]">Difficulty</dt>
            <dd className="font-medium text-[#151d3a]">{difficultyLabel}</dd>
          </div>
        </dl>
        {marksStatus && !isMultiSource ? (
          <div className="mt-3 border-t border-[#eef1f7] pt-3">
            <p className="text-[#7f88a6]">Target: {marksStatus.target} marks</p>
            <p className="mt-1 text-[#7f88a6]">Current: {marksStatus.current} marks</p>
            <p
              className={classNames(
                "mt-1.5 font-medium",
                marksStatus.tone === "balanced" ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {marksStatus.message}
            </p>
          </div>
        ) : null}
        {isMultiSource && multiSource?.sources?.length ? (
          <div className="mt-3 border-t border-[#eef1f7] pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3c2]">
              Sources
            </p>
            <dl className="mt-2 space-y-1.5">
              {multiSource.sources.map((src) => (
                <div key={src.key} className="flex justify-between gap-2">
                  <dt className="max-w-[58%] truncate text-[#7f88a6]">{src.title}</dt>
                  <dd className="shrink-0 font-medium text-[#313a58]">{src.marks} marks</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <p className="mt-3 border-t border-[#eef1f7] pt-3 font-semibold text-[#151d3a]">
          Total: {liveBreakdown.totalQuestions} questions - {liveBreakdown.totalMarks} pts
        </p>
      </section>

      <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#151d3a]">Exam ready</p>
        <p className="mt-1 text-xs text-[#7f88a6]">
          {summaryQuestions} questions - {summaryMarks} marks
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <button
              type="button"
              onClick={onPublish}
              disabled={!questions.length || publishPreparing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-[#5a56e2] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:bg-[#6562f1] disabled:active:scale-100"
            >
              {publishPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {publishPreparing ? "Preparing..." : "Publish Exam"}
            </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              Publishes exam and saves all questions to your bank
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={draftSaving}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-white text-xs font-semibold text-[#313a58] shadow-sm transition-all duration-200 ease-out hover:border-[#c9c4f5] hover:bg-[#fafbff] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:border-[#e3e6ef] disabled:hover:bg-white disabled:active:scale-100"
            >
              {draftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save as Draft
            </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              Keeps exam hidden and saves all questions to your bank
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onSaveToBank}
              disabled={savingToBank || !questions.length}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e3e6ef] bg-[#fafbff] text-xs font-semibold text-[#5d6580] shadow-sm transition-all duration-200 ease-out hover:border-[#c9c4f5] hover:bg-white hover:text-[#4a46d4] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:border-[#e3e6ef] disabled:hover:bg-[#fafbff] disabled:hover:text-[#5d6580] disabled:active:scale-100"
            >
              {savingToBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {savingToBank ? "Saving..." : allInBank ? "Saved to Question Bank" : "Save to Question Bank"}
              </button>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-[#8a93ad]">
              {allInBank
                ? "All questions are in your bank for reuse"
                : "Saves questions only, exam stays as draft"}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}