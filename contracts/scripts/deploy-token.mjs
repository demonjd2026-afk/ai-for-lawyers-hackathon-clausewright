// Deploys the no-value DemoINR token to Sepolia once. Then set the backend's
// CW_DEMO_TOKEN_ADDRESS='{"sepolia":"<address>","local":"0x5FbDB2315678afecb367f032d93F642f64180aa3"}'.
//
//   SEPOLIA_RPC_URL=https://... DEPLOYER_KEY=0x... node scripts/deploy-token.mjs
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const rpc = process.env.SEPOLIA_RPC_URL;
const key = process.env.DEPLOYER_KEY;
if (!rpc || !key) throw new Error("set SEPOLIA_RPC_URL and DEPLOYER_KEY (a throwaway testnet key)");

const art = JSON.parse(readFileSync(new URL("../../backend/artifacts/DemoINR.json", import.meta.url), "utf8"));
const account = privateKeyToAccount(key);
const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
const pub = createPublicClient({ chain: sepolia, transport: http(rpc) });

const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode });
console.log("tx", hash);
const rc = await pub.waitForTransactionReceipt({ hash });
console.log("DemoINR deployed at", rc.contractAddress);
