import { FileText } from "lucide-react"

export default function SavedContentPreview({ material, questionCount }) {
  if (!material) {
    return (
      <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[#dbe0ee] bg-white p-8 text-center text-sm text-[#7d86a5]">
        <div>
          <FileText className="mx-auto h-7 w-7 text-[#bcc2d8]" />
          <p className="mt-2 font-medium">Select a note to preview its content</p>
          <p className="mt-1 text-xs text-[#8a93ad]">
            Choose any saved course note from the left to review it before generating your exam.
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e7eaf3] bg-white shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-[#eef1f7] p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[#151d3a]">{material.title || "Untitled"}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#7f88a6]">
            {material.category?.title ? (
              <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 font-medium text-[#5d6580]">
                {material.category.title}
              </span>
            ) : null}
            {questionCount > 0 ? (
              <span className="rounded-full bg-[#e9f8f0] px-2 py-0.5 font-medium text-[#1f9d67]">
                {questionCount} questions in bank
              </span>
            ) : null}
            <span>{(material.content || "").length.toLocaleString()} chars</span>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-[#1a2341] whitespace-pre-wrap">
        {material.content || "(empty)"}
      </div>
    </article>
  )
}
