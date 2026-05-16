import { Loader2, X } from "lucide-react"
import { validateMcqFields } from "../../utils/mcqOptions"

export function emptyManualQuestionForm(categoryId = "") {
  return {
    prompt: "",
    model_answer: "",
    question_type: "mcq",
    difficulty: "medium",
    marks: 2,
    topic: "",
    category_id: categoryId,
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctLetter: "A",
  }
}

export default function ManualQuestionModal({
  open,
  isEdit,
  form,
  categories,
  saving,
  onChange,
  onSubmit,
  onClose,
  title,
  subtitle,
  submitLabel,
}) {
  if (!open || !form) return null

  const isMcq = form.question_type === "mcq"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={saving ? undefined : onClose}
        className="fixed inset-0 bg-[#0f1730]/40 backdrop-blur-[2px]"
      />
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-q-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-[0_20px_60px_rgba(15,23,48,0.15)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-5">
          <div>
            <h2 id="manual-q-title" className="text-lg font-semibold text-[#151d3a]">
              {title || (isEdit ? "Edit question" : "Add question manually")}
            </h2>
            {subtitle ? <p className="mt-1 text-xs text-[#7f88a6]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            className="rounded-lg p-2 text-[#596286] hover:bg-[#f6f7fc]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="text-[#5d6580]">Type</span>
              {isEdit ? (
                <div
                  className="mt-1 flex h-11 items-center rounded-xl border border-[#e3e6ef] bg-[#f6f7fc] px-3 text-sm font-medium capitalize text-[#313a58]"
                  title="Question type cannot be changed after creation"
                >
                  {form.question_type === "mcq"
                    ? "MCQ"
                    : form.question_type === "essay"
                      ? "Essay"
                      : "Short"}
                </div>
              ) : (
                <select
                  value={form.question_type}
                  onChange={(e) => onChange((f) => ({ ...f, question_type: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
                >
                  <option value="mcq">MCQ</option>
                  <option value="short">Short</option>
                  <option value="essay">Essay</option>
                </select>
              )}
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(e) => onChange((f) => ({ ...f, difficulty: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Marks</span>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => onChange((f) => ({ ...f, marks: Number(e.target.value) }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              />
            </label>
            <label className="text-sm">
              <span className="text-[#5d6580]">Subject</span>
              <select
                value={form.category_id}
                onChange={(e) => onChange((f) => ({ ...f, category_id: e.target.value }))}
                className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-[#5d6580]">Topic</span>
            <input
              value={form.topic}
              onChange={(e) => onChange((f) => ({ ...f, topic: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] px-3 text-sm outline-none focus:border-[#6562f1]"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="text-[#5d6580]">
              Question text <span className="text-red-500">*</span>
            </span>
            <textarea
              rows={4}
              value={form.prompt}
              onChange={(e) => onChange((f) => ({ ...f, prompt: e.target.value }))}
              className="mt-1 w-full resize-y rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
              required
            />
          </label>

          {isMcq ? (
            <div className="space-y-3 rounded-xl border border-[#eef1f7] bg-[#fafbff] p-4">
              <p className="text-xs font-semibold text-[#151d3a]">Four answer options</p>
              {["A", "B", "C", "D"].map((letter) => (
                <label key={letter} className="block text-sm">
                  <span className="text-[#5d6580]">
                    Option {letter} <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={form[`option${letter}`]}
                    onChange={(e) => onChange((f) => ({ ...f, [`option${letter}`]: e.target.value }))}
                    className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
                    placeholder={`Answer choice ${letter}`}
                  />
                </label>
              ))}
              <label className="block text-sm">
                <span className="text-[#5d6580]">
                  Correct answer <span className="text-red-500">*</span>
                </span>
                <select
                  value={form.correctLetter}
                  onChange={(e) => onChange((f) => ({ ...f, correctLetter: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-3 text-sm outline-none focus:border-[#6562f1]"
                >
                  {["A", "B", "C", "D"].map((l) => (
                    <option key={l} value={l}>
                      {l} — {form[`option${l}`]?.trim() ? form[`option${l}`].trim().slice(0, 60) : "(empty)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="block text-sm">
              <span className="text-[#5d6580]">Model answer</span>
              <textarea
                rows={3}
                value={form.model_answer}
                onChange={(e) => onChange((f) => ({ ...f, model_answer: e.target.value }))}
                className="mt-1 w-full resize-y rounded-xl border border-[#e3e6ef] px-3 py-2 text-sm outline-none focus:border-[#6562f1]"
                placeholder="Expected answer or marking guide"
              />
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#eef1f7] p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-[#e3e6ef] bg-white px-4 text-sm font-semibold text-[#313a58] disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.prompt.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6562f1] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : submitLabel || (isEdit ? "Save changes" : "Add question")}
          </button>
        </div>
      </form>
    </div>
  )
}

export function buildQuestionPayloadFromManualForm(form) {
  if (form.question_type === "mcq") {
    const mcq = validateMcqFields(form)
    if (!mcq.valid) throw new Error(mcq.error)
    return {
      prompt: form.prompt.trim(),
      model_answer: mcq.model_answer,
      question_type: "mcq",
      difficulty: form.difficulty,
      marks: Number(form.marks) || 1,
      topic: form.topic.trim() || null,
      category_id: form.category_id || null,
      options: mcq.options,
    }
  }
  return {
    prompt: form.prompt.trim(),
    model_answer: form.model_answer.trim() || null,
    question_type: form.question_type,
    difficulty: form.difficulty,
    marks: Number(form.marks) || 1,
    topic: form.topic.trim() || null,
    category_id: form.category_id || null,
    options: null,
  }
}
