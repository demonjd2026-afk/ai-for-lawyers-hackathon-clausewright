// End-to-end eval: term sheet -> API -> real deployment -> full milestone flow -> read back
// -> three-way verification. Also proves a tampered deployment is caught.
//
//   npx hardhat node                      (terminal 1)
//   uvicorn app.main:app --port 8000      (terminal 2, backend/)
//   node scripts/e2e.mjs                  (terminal 3)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createTestClient, createWalletClient, http, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const here = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL ?? "http://127.0.0.1:8000";
const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const art = (n) => JSON.parse(readFileSync(join(here, "..", "..", "backend", "artifacts", `${n}.json`), "utf8"));
const Escrow = art("ClausewrightEscrow");
const Token = art("DemoINR");

// Hardhat's published development keys: only ever valid on a local chain.
const KEYS = {
  deployer: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  payer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  payee: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  arbiter: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};
const acct = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [k, privateKeyToAccount(v)]));
const transport = http(RPC);
const pub = createPublicClient({ chain: hardhat, transport });
const test = createTestClient({ chain: hardhat, mode: "hardhat", transport });
const wallet = (a) => createWalletClient({ account: a, chain: hardhat, transport });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

async function post(path, body) {
  const r = await fetch(API + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
  return j;
}

async function send(who, address, abi, functionName, args = []) {
  const hash = await wallet(acct[who]).writeContract({ address, abi, functionName, args });
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${functionName} reverted`);
  return rc;
}

async function deploy(who, artifact, args) {
  const hash = await wallet(acct[who]).deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args });
  const rc = await pub.waitForTransactionReceipt({ hash });
  return rc.contractAddress;
}

async function readBack(address) {
  const r = (fn, args = []) => pub.readContract({ address, abi: Escrow.abi, functionName: fn, args });
  const n = Number(await r("milestoneCount"));
  const ms = [];
  for (let i = 0; i < n; i++) {
    const m = await r("milestone", [BigInt(i)]);
    ms.push({ amount: m.amount.toString(), dueDate: m.dueDate.toString() });
  }
  return {
    documentHash: await r("documentHash"), termsHash: await r("termsHash"), token: await r("token"),
    payer: await r("payer"), payee: await r("payee"), arbiter: await r("arbiter"),
    acceptanceWindow: (await r("acceptanceWindow")).toString(), fundingDeadline: (await r("fundingDeadline")).toString(),
    msmeMode: await r("msmeMode"), totalAmount: (await r("totalAmount")).toString(), milestones: ms,
  };
}

const toArgs = (c) => [c[0], c[1], c[2], c[3], c[4], c[5], BigInt(c[6]), BigInt(c[7]), c[8],
  c[9].map((m) => ({ amount: BigInt(m.amount), dueDate: BigInt(m.dueDate) }))];

async function main() {
  // Chain clock must sit before the fixture's dates; start from a fresh node.
  const tokenAddr = await deploy("deployer", Token, []);
  check("DemoINR deployed at configured local address", tokenAddr.toLowerCase() === "0x5fbdb2315678afecb367f032d93f642f64180aa3", tokenAddr);

  const ts = JSON.parse(readFileSync(join(here, "..", "..", "backend", "tests", "fixtures", "freelance_msme.json"), "utf8"));
  ts.client.wallet = acct.payer.address;
  ts.provider.wallet = acct.payee.address;
  ts.escrow.arbiter_wallet = acct.arbiter.address;
  ts.escrow.chain = "local";
  const now = Number((await pub.getBlock()).timestamp);
  const day = (n) => new Date((now + n * 86400) * 1000).toISOString().slice(0, 10);
  ts.effective_date = day(0);
  ts.milestones.forEach((m, i) => (m.due_date = day(20 + 30 * i)));

  const draft = await post("/api/draft", { term_sheet: ts });
  check("API drafted and self-verified", draft.verification.ok, `${draft.verification.passed}/${draft.verification.total}`);

  const escrowAddr = await deploy("deployer", Escrow, toArgs(draft.escrow.constructor_args));
  const onchain = await readBack(escrowAddr);
  const v = await post("/api/verify", { term_sheet: ts, onchain });
  check("three-way verification (term sheet, prose, chain)", v.verification.ok, `${v.verification.passed}/${v.verification.total}`);

  // Tampered deployment (before the clock moves): same terms, payee swapped to the deployer.
  const bad = toArgs(draft.escrow.constructor_args);
  bad[2] = acct.deployer.address;
  const badAddr = await deploy("deployer", Escrow, bad);
  const vb = await post("/api/verify", { term_sheet: ts, onchain: await readBack(badAddr) });
  check("tampered deployment rejected", !vb.verification.ok && vb.verification.failed.some((f) => f.id === "chain.payee"),
    vb.verification.failed.map((f) => f.id).join(","));

  // Wrong document: payee refuses a hash that is not the drafted text.
  let refused = false;
  try { await send("payee", badAddr, Escrow.abi, "acknowledge", ["0x" + "11".repeat(32)]); } catch { refused = true; }
  check("acknowledge rejects a different document hash", refused);


  // Full flow: acknowledge -> fund -> deliver -> silence -> deemed acceptance -> withdraw.
  await send("payee", escrowAddr, Escrow.abi, "acknowledge", [draft.document_hash]);
  await send("payer", tokenAddr, Token.abi, "faucet");
  await send("payer", tokenAddr, Token.abi, "approve", [escrowAddr, BigInt(onchain.totalAmount)]);
  await send("payer", escrowAddr, Escrow.abi, "fund", [draft.document_hash]);
  check("funded", await pub.readContract({ address: escrowAddr, abi: Escrow.abi, functionName: "funded" }));

  await send("payee", escrowAddr, Escrow.abi, "submitDelivery", [0n]);
  let early = false;
  try { await send("arbiter", escrowAddr, Escrow.abi, "claimDeemedAcceptance", [0n]); } catch { early = true; }
  check("deemed acceptance refused inside window", early);

  await test.increaseTime({ seconds: Number(onchain.acceptanceWindow) + 1 });
  await test.mine({ blocks: 1 });
  const rc = await send("arbiter", escrowAddr, Escrow.abi, "claimDeemedAcceptance", [0n]);
  const ev = parseEventLogs({ abi: Escrow.abi, logs: rc.logs, eventName: "Accepted" });
  check("deemed acceptance after silence (MSMED s.2(b))", ev.length === 1 && ev[0].args.deemed === true);

  await send("payee", escrowAddr, Escrow.abi, "withdraw");
  const bal = await pub.readContract({ address: tokenAddr, abi: Token.abi, functionName: "balanceOf", args: [acct.payee.address] });
  check("payee received milestone 1 exactly", bal.toString() === onchain.milestones[0].amount, `${bal} paise`);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} end-to-end checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e.shortMessage ?? e.message ?? e); process.exit(1); });
