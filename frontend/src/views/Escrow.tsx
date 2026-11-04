import { clsx } from "clsx";
import { Check, Clock, ExternalLink, Loader2, RefreshCw, Rocket, Search, Wallet, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { api } from "../api";
import {
  advanceLocalTime, chainTime, CHAINS, deployEscrow, devAccount, devSigner, ensureLocalToken, loadArtifacts,
  MILESTONE_STATE, publicClient, readEscrow, send, walletSigner, type ChainId, type OnchainState, type Role, type Signer,
} from "../chain";
import { Button } from "../components/ui/Button";
import { Badge, Mono, Notice, PanelHeading, SectionTitle } from "../components/ui/Primitives";
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

const ROLE_LABEL: Record<Role, string> = { payer: "client", payee: "provider", arbiter: "arbiter" };

export interface Deployment { chain: ChainId; address: Address; tx?: string }

/** One row of the escrow timeline: a status dot, a label, a state line and the actions open right now. */
function Stage({ done, active, label, status, actions }: { done: boolean; active?: boolean; label: ReactNode; status: ReactNode; actions?: ReactNode }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="absolute top-6 bottom-0 left-[11px] w-px bg-mist-200 last:hidden" aria-hidden />
      <span className={clsx("relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2",
        done ? "border-teal-500 bg-teal-500 text-white" : active ? "border-saffron-500 bg-white" : "border-mist-300 bg-white")} aria-hidden>
        {done ? <Check className="size-3.5" strokeWidth={3} /> : active ? <span className="size-2 rounded-full bg-saffron-500" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-semibold text-ink-900">{label}</span>
          <span className="text-[0.82rem] text-mist-700">{status}</span>
        </div>
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </li>
  );
}

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
      throw new Error(`Switch your wallet to the ${ROLE_LABEL[r]} account ${shortHash(want, 4)}.`);
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
    run("Depositing the fee", async () => {
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

  // On the local chain the user plays each party in turn; on a public chain the wallet decides.
  const may = (r: Role) => (local ? role === r : true);
  const can = !busy;
  const explorer = deployment && CHAINS[deployment.chain].explorer;

  return (
    <section aria-labelledby="escrow-h" className="space-y-6">
      <PanelHeading id="escrow-h" title="Escrow bound to this contract"
        lede="The escrow is one fixed, tested contract. Only its settings come from your terms, and each setting traces to the clause that governs it. Point at a row to see the clause on the page." />

      <div className="overflow-x-auto rounded-lg border border-mist-200">
        <table className="w-full min-w-[520px] border-collapse text-[0.84rem]">
          <thead className="bg-mist-50 text-left text-[0.72rem] font-semibold text-mist-500">
            <tr><th scope="col" className="px-3 py-2">Setting</th><th scope="col" className="px-3 py-2">Value</th><th scope="col" className="px-3 py-2">Clause</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, v, ids]) => (
              <tr key={k} tabIndex={0} onMouseEnter={() => onHighlight(ids)} onMouseLeave={() => onHighlight([])} onFocus={() => onHighlight(ids)} onBlur={() => onHighlight([])}
                className="border-t border-mist-200 transition-colors hover:bg-saffron-500/8 focus:bg-saffron-500/8 focus:outline-none">
                <td className="px-3 py-2 align-top font-medium text-ink-900 whitespace-nowrap">{PARAM_LABEL[k]}</td>
                <td className="px-3 py-2 align-top text-ink-800">{v.startsWith("0x") ? <Mono title={v}>{v.length > 24 ? shortHash(v, 8) : v}</Mono> : v}</td>
                <td className="px-3 py-2 align-top">
                  <span className="flex flex-wrap gap-1">
                    {ids.map((id) => (
                      <button key={id} type="button" className="rounded-full border border-ink-300/60 px-2 py-0.5 text-[0.72rem] font-medium text-ink-700 hover:bg-ink-500/8"
                        onClick={() => document.getElementById(`clause-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                        {draft.clauses.find((c) => c.id === id)?.heading ?? id}
                      </button>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <SectionTitle aside={<Badge tone="dark">{CHAINS[chainId].label}</Badge>}>Network</SectionTitle>
        {local ? (
          <p className="text-[0.88rem] leading-relaxed text-mist-700">
            The local chain's built-in test accounts stand in for the three parties, so no wallet is needed. Money here is a demo token with no value.
            {!usingDevWallets && <> <Button variant="link" onClick={() => onUseWallets(devWallets)}>Use the test accounts for client, provider and arbiter</Button>.</>}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-[0.88rem] leading-relaxed text-mist-700">
            <span>Connect a browser wallet on Sepolia. Each step must be signed by the account the contract names for it.</span>
            <Button size="sm" variant="ghost" icon={<Wallet className="size-4" />} disabled={!can}
              onClick={() => run("Connecting", async () => setWallet(await walletSigner(chainId)))}>
              {wallet ? `Connected ${shortHash(wallet.address, 4)}` : "Connect wallet"}
            </Button>
          </div>
        )}
      </div>

      {err && <Notice tone="err" role="alert">{err}</Notice>}
      {busy && <Notice tone="info" role="status"><span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{busy}…</span></Notice>}

      {!deployment ? (
        <div className="grid gap-4 rounded-lg border border-mist-200 bg-mist-50/60 p-4 sm:grid-cols-[auto_1fr] sm:items-end">
          <Button size="lg" disabled={!can} onClick={deploy} icon={<Rocket className="size-4.5" />}>Deploy escrow</Button>
          <div className="min-w-0">
            <label htmlFor="escrow-lookup" className="mb-1 block text-[0.78rem] font-semibold text-mist-700">Or check an escrow that is already deployed</label>
            <div className="flex gap-2">
              <input id="escrow-lookup" value={lookup} placeholder="0x… escrow address" onChange={(e) => setLookup(e.target.value.trim())} className="control font-mono text-[0.8rem]" />
              <Button variant="ghost" disabled={!/^0x[0-9a-fA-F]{40}$/.test(lookup) || !can} icon={<Search className="size-4" />}
                onClick={() => onDeployed({ chain: chainId, address: lookup as Address })}>Check</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.84rem]">
            <span className="font-semibold text-ink-900">Escrow address</span>
            {explorer
              ? <a className="inline-flex items-center gap-1 font-mono text-[0.8rem] text-ink-700 underline underline-offset-4" href={`${explorer}/address/${deployment.address}`} target="_blank" rel="noopener noreferrer">{deployment.address}<ExternalLink className="size-3.5" /></a>
              : <Mono>{deployment.address}</Mono>}
          </div>

          {verification && (
            <Notice tone={verification.ok ? "ok" : "err"} role="status">
              {verification.ok
                ? <><strong>Verified.</strong> The deployed escrow, the contract text and your terms agree on all {verification.total} checks.</>
                : <><strong>Mismatch.</strong> {verification.failed.length} of {verification.total} checks failed. Do not fund this escrow.</>}
              {!verification.ok && (
                <ul className="mt-2 space-y-1">
                  {verification.failed.slice(0, 8).map((f) => (
                    <li key={f.id} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0" /><span>{f.where}: expected <Mono>{f.expected}</Mono>, found <Mono>{f.actual}</Mono></span></li>
                  ))}
                </ul>
              )}
            </Notice>
          )}

          {state && verification?.ok && (
            <div>
              <SectionTitle aside={local && (
                <div className="flex gap-1 rounded-lg bg-mist-200/70 p-1" role="radiogroup" aria-label="Act as">
                  {(["payer", "payee", "arbiter"] as Role[]).map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                      className={clsx("rounded-md px-2.5 py-1 text-[0.78rem] font-semibold capitalize transition-colors", role === r ? "bg-white text-ink-900 shadow-sm" : "text-mist-700 hover:text-ink-900")}>
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              )}>Run the contract</SectionTitle>

              <ol className="mt-2">
                <Stage done={state.payeeAcknowledged} active={!state.payeeAcknowledged} label="Provider confirms the fingerprint"
                  status={state.payeeAcknowledged ? "Confirmed on chain" : "Waiting for the provider"}
                  actions={!state.payeeAcknowledged && may("payee") && (
                    <Button size="sm" disabled={!can} onClick={() => act("Confirming the fingerprint", "payee", "acknowledge", [draft.document_hash])}>Confirm as provider</Button>
                  )} />
                <Stage done={state.funded} active={state.payeeAcknowledged && !state.funded} label="Client deposits the fee"
                  status={state.funded ? `${inr(Number(state.totalAmount))} held in escrow` : "Not yet deposited"}
                  actions={!state.funded && state.payeeAcknowledged && may("payer") && (
                    <Button size="sm" disabled={!can} onClick={fund}>Deposit as client</Button>
                  )} />
                {state.milestones.map((m, i) => {
                  const ends = m.deliveredAt + Number(state.acceptanceWindow);
                  const left = Math.max(0, ends - now);
                  const daysLeft = Math.ceil(left / 86400);
                  const status = m.state === 1
                    ? left > 0 ? <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{daysLeft} {daysLeft === 1 ? "day" : "days"} left to object</span> : "Objection window over"
                    : m.state === 3
                      ? m.payeeBps === 10000 ? "Paid to provider" : m.payeeBps === 0 ? "Returned to client" : `Split ${m.payeeBps / 100}% to provider`
                      : MILESTONE_STATE[m.state];
                  return (
                    <Stage key={i} done={m.state === 3} active={state.funded && m.state !== 3} label={<>Milestone {i + 1} · {inr(Number(m.amount))}</>} status={status}
                      actions={<>
                        {state.funded && m.state === 0 && may("payee") &&
                          <Button size="sm" disabled={!can} onClick={() => act("Recording delivery", "payee", "submitDelivery", [BigInt(i)])}>Mark delivered</Button>}
                        {m.state === 1 && left > 0 && may("payer") && <>
                          <Button size="sm" disabled={!can} onClick={() => act("Accepting", "payer", "accept", [BigInt(i)])}>Accept</Button>
                          <Button size="sm" variant="ghost" disabled={!can} onClick={() => act("Raising an objection", "payer", "dispute", [BigInt(i)])}>Object</Button>
                        </>}
                        {m.state === 1 && left === 0 &&
                          <Button size="sm" disabled={!can} onClick={() => act("Releasing the payment", local ? role : "payee", "claimDeemedAcceptance", [BigInt(i)])}>Release as deemed accepted</Button>}
                        {m.state === 2 && may("arbiter") && <>
                          <Button size="sm" disabled={!can} onClick={() => act("Resolving", "arbiter", "resolve", [BigInt(i), 10000])}>Award to provider</Button>
                          <Button size="sm" variant="ghost" disabled={!can} onClick={() => act("Resolving", "arbiter", "resolve", [BigInt(i), 5000])}>Split 50:50</Button>
                        </>}
                        {m.state === 1 && left > 0 && local &&
                          <Button size="sm" variant="ghost" disabled={!can} title="Local chain only" icon={<Clock className="size-4" />}
                            onClick={() => run("Moving the clock", async () => { await advanceLocalTime(left + 1); await refresh(deployment.address); })}>
                            Skip {daysLeft} {daysLeft === 1 ? "day" : "days"} of silence
                          </Button>}
                      </>} />
                  );
                })}
                {(["payee", "payer"] as Role[]).map((r) => Number(state.credits[r]) > 0 && (
                  <Stage key={r} done={false} active label={`${r === "payee" ? "Provider" : "Client"} withdraws`} status={`${inr(Number(state.credits[r]))} ready`}
                    actions={may(r) && <Button size="sm" disabled={!can} onClick={() => act("Withdrawing", r, "withdraw")}>Withdraw as {ROLE_LABEL[r]}</Button>} />
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-mist-200 pt-4">
            <Button size="sm" variant="ghost" disabled={!can} icon={<RefreshCw className="size-4" />} onClick={() => run("Reading the escrow", () => refresh(deployment.address))}>Re-read from chain</Button>
            <Button size="sm" variant="ghost" disabled={!can} onClick={() => { onDeployed(null); onVerified(null); }}>Forget this escrow</Button>
          </div>
        </>
      )}
    </section>
  );
}
