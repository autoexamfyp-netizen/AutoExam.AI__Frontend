import { useRef, useState } from "react"
import { Cpu, RefreshCw, Wand2 } from "lucide-react"
import ConfigWeightageSection from "./ConfigWeightageSection"
import StatPill from "../shared/StatPill"
import RequiredMark from "../shared/RequiredMark"
import FieldError from "../shared/FieldError"
import NumericField, { inputStateClass } from "../shared/NumericField"
import { digitsOnly, getCountValue } from "../../utils/examConfig"
import { sanitizeExamTitleInput } from "../../utils/examTitle"
function ExamQuestionFieldsBlock({
  cfg,
  validation,
  showErr,
  touch,
  patch,
  handleCountChange,
  blurCount,
  mcqN,
  shortN,
  essayN,
  marksMcqRef,
  marksShortRef,
  marksEssayRef,
}) {
  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumericField
          label="Number of MCQs"
          value={cfg.targetMcq}
          placeholder="e.g. 5"
          error={showErr("targetMcq", validation.mcqCount.error)}
          valid={validation.mcqCount.valid && String(cfg.targetMcq).trim() !== ""}
          onChange={(v) => handleCountChange("targetMcq", "marksMcq", v)}
          onBlur={() => blurCount("targetMcq", 50)}
        />
        <NumericField
          label="Short answer questions"
          value={cfg.targetShort}
          placeholder="e.g. 3"
          error={showErr("targetShort", validation.shortCount.error)}
          valid={validation.shortCount.valid && String(cfg.targetShort).trim() !== ""}
          onChange={(v) => handleCountChange("targetShort", "marksShort", v)}
          onBlur={() => blurCount("targetShort", 30)}
        />
        <NumericField
          label="Essay / Subjective questions"
          value={cfg.targetEssay}
          placeholder="e.g. 2"
          error={showErr("targetEssay", validation.essayCount.error)}
          valid={validation.essayCount.valid && String(cfg.targetEssay).trim() !== ""}
          onChange={(v) => handleCountChange("targetEssay", "marksEssay", v)}
          onBlur={() => blurCount("targetEssay", 10)}
        />
      </div>

      {validation.allocation ? (
        <p
          className={`mt-2 text-xs ${
            validation.allocation.type === "balanced" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {validation.allocation.type === "balanced"
            ? "Marks balanced perfectly"
            : validation.allocation.message}
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumericField
          label="Marks per MCQ"
          value={mcqN > 0 ? cfg.marksMcq : ""}
          placeholder={mcqN > 0 ? "e.g. 2" : "-"}
          disabled={mcqN === 0}
          inputRef={marksMcqRef}
          error={showErr("marksMcq", validation.marksMcq.error)}
          valid={mcqN > 0 && validation.marksMcq.valid && String(cfg.marksMcq).trim() !== ""}
          onChange={(v) => patch("marksMcq", v)}
          onBlur={() => touch("marksMcq")}
        />
        <NumericField
          label="Marks per Short"
          value={shortN > 0 ? cfg.marksShort : ""}
          placeholder={shortN > 0 ? "e.g. 4" : "-"}
          disabled={shortN === 0}
          inputRef={marksShortRef}
          error={showErr("marksShort", validation.marksShort.error)}
          valid={shortN > 0 && validation.marksShort.valid && String(cfg.marksShort).trim() !== ""}
          onChange={(v) => patch("marksShort", v)}
          onBlur={() => touch("marksShort")}
        />
        <NumericField
          label="Marks per Essay"
          value={essayN > 0 ? cfg.marksEssay : ""}
          placeholder={essayN > 0 ? "e.g. 10" : "-"}
          disabled={essayN === 0}
          inputRef={marksEssayRef}
          error={showErr("marksEssay", validation.marksEssay.error)}
          valid={essayN > 0 && validation.marksEssay.valid && String(cfg.marksEssay).trim() !== ""}
          onChange={(v) => patch("marksEssay", v)}
          onBlur={() => touch("marksEssay")}
        />
      </div>
    </>
  )
}

export default function ConfigPanel({
  cfg,
  onChange,
  totals,
  validation,
  canGenerateExam,
  generating,
  mode,
  configSubmitAttempted,
  onGenerateExam,
  picked,
  selectedBankSummary,
  generateDisabledTooltip,
  generateProgressLabel = null,
  multiSourceWeightage = null,
}) {
  const isBank = mode === "bank"
  const showMultiSourceWeightage = Boolean(multiSourceWeightage)
  const showExamQuestionFields = !isBank
  const [touched, setTouched] = useState({})
  const marksMcqRef = useRef(null)
  const marksShortRef = useRef(null)
  const marksEssayRef = useRef(null)

  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }))
  const showErr = (key, error) => (touched[key] || configSubmitAttempted ? error : null)
  const patch = (key, val) => onChange((c) => ({ ...c, [key]: val }))

  const mcqN = validation.mcqCount.value ?? 0
  const shortN = validation.shortCount.value ?? 0
  const essayN = validation.essayCount.value ?? 0

  const handleCountChange = (countKey, marksKey, raw) => {
    onChange((c) => {
      const nextCfg = { ...c, [countKey]: raw }
      if (getCountValue(raw) === 0) nextCfg[marksKey] = ""
      return nextCfg
    })
  }

  const blurCount = (key, max) => {
    touch(key)
    let v = String(cfg[key] ?? "").trim()
    if (!v) v = "0"
    const n = Number(v)
    if (Number.isFinite(n) && n > max) v = String(max)
    else if (!Number.isFinite(n) || n < 0) v = "0"
    const marksKey = { targetMcq: "marksMcq", targetShort: "marksShort", targetEssay: "marksEssay" }[key]
    onChange((c) => {
      const next = { ...c, [key]: v }
      if (getCountValue(v) === 0) next[marksKey] = ""
      return next
    })
  }

  const titleLen = cfg.title.length
  const titleFilled = validation.title.valid && titleLen >= 3
  const showGlobalError =
    !isBank &&
    validation.globalError &&
    (touched.targetMcq || touched.targetShort || touched.targetEssay)

  return (
    <section className="rounded-2xl border border-[#e7eaf3] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#151d3a]">
        <Cpu className="h-4 w-4 text-[#6562f1]" /> {isBank ? "Exam setup" : "AI configuration"}
      </div>

      {!isBank ? (
        <label className="mt-3 block text-sm">
          <span className="text-[#5d6580]">
            Total marks for this exam
            <RequiredMark />
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 50"
            className={inputStateClass({
              error: Boolean(showErr("targetTotalMarks", validation.target.error)),
              valid: validation.target.valid,
              disabled: false,
            })}
            value={cfg.targetTotalMarks}
            onChange={(e) => patch("targetTotalMarks", digitsOnly(e.target.value))}
            onBlur={() => touch("targetTotalMarks")}
          />
          <FieldError message={showErr("targetTotalMarks", validation.target.error)} />
        </label>
      ) : null}

      <label className="mt-3 block text-sm">
        <span className="text-[#5d6580]">
          Exam title
          <RequiredMark />
        </span>
        <div className="relative">
          <input
            type="text"
            maxLength={80}
            placeholder="e.g. Discrete Math Midterm"
            className={inputStateClass({
              error: Boolean(showErr("title", validation.title.error)),
              valid: titleFilled,
              disabled: false,
            })}
            value={cfg.title}
            onChange={(e) => onChange((c) => ({ ...c, title: sanitizeExamTitleInput(e.target.value) }))}
            onBlur={() => touch("title")}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-[#9aa3c2]">
            {titleLen} / 80
          </span>
        </div>
        <FieldError message={showErr("title", validation.title.error)} />
      </label>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <NumericField
          label="Duration (min)"
          required
          value={cfg.durationMinutes}
          placeholder="e.g. 60"
          error={showErr("durationMinutes", validation.duration.error)}
          valid={validation.duration.valid}
          onChange={(v) => patch("durationMinutes", v)}
          onBlur={() => touch("durationMinutes")}
        />
        <label className="text-sm">
          <span className="text-[#5d6580]">
            Difficulty level
            {!isBank ? <RequiredMark /> : null}
          </span>
          <select
            className={inputStateClass({
              error: false,
              valid: Boolean(cfg.difficulty),
              disabled: false,
            })}
            value={cfg.difficulty}
            onChange={(e) => onChange((c) => ({ ...c, difficulty: e.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>

      {showMultiSourceWeightage ? <ConfigWeightageSection {...multiSourceWeightage} /> : null}

      {showExamQuestionFields ? (
        <ExamQuestionFieldsBlock
          cfg={cfg}
          validation={validation}
          showErr={showErr}
          touch={touch}
          patch={patch}
          handleCountChange={handleCountChange}
          blurCount={blurCount}
          mcqN={mcqN}
          shortN={shortN}
          essayN={essayN}
          marksMcqRef={marksMcqRef}
          marksShortRef={marksShortRef}
          marksEssayRef={marksEssayRef}
        />
      ) : null}

      {isBank ? (
        <div className="mt-3 rounded-xl border border-[#e7eaf3] bg-[#fafbff] p-3 text-xs text-[#5d6580]">
          <p className="font-semibold text-[#151d3a]">Selected from bank</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="TOTAL" value={selectedBankSummary.total} />
            <StatPill label="MCQ" value={selectedBankSummary.mcq} />
            <StatPill label="SHORT" value={selectedBankSummary.short} />
            <StatPill label="ESSAY" value={selectedBankSummary.essay} />
          </div>
          <p className="mt-2 font-medium text-[#3e4768]">{selectedBankSummary.marks} marks total</p>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-[#8a93ad]">
        {!isBank && totals.ready && showExamQuestionFields ? (
          <>
            Total: <span className="font-semibold text-[#3e4768]">{totals.totalQuestions} questions</span>
            {" - "}
            <span className="font-semibold text-[#3e4768]">{totals.totalMarks} marks</span>
          </>
        ) : null}
      </p>

      {showGlobalError ? <FieldError message={validation.globalError} /> : null}

      {configSubmitAttempted && validation.blockingErrors?.length > 0 ? (
        <div className="mt-3 space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          {validation.blockingErrors.map((msg) => (
            <p key={msg} className="text-xs text-red-700">
              {msg}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          disabled={generating || !canGenerateExam}
          title={generateDisabledTooltip}
          onClick={onGenerateExam}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] text-sm font-semibold text-white transition hover:bg-[#5a56e2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generating
            ? generateProgressLabel ||
              (isBank ? "Compiling exam..." : "Composing exam...")
            : isBank
              ? "Compile exam from selected"
              : "Generate exam with AI"}
        </button>
      </div>
    </section>
  )
}