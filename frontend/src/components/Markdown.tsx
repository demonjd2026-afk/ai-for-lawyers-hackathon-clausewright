import { Fragment, type ReactNode } from "react";

/** Renders the small markdown subset the server emits: bold spans, pipe tables, paragraphs,
 *  and (in full documents) # and ## headings. Text is rendered as React text, never as HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Body({ body }: { body: string }) {
  const blocks: ReactNode[] = [];
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].startsWith("|---")) rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      const [head, ...rest] = rows;
      blocks.push(
        <div key={`t${i}`} className="overflow-x-auto">
          <table className="doc-table">
            <thead><tr>{head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead>
            <tbody>{rest.map((r, k) => (
              <tr key={k}>{r.map((c, j) => <td key={j} className={/^0x[0-9a-fA-F]{20,}/.test(c) ? "code" : undefined}>{inline(c)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("|")) para.push(lines[i++]);
    if (para.length) blocks.push(<p key={`p${i}`}>{inline(para.join("\n"))}</p>);
    else i++;
  }
  return <>{blocks}</>;
}

/** A whole markdown document (notice, certificate) on paper. */
export function Markdown({ text }: { text: string }) {
  const parts = text.split(/^(#{1,2} .+)$/m);
  return (
    <div className="paper px-6 py-7 sm:px-8">
      {parts.map((p, i) => {
        if (p.startsWith("# ")) return <h1 key={i}>{p.slice(2)}</h1>;
        if (p.startsWith("## ")) return <h3 key={i} className="mt-5 mb-1 font-serif text-[1.05rem] font-semibold">{p.slice(3)}</h3>;
        return p.trim() ? <div key={i} className="clause"><Body body={p.trim()} /></div> : null;
      })}
    </div>
  );
}
