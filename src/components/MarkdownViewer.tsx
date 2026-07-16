import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { gfm: true, breaks: true, async: false });
  return DOMPurify.sanitize(html);
}

/** Strip markdown syntax for card previews / search. */
export function markdownToPreview(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*+\s]+/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function MarkdownViewer({
  markdown,
  mode,
  readOnly,
  onChange,
}: {
  markdown: string;
  mode: "preview" | "raw";
  readOnly: boolean;
  onChange: (markdown: string) => void;
}) {
  const html = useMemo(() => (mode === "preview" ? renderMarkdown(markdown) : ""), [markdown, mode]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea with its content so the paper sheet stretches naturally.
  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${ta.scrollHeight}px`;
  };
  useEffect(autosize, [mode, markdown]);

  if (mode === "preview") {
    return <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <textarea
      ref={taRef}
      defaultValue={markdown}
      readOnly={readOnly}
      spellCheck={false}
      onChange={(e) => {
        onChange(e.target.value);
        autosize();
      }}
      className="block w-full resize-none overflow-hidden bg-transparent font-mono text-[13px] leading-[1.65] text-slate-700 outline-none placeholder:text-slate-300"
      placeholder="Write markdown…"
    />
  );
}
