import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Abi,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";
import { api } from "./api";

export type ChainId = "local" | "sepolia";
export type Role = "payer" | "payee" | "arbiter";

export const CHAINS: Record<ChainId, { chain: Chain; rpc: string; label: string; explorer?: string }> = {
  local: { chain: hardhat, rpc: "http://127.0.0.1:8545", label: "Local test chain" },
  sepolia: {
    chain: sepolia,
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    label: "Sepolia test network",
    explorer: "https://sepolia.etherscan.io",
  },
};

// Hardhat's published development keys. They only hold value on a throwaway local chain,
// which is why this signer mode is offered for `local` and never for a public network.
const DEV_KEYS: Record<Role | "deployer", Hex> = {
  deployer: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  payer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  payee: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  arbiter: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};
export const devAccount = (r: Role | "deployer") => privateKeyToAccount(DEV_KEYS[r]);

let artifacts: Promise<{ escrow: { abi: Abi; bytecode: Hex }; token: { abi: Abi; bytecode: Hex } }> | null = null;
export function loadArtifacts() {
  artifacts ??= Promise.all([api.artifact("ClausewrightEscrow"), api.artifact("DemoINR")]).then(([e, t]) => ({
    escrow: { abi: e.abi as Abi, bytecode: e.bytecode },
    token: { abi: t.abi as Abi, bytecode: t.bytecode },
  }));
  return artifacts;
}

export function publicClient(id: ChainId): PublicClient {
  return createPublicClient({ chain: CHAINS[id].chain, transport: http(CHAINS[id].rpc) }) as PublicClient;
}

declare global {
  interface Window {
    ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<any> };
  }
}

export interface Signer {
  label: string;
  address: Address;
  client: WalletClient;
}

export function devSigner(role: Role | "deployer"): Signer {
  const account = devAccount(role);
  return {
    label: `${role} (local dev key)`,
    address: account.address,
    client: createWalletClient({ account, chain: hardhat, transport: http(CHAINS.local.rpc) }),
  };
}

export async function walletSigner(id: ChainId): Promise<Signer> {
  if (!window.ethereum) throw new Error("No browser wallet found. Install one, or use the local test chain.");
  const [address] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
  const chain = CHAINS[id].chain;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chain.id.toString(16)}` }] });
  } catch {
    throw new Error(`Switch your wallet to ${CHAINS[id].label} and try again.`);
  }
  return {
    label: "browser wallet",
    address,
    client: createWalletClient({ account: address, chain, transport: custom(window.ethereum) }),
  };
}

export async function send(signer: Signer, id: ChainId, address: Address, abi: Abi, fn: string, args: unknown[] = []) {
  const pub = publicClient(id);
  const { request } = await pub.simulateContract({ address, abi, functionName: fn, args, account: signer.client.account! });
  const hash = await signer.client.writeContract(request as any);
  const rc = await pub.waitForTransactionReceipt({ hash });
  if (rc.status !== "success") throw new Error(`${fn} reverted`);
  return rc;
}

export async function deployEscrow(signer: Signer, id: ChainId, args: unknown[]) {
  const { escrow } = await loadArtifacts();
  const a = args as any[];
  const typed = [a[0], a[1], a[2], a[3], a[4], a[5], BigInt(a[6]), BigInt(a[7]), a[8],
    (a[9] as { amount: number; dueDate: number }[]).map((m) => ({ amount: BigInt(m.amount), dueDate: BigInt(m.dueDate) }))];
  const hash = await signer.client.deployContract({
    abi: escrow.abi, bytecode: escrow.bytecode, args: typed, account: signer.client.account!, chain: CHAINS[id].chain,
  });
  const rc = await publicClient(id).waitForTransactionReceipt({ hash });
  if (!rc.contractAddress) throw new Error("deployment failed");
  return { address: rc.contractAddress, tx: hash };
}

/** Deploys the demo token on a fresh local chain if it is not there yet. */
export async function ensureLocalToken(expected: Address) {
  const pub = publicClient("local");
  if ((await pub.getCode({ address: expected }))?.length) return;
  const { token } = await loadArtifacts();
  const s = devSigner("deployer");
  const nonce = await pub.getTransactionCount({ address: s.address });
  if (nonce !== 0) throw new Error("Restart the local chain so the demo token lands at its configured address.");
  const hash = await s.client.deployContract({ abi: token.abi, bytecode: token.bytecode, account: s.client.account!, chain: hardhat });
  await pub.waitForTransactionReceipt({ hash });
}

export interface OnchainState {
  documentHash: Hex; termsHash: Hex; token: Address; payer: Address; payee: Address; arbiter: Address;
  acceptanceWindow: string; fundingDeadline: string; msmeMode: boolean; totalAmount: string;
  milestones: { amount: string; dueDate: string; state: number; deliveredAt: number; payeeBps: number }[];
  funded: boolean; cancelled: boolean; payeeAcknowledged: boolean;
  credits: Record<Role, string>;
}

export async function readEscrow(id: ChainId, address: Address): Promise<OnchainState> {
  const { escrow } = await loadArtifacts();
  const pub = publicClient(id);
  const r = (fn: string, args: unknown[] = []) => pub.readContract({ address, abi: escrow.abi, functionName: fn, args }) as Promise<any>;
  const [documentHash, termsHash, token, payer, payee, arbiter, win, deadline, msme, total, n, funded, cancelled, ack] =
    await Promise.all([
      r("documentHash"), r("termsHash"), r("token"), r("payer"), r("payee"), r("arbiter"), r("acceptanceWindow"),
      r("fundingDeadline"), r("msmeMode"), r("totalAmount"), r("milestoneCount"), r("funded"), r("cancelled"),
      r("payeeAcknowledged"),
    ]);
  const ms = await Promise.all(Array.from({ length: Number(n) }, (_, i) => r("milestone", [BigInt(i)])));
  const [cp, ce, ca] = await Promise.all([r("credits", [payer]), r("credits", [payee]), r("credits", [arbiter])]);
  return {
    documentHash, termsHash, token, payer, payee, arbiter,
    acceptanceWindow: String(win), fundingDeadline: String(deadline), msmeMode: msme, totalAmount: String(total),
    milestones: ms.map((m: any) => ({
      amount: String(m.amount), dueDate: String(m.dueDate), state: Number(m.state),
      deliveredAt: Number(m.deliveredAt), payeeBps: Number(m.payeeBps),
    })),
    funded, cancelled, payeeAcknowledged: ack,
    credits: { payer: String(cp), payee: String(ce), arbiter: String(ca) },
  };
}

export async function chainTime(id: ChainId): Promise<number> {
  return Number((await publicClient(id).getBlock()).timestamp);
}

/** Local chain only: move the clock forward to demonstrate deemed acceptance. */
export async function advanceLocalTime(seconds: number) {
  const body = (method: string, params: unknown[]) =>
    fetch(CHAINS.local.rpc, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  await body("evm_increaseTime", [seconds]);
  await body("evm_mine", []);
}

export const MILESTONE_STATE = ["Awaiting delivery", "Delivered", "Disputed", "Closed"] as const;
