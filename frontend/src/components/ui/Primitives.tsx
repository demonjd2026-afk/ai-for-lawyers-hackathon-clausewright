import * as RTooltip from "@radix-ui/react-tooltip";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

/** White work panel. Headings and forms live here; the contract lives on paper. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={clsx("rounded-xl border border-mist-200 bg-white p-5 shadow-panel sm:p-6", className)} />;
}

export function PanelHeading({ title, lede, aside, id }: { title: ReactNode; lede?: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 max-w-prose">
        <h2 id={id} className="font-serif text-[1.45rem] leading-tight font-semibold tracking-tight text-ink-900">{title}</h2>
        {lede && <p className="mt-1.5 text-[0.9rem] leading-relaxed text-mist-700">{lede}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center gap-3 first:mt-0">
      <h3 className="text-[0.95rem] font-bold text-ink-900">{children}</h3>
      <span className="h-px flex-1 bg-mist-200" aria-hidden />
      {aside}
    </div>
  );
}

type Tone = "ok" | "warn" | "err" | "info";
const NOTICE: Record<Tone, { cls: string; Icon: typeof Info }> = {
  ok: { cls: "border-teal-500/40 bg-teal-500/8 text-teal-900", Icon: CheckCircle2 },
  warn: { cls: "border-saffron-500/50 bg-saffron-500/10 text-saffron-900", Icon: AlertTriangle },
  err: { cls: "border-vermilion-500/40 bg-vermilion-500/8 text-vermilion-900", Icon: XCircle },
  info: { cls: "border-ink-300/50 bg-ink-500/6 text-ink-800", Icon: Info },
};

export function Notice({ tone, children, className, ...rest }: HTMLAttributes<HTMLDivElement> & { tone: Tone }) {
  const { cls, Icon } = NOTICE[tone];
  return (
    <div {...rest} className={clsx("flex gap-2.5 rounded-md border px-3.5 py-3 text-[0.86rem] leading-relaxed", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const BADGE: Record<string, string> = {
  blocker: "bg-vermilion-500 text-white",
  warning: "bg-saffron-500 text-ink-950",
  info: "bg-ink-500/12 text-ink-700",
  ok: "bg-teal-500/15 text-teal-600",
  high: "bg-vermilion-500 text-white",
  medium: "bg-saffron-500 text-ink-950",
  low: "bg-ink-500/12 text-ink-700",
  neutral: "bg-mist-200 text-mist-700",
  dark: "bg-ink-900 text-white",
};

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold leading-4 whitespace-nowrap", BADGE[tone], className)}>{children}</span>;
}

export function Stat({ label, value, tone, className }: { label: ReactNode; value: ReactNode; tone?: "ok" | "warn" | "err"; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-mist-200 bg-mist-50 px-4 py-3", className)}>
      <div className="text-[0.74rem] font-semibold text-mist-500">{label}</div>
      <div className={clsx("mt-0.5 font-serif text-[1.45rem] leading-none font-semibold tabular-nums",
        tone === "ok" ? "text-teal-600" : tone === "warn" ? "text-saffron-600" : tone === "err" ? "text-vermilion-600" : "text-ink-900")}>{value}</div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-mist-300 px-6 py-10 text-center">
      {icon && <div className="text-ink-300">{icon}</div>}
      <p className="font-semibold text-ink-900">{title}</p>
      {children && <p className="max-w-sm text-[0.86rem] leading-relaxed text-mist-700">{children}</p>}
    </div>
  );
}

export function Tip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RTooltip.Root delayDuration={250}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content sideOffset={6}
          className="z-50 max-w-xs rounded-md bg-ink-900 px-3 py-2 text-[0.78rem] leading-snug text-white shadow-lg animate-fade-in">
          {content}
          <RTooltip.Arrow className="fill-ink-900" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export function Mono({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return <code title={title} className={clsx("rounded bg-ink-500/8 px-1.5 py-0.5 font-mono text-[0.76rem] text-ink-800 break-all", className)}>{children}</code>;
}

export function Authority({ c }: { c: { authority: string; provision: string; url?: string | null; note?: string | null } }) {
  const secondary = c.note?.includes("[secondary source");
  const label = `${c.authority}, ${c.provision}`;
  const cls = clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.72rem] font-medium leading-4 transition-colors",
    secondary ? "border-dashed border-mist-300 text-mist-700" : "border-ink-300/60 text-ink-700 hover:bg-ink-500/8");
  return c.url
    ? <a className={cls} href={c.url} target="_blank" rel="noopener noreferrer" title={c.note ?? undefined}>{label}</a>
    : <span className={cls} title={c.note ?? undefined}>{label}</span>;
}
