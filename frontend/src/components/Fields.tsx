import { useEffect, useId, useState, type ReactNode } from "react";
import { parseRupees, rupeesInput } from "../util";

type Flag = "blocker" | "warning" | undefined;

export function Text(props: {
  label: string; value: string | null | undefined; onChange: (v: string) => void; flag?: Flag;
  type?: string; hint?: ReactNode; placeholder?: string; required?: boolean; mono?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" data-flag={props.flag} htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id} type={props.type ?? "text"} value={props.value ?? ""} placeholder={props.placeholder}
        required={props.required} onChange={(e) => props.onChange(e.target.value)}
        style={props.mono ? { fontFamily: "var(--mono)", fontSize: "0.85rem" } : undefined}
        aria-invalid={props.flag === "blocker" || undefined}
      />
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

export function Area(props: { label: string; value: string | null | undefined; onChange: (v: string) => void; rows?: number; hint?: ReactNode }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{props.label}</span>
      <textarea id={id} rows={props.rows ?? 4} value={props.value ?? ""} onChange={(e) => props.onChange(e.target.value)} />
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

export function Num(props: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void; flag?: Flag;
  min?: number; max?: number; step?: number; hint?: ReactNode; nullable?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" data-flag={props.flag} htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id} type="number" inputMode="decimal" min={props.min} max={props.max} step={props.step ?? 1}
        value={props.value ?? ""} aria-invalid={props.flag === "blocker" || undefined}
        onChange={(e) => {
          const v = e.target.value;
          props.onChange(v === "" ? (props.nullable ? null : 0) : Number(v));
        }}
      />
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

/** Rupee input that stores integer paise; keeps the user's typing until it parses. */
export function Money(props: { label: string; paise: number | undefined; onChange: (p: number) => void; flag?: Flag; hint?: ReactNode }) {
  const id = useId();
  const [draft, setDraft] = useState(rupeesInput(props.paise));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (parseRupees(draft) !== props.paise) setDraft(rupeesInput(props.paise));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.paise]);
  return (
    <label className="field" data-flag={bad ? "blocker" : props.flag} htmlFor={id}>
      <span>{props.label}</span>
      <input
        id={id} inputMode="decimal" value={draft} aria-invalid={bad || undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const p = parseRupees(e.target.value);
          setBad(p === null);
          if (p !== null) props.onChange(p);
        }}
      />
      {bad ? <small className="hint">Enter rupees, e.g. 1,50,000 or 1,50,000.50</small> : props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

export function Select<T extends string>(props: {
  label: string; value: T | undefined; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; flag?: Flag; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <label className="field" data-flag={props.flag} htmlFor={id}>
      <span>{props.label}</span>
      <select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value as T)} aria-invalid={props.flag === "blocker" || undefined}>
        {props.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  );
}

export function Check(props: { label: ReactNode; checked: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={!!props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}
