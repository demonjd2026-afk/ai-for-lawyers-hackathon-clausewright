import { useEffect, useState } from "react";
import type { Address } from "viem";
import { api } from "../api";
import {
  advanceLocalTime, chainTime, CHAINS, deployEscrow, devAccount, devSigner, ensureLocalToken, loadArtifacts,
  MILESTONE_STATE, publicClient, readEscrow, send, walletSigner, type ChainId, type OnchainState, type Role, type Signer,
} from "../chain";
import type { DraftResult, TermSheet, Verification } from "../types";
import { inr, shortHash } from "../util";

const PARAM_LABEL: Record<string, string> = {
  payer: "Client wallet", payee: "Provider wallet", arbiter: "Arbiter wallet", token: "Settlement token",
  documentHash: "Contract fingerprint", termsHash: "Term sheet fingerprint", acceptanceWindow: "Acceptance window",
  fundingDeadline: "Funding deadline", milestones: "Milestone amounts and due dates", totalAmount: "Total held",
};

// Plain-language versions of the escrow contract's custom errors.
const REVERTS: Record<string, string> = {
  BadDate: "A date in these terms is already in the past on this chain. Move the dates forward (on the local chain, restart it after skipping time).",
  BadWindow: "The acceptance window is outside what the contract allows (at most 15 days for a micro or small supplier).",
  PartiesNotDistinct: "Client, provider and arbiter must be three different wallets.",
  NotAContract: "The settlement token is not deployed on this chain.",
  WrongDocument: "The fingerprint does not match the contract this escrow was deployed for.",
  NotAcknowledged: "The provider has to confirm the fingerprint before the client can deposit.",
  FundingClosed: "The funding deadline has passed. Deploy a new escrow with a later effective date.",
  AlreadyFunded: "This escrow is already funded.",
  NotFunded: "The client has not deposited the fee yet.",
  WindowOpen: "The objection window is still open.",
  WindowClosed: "The objection window has closed; the milestone is now deemed accepted.",
  NotPayer: "Only the client's wallet can do this.",
  NotPayee: "Only the provider's wallet can do this.",
  NotArbiter: "Only the arbiter's wallet can do this.",
  NothingToWithdraw: "There is nothing to withdraw for this wallet.",
  FaucetCooldown: "The demo token faucet can be used once an hour per wallet.",
  ERC20InsufficientBalance: "Not enough demo tokens in the client's wallet.",
};

function explain(e: any): string {
  const raw = `${e?.shortMessage ?? ""} ${e?.message ?? ""} ${e?.cause?.data?.errorName ?? ""}`;
  const hit = Object.keys(REVERTS).find((k) => raw.includes(k));
  return hit ? REVERTS[hit] : e?.shortMessage ?? e?.message ?? String(e);
}

export interface Deployment { chain: ChainId; address: Address; tx?: string }

