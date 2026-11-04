import { shortHash } from "../util";

export type SealState = "open" | "drafted" | "sealed";

const RING: Record<SealState, string> = {
  open: "Not yet drafted",
  drafted: "Document fingerprint",
  sealed: "Bound to escrow on chain",
};

/** The document's SHA-256, pressed as a seal. It fills only when the chain read-back
 *  matches the term sheet and the text. */
export function Seal({ hash, state, detail }: { hash?: string; state: SealState; detail: string }) {
  const short = hash ? hash.slice(2, 8) : "······";
  return (
    <div className="sealbar" role="group" aria-label="Document fingerprint">
      <div className="seal" data-state={state} aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <defs>
            <path id="seal-arc" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
          </defs>
          <circle className="ring" cx="50" cy="50" r="47" strokeWidth="2" />
          <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeOpacity="0.25" />
          <text fontSize="8.5" letterSpacing="1.2" fontFamily="var(--sans)">
            <textPath href="#seal-arc" startOffset="0">{`${RING[state]} ✦ SHA-256 ✦`}</textPath>
          </text>
          <text x="50" y="55" textAnchor="middle" fontSize="13" fontFamily="var(--mono)">{short}</text>
        </svg>
      </div>
      <div>
        <div className="fp" title={hash}>{hash ? shortHash(hash, 14) : "No fingerprint yet"}</div>
        <p>{detail}</p>
      </div>
    </div>
  );
}
