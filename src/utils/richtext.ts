function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isHtmlContent(content: string): boolean {
  return content.trimStart().startsWith("<");
}

/** Convert legacy plain-text note content to HTML (paragraphs + bullet lists). */
export function plainToHtml(text: string): string {
  if (!text.trim()) return "<p></p>";
  const lines = text.split("\n");
  const out: string[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length) {
      out.push(`<ul>${bullets.map((b) => `<li><p>${b}</p></li>`).join("")}</ul>`);
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = /^[-•*]\s+(.*)/.exec(line);
    if (bullet) {
      bullets.push(escapeHtml(bullet[1]));
    } else {
      flushBullets();
      if (line) out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  flushBullets();
  return out.join("") || "<p></p>";
}

/** Flatten note HTML into plain text for card previews and search. */
export function htmlToPreview(content: string): string {
  if (!content) return "";
  if (!isHtmlContent(content)) return content;
  const doc = new DOMParser().parseFromString(content, "text/html");
  const parts: string[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        for (const li of Array.from(child.querySelectorAll(":scope > li"))) {
          const t = li.textContent?.trim();
          if (t) parts.push(`- ${t}`);
        }
      } else if (tag === "blockquote") {
        walk(child);
      } else {
        const t = child.textContent?.trim();
        if (t) parts.push(t);
      }
    }
  };
  walk(doc.body);
  return parts.join("\n");
}
