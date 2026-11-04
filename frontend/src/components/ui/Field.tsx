import { clsx } from "clsx";
import { useEffect, useId, useState, type ReactNode } from "react";
import { parseRupees, rupeesInput } from "../../util";

export type Flag = "blocker" | "warning" | undefined;

function Wrap({ id, label, hint, flag, children, className }: {
  id: string; label: ReactNode; hint?: ReactNode; flag?: Flag; children: ReactNode; className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="flex items-center gap-2 text-[0.78rem] font-semibold text-mist-700">
        {label}
        {flag === "blocker" && <span className="size-1.5 rounded-full bg-vermilion-500" aria-label="Must fix" />}
        {flag === "warning" && <span className="size-1.5 rounded-full bg-saffron-500" aria-label="Should fix" />}
      </label>
      {children}
      {hint && <p className="text-[0.74rem] leading-snug text-mist-500">{hint}</p>}
    </div>
  );
}

const flagClass = (flag: Flag) => (flag === "warning" ? "border-saffron-500/70" : undefined);

export function Text(props: {
  label: string; value: string | null | undefined; onChange: (v: string) => void; flag?: Flag;
  type?: string; hint?: ReactNode; placeholder?: string; required?: boolean; mono?: boolean; className?: string;
}) {
  const id = useId();
  return (
    <Wrap id={id} label={props.label} hint={props.hint} flag={props.flag} className={props.className}>
      <input
        id={id} type={props.type ?? "text"} value={props.value ?? ""} placeholder={props.placeholder} required={props.required}
        onChange={(e) => props.onChange(e.target.value)}
        className={clsx("control", flagClass(props.flag), props.mono && "font-mono text-[0.8rem]")}
        aria-invalid={props.flag === "blocker" || undefined}
      />
    </Wrap>
  );
}

export function Area(props: { label: string; value: string | null | undefined; onChange: (v: string) => void; rows?: number; hint?: ReactNode; placeholder?: string; className?: string }) {
  const id = useId();
  return (
    <Wrap id={id} label={props.label} hint={props.hint} className={props.className}>
      <textarea id={id} rows={props.rows ?? 4} value={props.value ?? ""} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)}
        className="control resize-y leading-relaxed" />
    </Wrap>
  );
}

export function Num(props: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void; flag?: Flag;
  min?: number; max?: number; step?: number; hint?: ReactNode; nullable?: boolean; suffix?: string; className?: string;
}) {
  const id = useId();
  return (
    <Wrap id={id} label={props.label} hint={props.hint} flag={props.flag} className={props.className}>
      <div className="relative">
        <input
          id={id} type="number" inputMode="decimal" min={props.min} max={props.max} step={props.step ?? 1}
          value={props.value ?? ""} aria-invalid={props.flag === "blocker" || undefined}
          className={clsx("control", flagClass(props.flag), props.suffix && "pr-14")}
          onChange={(e) => { const v = e.target.value; props.onChange(v === "" ? (props.nullable ? null : 0) : Number(v)); }}
        />
        {props.suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.75rem] text-mist-500">{props.suffix}</span>}
      </div>
    </Wrap>
  );
}

/** Rupee input that stores integer paise; keeps the user's typing until it parses. */
export function Money(props: { label: string; paise: number | undefined; onChange: (p: number) => void; flag?: Flag; hint?: ReactNode; className?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(rupeesInput(props.paise));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (parseRupees(draft) !== props.paise) setDraft(rupeesInput(props.paise));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.paise]);
  return (
    <Wrap id={id} label={props.label} flag={bad ? "blocker" : props.flag} className={props.className}
      hint={bad ? "Enter rupees, e.g. 1,50,000 or 1,50,000.50" : props.hint}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-mist-500">₹</span>
        <input id={id} inputMode="decimal" value={draft} aria-invalid={bad || undefined}
          className={clsx("control pl-7 tabular-nums", flagClass(props.flag))}
          onChange={(e) => {
            setDraft(e.target.value);
            const p = parseRupees(e.target.value);
            setBad(p === null);
            if (p !== null) props.onChange(p);
          }} />
      </div>
    </Wrap>
  );
}

export function Select<T extends string>(props: {
  label: string; value: T | undefined; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; flag?: Flag; hint?: ReactNode; className?: string;
}) {
  const id = useId();
  return (
    <Wrap id={id} label={props.label} hint={props.hint} flag={props.flag} className={props.className}>
      <select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value as T)} aria-invalid={props.flag === "blocker" || undefined}
        className={clsx("control", flagClass(props.flag))}>
        {props.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Wrap>
  );
}

export function Check(props: { label: ReactNode; checked: boolean | undefined; onChange: (v: boolean) => void; hint?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={clsx("flex cursor-pointer items-start gap-3 rounded-md border border-mist-200 bg-white px-3 py-2.5 transition-colors hover:border-mist-300 has-checked:border-teal-500/50 has-checked:bg-teal-500/5", props.className)}>
      <input id={id} type="checkbox" checked={!!props.checked} onChange={(e) => props.onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-teal-600" />
      <span className="text-[0.86rem] leading-snug text-ink-900">
        {props.label}
        {props.hint && <span className="mt-0.5 block text-[0.74rem] text-mist-500">{props.hint}</span>}
      </span>
    </label>
  );
}