export function Escrow({ ts, draft, deployment, onDeployed, onVerified, onHighlight, onUseWallets }: {
  ts: TermSheet;
  draft: DraftResult;
  deployment: Deployment | null;
  onDeployed: (d: Deployment | null) => void;
  onVerified: (v: Verification | null) => void;
  onHighlight: (ids: string[]) => void;
  onUseWallets: (w: { client: Address; provider: Address; arbiter: Address }) => void;
}) {
  const chainId = (ts.escrow?.chain ?? "local") as ChainId;
  const p = draft.escrow!.params;
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<OnchainState | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [now, setNow] = useState<number>(0);
  const [role, setRole] = useState<Role>("payer");
  const [wallet, setWallet] = useState<Signer | null>(null);
  const [lookup, setLookup] = useState("");

  const local = chainId === "local";
  const devWallets = { client: devAccount("payer").address, provider: devAccount("payee").address, arbiter: devAccount("arbiter").address };
  const usingDevWallets = local && ts.client.wallet === devWallets.client && ts.provider.wallet === devWallets.provider
    && ts.escrow?.arbiter_wallet === devWallets.arbiter;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setErr(null);
    try {
      await fn();
    } catch (e: any) {
      const msg = explain(e);
      setErr(/fetch|ECONNREFUSED|HTTP request failed/i.test(msg) && local ? "Cannot reach the local chain. Start it with `npm run node` in contracts/." : msg);
    } finally {
      setBusy(null);
    }
  }

  async function refresh(addr: Address, chain: ChainId = chainId) {
    const s = await readEscrow(chain, addr);
    setState(s);
    setNow(await chainTime(chain));
    const v = await api.verify(ts, s);
    setVerification(v.verification);
    onVerified(v.verification);
  }

  useEffect(() => {
    setState(null);
    setVerification(null);
    if (deployment) run("Reading the escrow", () => refresh(deployment.address, deployment.chain));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployment?.address, draft.document_hash]);

  const signer = async (r: Role): Promise<Signer> => {
    if (local) return devSigner(r);
    const w = wallet ?? (await walletSigner(chainId));
    setWallet(w);
    const want = r === "payer" ? p.payer : r === "payee" ? p.payee : p.arbiter;
    if (w.address.toLowerCase() !== want.toLowerCase()) {
      throw new Error(`Switch your wallet to the ${r === "payer" ? "client" : r === "payee" ? "provider" : "arbiter"} account ${shortHash(want, 4)}.`);
    }
    return w;
  };

  const act = (label: string, r: Role, fn: string, args: unknown[] = []) =>
    run(label, async () => {
      const { escrow } = await loadArtifacts();
      await send(await signer(r), chainId, deployment!.address, escrow.abi, fn, args);
      await refresh(deployment!.address);
    });

  const deploy = () =>
    run("Deploying the escrow", async () => {
      if (local) await ensureLocalToken(p.token);
      const s = local ? devSigner("deployer") : (wallet ?? (await walletSigner(chainId)));
      if (!local) setWallet(s);
      const d = await deployEscrow(s, chainId, draft.escrow!.constructor_args);
      onDeployed({ chain: chainId, address: d.address, tx: d.tx });
    });

  const fund = () =>
    run("Funding", async () => {
      const { token, escrow } = await loadArtifacts();
      const s = await signer("payer");
      const bal = (await publicClient(chainId).readContract({
        address: p.token, abi: token.abi, functionName: "balanceOf", args: [s.address],
      })) as bigint;
      if (bal < BigInt(p.total)) await send(s, chainId, p.token, token.abi, "faucet");
      await send(s, chainId, p.token, token.abi, "approve", [deployment!.address, BigInt(p.total)]);
      await send(s, chainId, deployment!.address, escrow.abi, "fund", [draft.document_hash]);
      await refresh(deployment!.address);
    });

  const rows: [string, string, string[]][] = [
    ["payer", p.payer, draft.escrow!.clause_map.payer ?? []],
    ["payee", p.payee, draft.escrow!.clause_map.payee ?? []],
    ["arbiter", p.arbiter, draft.escrow!.clause_map.arbiter ?? []],
    ["acceptanceWindow", `${p.acceptance_window_s / 86400} days (${p.acceptance_window_s} s)`, draft.escrow!.clause_map.acceptanceWindow ?? []],
    ["milestones", p.milestones.map((m) => `${inr(m.amount)} by ${new Date(m.due_date * 1000).toLocaleDateString("en-IN")}`).join("; "),
      draft.escrow!.clause_map.milestones ?? []],
    ["fundingDeadline", new Date(p.funding_deadline * 1000).toLocaleString("en-IN"), draft.escrow!.clause_map.fundingDeadline ?? []],
    ["documentHash", draft.document_hash, draft.escrow!.clause_map.documentHash ?? []],
    ["termsHash", p.terms_hash, draft.escrow!.clause_map.termsHash ?? []],
  ];

  return (
    <section aria-labelledby="escrow-h">
      <h2 id="escrow-h">Escrow bound to this contract</h2>
      <p className="lede">The escrow is a fixed, tested contract. Only its settings come from your terms, and each setting traces to the
        clause that governs it. Select a row to see the clause.</p>

      <table className="map">
        <thead><tr><th scope="col">Setting</th><th scope="col">Value</th><th scope="col">Clause</th></tr></thead>
        <tbody>
          {rows.map(([k, v, ids]) => (
            <tr key={k} onMouseEnter={() => onHighlight(ids)} onMouseLeave={() => onHighlight([])}
              onFocus={() => onHighlight(ids)} tabIndex={0}>
              <td>{PARAM_LABEL[k]}</td>
              <td className={v.startsWith("0x") ? "code" : undefined}>{v}</td>
              <td>{ids.map((id) => (
                <button key={id} className="link" onClick={() => document.getElementById(`clause-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                  {draft.clauses.find((c) => c.id === id)?.heading ?? id}
                </button>
              ))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{CHAINS[chainId].label}</h3>
      {local ? (
        <p className="lede">Uses the local chain's built-in test accounts, so no wallet is needed. Money here is a demo token with no value.
          {!usingDevWallets && <> <button className="link" onClick={() => onUseWallets(devWallets)}>Use the test accounts for client, provider and arbiter</button>.</>}
        </p>
      ) : (
        <p className="lede">Connect a browser wallet on Sepolia. Each step must be signed by the account the contract names for it.
          <> <button className="link" onClick={() => run("Connecting", async () => setWallet(await walletSigner(chainId)))}>
            {wallet ? `Connected ${shortHash(wallet.address, 4)}` : "Connect wallet"}</button></></p>
      )}

      {err && <p className="notice err" role="alert">{err}</p>}
      {busy && <p className="notice info" aria-live="polite">{busy}…</p>}

      {!deployment ? (
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={deploy}>Deploy escrow</button>
          <span className="spacer" />
          <label className="field" style={{ minWidth: "16rem" }}>
            <span>Or check an escrow that is already deployed</span>
            <span className="row">
              <input value={lookup} placeholder="0x… escrow address" onChange={(e) => setLookup(e.target.value.trim())}
                style={{ flex: 1, fontFamily: "var(--mono)", fontSize: "0.8rem", padding: "0.45rem", border: "1px solid var(--rule)", borderRadius: 3 }} />
              <button className="btn small quiet" disabled={!/^0x[0-9a-fA-F]{40}$/.test(lookup) || !!busy}
                onClick={() => onDeployed({ chain: chainId, address: lookup as Address })}>Check</button>
            </span>
          </label>
        </div>
      ) : (
        <>
          <dl className="kv">
            <dt>Escrow address</dt>
            <dd>{CHAINS[deployment.chain].explorer
              ? <a href={`${CHAINS[deployment.chain].explorer}/address/${deployment.address}`} target="_blank" rel="noopener noreferrer">{deployment.address}</a>
              : deployment.address}</dd>
          </dl>

          {verification && (
            <div className={`notice ${verification.ok ? "ok" : "err"}`} role="status">
              {verification.ok
                ? `Verified: the deployed escrow, the contract text and your terms agree on all ${verification.total} checks.`
                : `Mismatch: ${verification.failed.length} of ${verification.total} checks failed. Do not fund this escrow.`}
              {!verification.ok && (
                <ul className="checks">{verification.failed.slice(0, 8).map((f) => (
                  <li key={f.id} data-ok="false">{f.where}: expected {f.expected}, found {f.actual}</li>
                ))}</ul>
              )}
            </div>
          )}

          {state && verification?.ok && (
            <>
              <h3>Run the contract</h3>
              {local && (
                <div className="row" role="radiogroup" aria-label="Act as">
                  {(["payer", "payee", "arbiter"] as Role[]).map((r) => (
                    <button key={r} role="radio" aria-checked={role === r} className={`btn small ${role === r ? "" : "quiet"}`} onClick={() => setRole(r)}>
                      Act as {r === "payer" ? "client" : r === "payee" ? "provider" : "arbiter"}
                    </button>
                  ))}
                </div>
              )}
              <div className="mstate">
                <div>
                  <span>
                    <span className="label">Provider confirmed the fingerprint</span><br />{state.payeeAcknowledged ? "Yes" : "Not yet"}
                  </span>
                  {!state.payeeAcknowledged && (local ? role === "payee" : true) &&
                    <button className="btn small" disabled={!!busy} onClick={() => act("Confirming", "payee", "acknowledge", [draft.document_hash])}>Confirm as provider</button>}
                </div>
                <div>
                  <span><span className="label">Fee deposited</span><br />{state.funded ? `${inr(Number(state.totalAmount))} deposited` : "Not yet"}</span>
                  {!state.funded && state.payeeAcknowledged && (local ? role === "payer" : true) &&
                    <button className="btn small" disabled={!!busy} onClick={fund}>Deposit as client</button>}
                </div>
                {state.milestones.map((m, i) => {
                  const ends = m.deliveredAt + Number(state.acceptanceWindow);
                  const left = Math.max(0, ends - now);
                  return (
                    <div key={i}>
                      <span>
                        <span className="label">Milestone {i + 1}: {inr(Number(m.amount))}</span><br />
                        {MILESTONE_STATE[m.state]}
                        {m.state === 1 && (left > 0 ? `, ${Math.ceil(left / 86400)} days left to object` : ", objection window over")}
                        {m.state === 3 && (m.payeeBps === 10000 ? ", paid to provider" : m.payeeBps === 0 ? ", returned to client" : `, split ${m.payeeBps / 100}% to provider`)}
                      </span>
                      <span className="row">
                        {state.funded && m.state === 0 && (local ? role === "payee" : true) &&
                          <button className="btn small" disabled={!!busy} onClick={() => act("Recording delivery", "payee", "submitDelivery", [BigInt(i)])}>Mark delivered</button>}
                        {m.state === 1 && left > 0 && (local ? role === "payer" : true) && <>
                          <button className="btn small" disabled={!!busy} onClick={() => act("Accepting", "payer", "accept", [BigInt(i)])}>Accept</button>
                          <button className="btn small quiet" disabled={!!busy} onClick={() => act("Raising objection", "payer", "dispute", [BigInt(i)])}>Object</button>
                        </>}
                        {m.state === 1 && left === 0 &&
                          <button className="btn small" disabled={!!busy} onClick={() => act("Releasing", local ? role : "payee", "claimDeemedAcceptance", [BigInt(i)])}>Release as deemed accepted</button>}
                        {m.state === 2 && (local ? role === "arbiter" : true) && <>
                          <button className="btn small" disabled={!!busy} onClick={() => act("Resolving", "arbiter", "resolve", [BigInt(i), 10000])}>Award to provider</button>
                          <button className="btn small quiet" disabled={!!busy} onClick={() => act("Resolving", "arbiter", "resolve", [BigInt(i), 5000])}>Split 50:50</button>
                        </>}
                        {m.state === 1 && left > 0 && local &&
                          <button className="btn small quiet" disabled={!!busy} title="Local chain only"
                            onClick={() => run("Moving the clock", async () => { await advanceLocalTime(left + 1); await refresh(deployment.address); })}>
                            Skip {Math.ceil(left / 86400)} days of silence
                          </button>}
                      </span>
                    </div>
                  );
                })}
                {(["payee", "payer"] as Role[]).map((r) => Number(state.credits[r]) > 0 && (local ? role === r : true) && (
                  <div key={r}>
                    <span><span className="label">Ready to withdraw by {r === "payee" ? "provider" : "client"}</span><br />{inr(Number(state.credits[r]))}</span>
                    <button className="btn small" disabled={!!busy} onClick={() => act("Withdrawing", r, "withdraw")}>Withdraw</button>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="row">
            <button className="btn small quiet" disabled={!!busy} onClick={() => run("Reading the escrow", () => refresh(deployment.address))}>Re-read from chain</button>
            <button className="btn small quiet" disabled={!!busy} onClick={() => { onDeployed(null); onVerified(null); }}>Forget this escrow</button>
          </div>
        </>
      )}
    </section>
  );
}
