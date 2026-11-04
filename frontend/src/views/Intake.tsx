import { useState } from "react";
import { api } from "../api";
import { examples } from "../examples";
import type { TermSheet } from "../types";

type Next = "terms" | "checks";

export function Intake({ llm, current, onTermSheet }: {
  llm: boolean;
  current: TermSheet | null;
  onTermSheet: (ts: TermSheet, next: Next) => void;
}) {
  const [messages, setMessages] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<{ field: string; question: string }[]>([]);
  const [partial, setPartial] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    const all = [...messages, text.trim()];
    setBusy(true);
    setErr(null);
    try {
      const r = await api.intake(all, partial);
      setMessages(all);
      setText("");
      setPartial(r.partial);
      setQuestions(r.questions);
      if (r.term_sheet) onTermSheet(r.term_sheet, "checks");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="describe-h">
      <h2 id="describe-h">Describe the deal</h2>
      {llm ? (
        <>
          <p className="lede">Write it the way you would explain it to a friend, in English or Hinglish: who is paying whom, for what, how
            much, and by when. Every value is checked against your own words before it is used.</p>
          {messages.length > 0 && (
            <ol className="checks" aria-label="Your messages">{messages.map((m, i) => <li key={i} data-ok="true">{m}</li>)}</ol>
          )}
          {questions.length > 0 && (
            <div className="notice info" role="status">
              <strong>A few things are missing:</strong>
              <ul>{questions.slice(0, 6).map((q) => <li key={q.field}>{q.question}</li>)}</ul>
            </div>
          )}
          <label className="field">
            <span className="sr-only">Deal description</span>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="I run Pixelnest Studio in Vizag, a micro enterprise. Kaveri Organics in Bengaluru wants a website: design for 1.5 lakh by 1 December, build for 3.5 lakh by mid-January…" />
          </label>
          {err && <p className="notice err" role="alert">{err}</p>}
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <button className="btn" disabled={busy || !text.trim()} onClick={submit}>{busy ? "Reading…" : messages.length ? "Answer" : "Draft from this"}</button>
            {partial != null && (
              <button className="btn quiet" onClick={() => {
                const kind = (partial as { agreement_type?: string }).agreement_type;
                const base = (examples().find((e) => e.id === kind) ?? examples()[0]).ts;
                onTermSheet({ ...base, ...(partial as object) } as TermSheet, "terms");
              }}>Fill the rest in the form</button>
            )}
          </div>
          <h3>Or start from an example</h3>
        </>
      ) : (
        <p className="lede">Start from a worked example and change the terms, or continue where you left off. (Plain-language intake needs
          an AI key on the server.)</p>
      )}
      <div className="examples">
        {examples().map((e) => (
          <button key={e.id} className="example" onClick={() => onTermSheet(e.ts, e.id === "service" ? "checks" : "terms")}>
            <strong>{e.label}</strong>
            <span>{e.summary}</span>
          </button>
        ))}
        {current && (
          <button className="example" onClick={() => onTermSheet(current, "terms")}>
            <strong>Continue: {current.client.name} and {current.provider.name}</strong>
            <span>Your last terms, saved in this browser.</span>
          </button>
        )}
      </div>
    </section>
  );
}
