import { clsx } from "clsx";
import { CheckCheck, CircleAlert, Info, ShieldCheck, Wand2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Authority, Badge, Empty, PanelHeading } from "../components/ui/Primitives";
import type { Finding } from "../types";

const SEV = {
  blocker: { label: "Must fix", tone: "blocker" as const, Icon: CircleAlert, bar: "bg-vermilion-500" },
  warning: { label: "Should fix", tone: "warning" as const, Icon: CircleAlert, bar: "bg-saffron-500" },
  info: { label: "Good to know", tone: "info" as const, Icon: Info, bar: "bg-ink-300" },
};

export function Findings({ findings, onFix, onFixAll, onJump }: {
  findings: Finding[];
  onFix: (f: Finding) => void;
  onFixAll: () => void;
  onJump: (field: string) => void;
}) {
  const count = (s: Finding["severity"]) => findings.filter((f) => f.severity === s).length;
  const fixable = findings.filter((f) => f.autofix && f.severity !== "info").length;
  return (
    <section aria-labelledby="checks-h">
      <PanelHeading id="checks-h" title="Checks against Indian law"
        lede="Every check cites the provision or judgment it comes from. Nothing is drafted while a must-fix item is open."
        aside={fixable > 1 && <Button size="sm" icon={<Wand2 className="size-4" />} onClick={onFixAll}>Apply {fixable} fixes</Button>} />

      <div className="mb-5 grid grid-cols-3 gap-2" aria-live="polite">
        {(["blocker", "warning", "info"] as const).map((s) => (
          <div key={s} className={clsx("rounded-lg border px-3 py-2.5", count(s) && s === "blocker" ? "border-vermilion-500/40 bg-vermilion-500/6" : "border-mist-200 bg-mist-50")}>
            <div className="font-serif text-[1.5rem] leading-none font-semibold tabular-nums text-ink-900">{count(s)}</div>
            <div className="mt-1 text-[0.74rem] font-semibold text-mist-700">{SEV[s].label.toLowerCase()}</div>
          </div>
        ))}
      </div>

      {findings.length === 0 && <Empty icon={<ShieldCheck className="size-8" />} title="No issues found">The terms pass every rule.</Empty>}

      <ol className="space-y-3">
        {findings.map((f) => {
          const s = SEV[f.severity];
          return (
            <li key={f.rule_id + (f.field ?? "")} className="relative overflow-hidden rounded-lg border border-mist-200 bg-white pl-5 pr-4 py-4">
              <span className={clsx("absolute inset-y-0 left-0 w-1.5", s.bar)} aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={s.tone}>{s.label}</Badge>
                <h4 className="text-[0.95rem] font-bold text-ink-900">{f.title}</h4>
              </div>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-mist-700">{f.detail}</p>
              {f.fix && <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-900"><span className="font-semibold">Fix:</span> {f.fix}</p>}
              {f.citations.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Authorities">
                  {f.citations.map((c) => <li key={c.authority + c.provision}><Authority c={c} /></li>)}
                </ul>
              )}
              {(f.autofix && f.severity !== "info" || f.field) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {f.autofix && f.severity !== "info" && <Button size="sm" icon={<CheckCheck className="size-4" />} onClick={() => onFix(f)}>Apply fix</Button>}
                  {f.field && <Button size="sm" variant="link" onClick={() => onJump(f.field!)}>Show in terms</Button>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
