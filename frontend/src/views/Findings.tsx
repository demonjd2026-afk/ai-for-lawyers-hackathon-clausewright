import type { Finding } from "../types";

const SEV_LABEL = { blocker: "Must fix", warning: "Should fix", info: "Good to know" } as const;

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
      <div className="row">
        <h2 id="checks-h" style={{ margin: 0 }}>Checks against Indian law</h2>
        <span className="spacer" />
        {fixable > 1 && <button className="btn small" onClick={onFixAll}>Apply {fixable} fixes</button>}
      </div>
      <p className="lede">Every check cites the provision or judgment it comes from. Nothing is drafted while a must-fix item is open.</p>
      <div className="tally" aria-live="polite">
        <span><b>{count("blocker")}</b>must fix</span>
        <span><b>{count("warning")}</b>should fix</span>
        <span><b>{count("info")}</b>good to know</span>
      </div>
      {findings.length === 0 && <p className="notice ok">No issues found.</p>}
      {findings.map((f) => (
        <article key={f.rule_id + (f.field ?? "")} className="finding" data-sev={f.severity}>
          <h4><span className="sev">{SEV_LABEL[f.severity]}</span>{f.title}</h4>
          <p>{f.detail}</p>
          {f.fix && <p><strong>Fix:</strong> {f.fix}</p>}
          <ul className="cites" aria-label="Authorities">
            {f.citations.map((c) => {
              const secondary = c.note?.includes("[secondary source");
              const label = `${c.authority}, ${c.provision}`;
              return (
                <li key={label}>
                  {c.url ? (
                    <a className={secondary ? "secondary" : undefined} href={c.url} target="_blank" rel="noopener noreferrer"
                      title={c.note ?? undefined}>{label}</a>
                  ) : (
                    <span className={secondary ? "secondary" : undefined} title={c.note ?? undefined}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="row">
            {f.autofix && f.severity !== "info" && (
              <button className="btn small" onClick={() => onFix(f)}>Apply fix</button>
            )}
            {f.field && <button className="link" onClick={() => onJump(f.field!)}>Show in terms</button>}
          </div>
        </article>
      ))}
    </section>
  );
}
