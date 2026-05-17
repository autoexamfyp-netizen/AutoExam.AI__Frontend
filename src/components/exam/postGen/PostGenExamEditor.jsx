import { Plus } from "lucide-react"
import { displayExamTitle } from "../../../utils/examTitle"
import PostGenQuestionCard from "./PostGenQuestionCard"
function PostGenSourceSectionHeader({ title, questionCount, marks }) {
  return (
    <div className="border-t border-[#eef1f7] pt-3 first:border-t-0 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa3c2]">{title}</p>
      <p className="mt-0.5 text-xs text-[#7f88a6]">
        {questionCount} question{questionCount === 1 ? "" : "s"} - {marks} marks
      </p>
    </div>
  )
}

export default function PostGenExamEditor({
  exam,
  questions,
  isMultiSource = false,
  multiSource = null,
  displayTitle,
  durationMinutes,
  difficultyLabel,
  configBreakdown,
  inlineEditId,
  inlineEditForm,
  inlineEditSaving,
  onStartInlineEdit,
  onCancelInlineEdit,
  onChangeInlineEdit,
  onSaveInlineEdit,
  onDeleteQuestion,
  onAddQuestion,
}) {
  const headerQuestions = configBreakdown?.totalQuestions ?? questions.length
  const headerMarks = configBreakdown?.totalMarks ?? questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
  const duration = durationMinutes ?? exam.duration_minutes ?? 60
  let globalIndex = 0

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="shrink-0 border-b border-[#eef1f7] p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#151d3a]">{displayExamTitle(displayTitle || exam.title)}</h2>
          <p className="mt-1 text-xs text-[#7f88a6]">
            {headerQuestions} questions - {headerMarks} marks - {duration} min - {difficultyLabel}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {isMultiSource && multiSource
          ? multiSource.groups.map((group) => (
              <div key={group.key} className="space-y-3">
                <PostGenSourceSectionHeader
                  title={group.title.toUpperCase()}
                  questionCount={group.questionCount}
                  marks={group.marks}
                />
                {group.questions.map((q) => {
                  const idx = globalIndex
                  globalIndex += 1
                  return (
                    <PostGenQuestionCard
                      key={q.id}
                      index={idx}
                      question={q}
                      editing={inlineEditId === q.id}
                      form={inlineEditId === q.id ? inlineEditForm : null}
                      saving={inlineEditSaving && inlineEditId === q.id}
                      onEdit={() => onStartInlineEdit(q)}
                      onDelete={() => onDeleteQuestion(q)}
                      onCancelEdit={onCancelInlineEdit}
                      onChangeForm={onChangeInlineEdit}
                      onSaveEdit={onSaveInlineEdit}
                    />
                  )
                })}
              </div>
            ))
          : questions.map((q, idx) => (
              <PostGenQuestionCard
                key={q.id}
                index={idx}
                question={q}
                editing={inlineEditId === q.id}
                form={inlineEditId === q.id ? inlineEditForm : null}
                saving={inlineEditSaving && inlineEditId === q.id}
                onEdit={() => onStartInlineEdit(q)}
                onDelete={() => onDeleteQuestion(q)}
                onCancelEdit={onCancelInlineEdit}
                onChangeForm={onChangeInlineEdit}
                onSaveEdit={onSaveInlineEdit}
              />
            ))}
        <button
          type="button"
          onClick={onAddQuestion}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c4f5] bg-[#fafbff] text-xs font-semibold text-[#5f4ce6] transition hover:bg-[#f1efff]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a question manually
        </button>
      </div>
    </div>
  )
}

