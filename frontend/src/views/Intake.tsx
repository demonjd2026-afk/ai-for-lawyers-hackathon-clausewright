import { ArrowRight, History, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { examples } from "../examples";
import { Button } from "../components/ui/Button";
import { Notice, PanelHeading, SectionTitle } from "../components/ui/Primitives";
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
      <PanelHeading id="describe-h" title="Describe the deal"
        lede={llm
          ? "Write it the way you would explain it to a friend, in English or Hinglish: who is paying whom, for what, how much, and by when. Every value is checked against your own words before it is used."
          : "Start from a worked example and change the terms, or continue where you left off. Plain-language intake needs an AI key on the server."} />

      {llm && (
        <div className="mb-6">
          {messages.length > 0 && (
            <ol className="mb-3 space-y-2" aria-label="Your messages">
              {messages.map((m, i) => <li key={i} className="rounded-lg rounded-tl-sm bg-mist-100 px-3.5 py-2.5 text-[0.88rem] leading-relaxed text-ink-900">{m}</li>)}
            </ol>
          )}
          {questions.length > 0 && (
            <Notice tone="info" role="status" className="mb-3">
              <strong>A few things are missing</strong>
              <ul className="mt-1 list-disc pl-4">{questions.slice(0, 6).map((q) => <li key={q.field}>{q.question}</li>)}</ul>
            </Notice>
          )}
          <label className="sr-only" htmlFor="deal">Deal description</label>
          <textarea id="deal" rows={6} value={text} onChange={(e) => setText(e.target.value)} className="control leading-relaxed"
            placeholder="I run Pixelnest Studio in Vizag, a micro enterprise. Kaveri Organics in Bengaluru wants a website: design for 1.5 lakh by 1 December, build for 3.5 lakh by mid-January…" />
          {err && <Notice tone="err" role="alert" className="mt-3">{err}</Notice>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button loading={busy} disabled={!text.trim()} onClick={submit} icon={<Sparkles className="size-4" />}>
              {messages.length ? "Answer" : "Draft from this"}
            </Button>
            {partial != null && (
              <Button variant="ghost" onClick={() => {
                const kind = (partial as { agreement_type?: string }).agreement_type;
                const base = (examples().find((e) => e.id === kind) ?? examples()[0]).ts;
                onTermSheet({ ...base, ...(partial as object) } as TermSheet, "terms");
              }}>Fill the rest in the form</Button>
            )}
          </div>
          <SectionTitle>Or start from an example</SectionTitle>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {examples().map((e) => (
          <button key={e.id} onClick={() => onTermSheet(e.ts, e.id === "service" ? "checks" : "terms")}
            className="group flex flex-col rounded-lg border border-mist-200 bg-white p-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-saffron-500/60 hover:shadow-glow">
            <span className="flex items-center justify-between gap-2 font-bold text-ink-900">{e.label}<ArrowRight className="size-4 text-mist-300 group-hover:text-saffron-600" /></span>
            <span className="mt-1 text-[0.84rem] leading-snug text-mist-700">{e.summary}</span>
          </button>
        ))}
        {current && (
          <button onClick={() => onTermSheet(current, "terms")}
            className="group flex flex-col rounded-lg border border-dashed border-ink-300 bg-mist-50 p-4 text-left transition-colors hover:border-ink-600">
            <span className="flex items-center gap-2 font-bold text-ink-900"><History className="size-4 text-ink-500" />Continue: {current.client.name} and {current.provider.name}</span>
            <span className="mt-1 text-[0.84rem] leading-snug text-mist-700">Your last terms, saved in this browser.</span>
          </button>
        )}
      </div>
    </section>
  );
}
