// Copies ABI + bytecode for the two deployable contracts to the backend, which serves them
// to the browser. The output is committed so the API runs without a Solidity toolchain.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const targets = [join(root, "..", "backend", "artifacts")];

for (const name of ["ClausewrightEscrow", "DemoINR"]) {
  const a = JSON.parse(readFileSync(join(root, "artifacts", "contracts", `${name}.sol`, `${name}.json`), "utf8"));
  if (!a.bytecode || a.bytecode === "0x") throw new Error(`${name}: empty bytecode`);
  const out = { contractName: name, abi: a.abi, bytecode: a.bytecode, solc: "0.8.38" };
  for (const dir of targets) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(out));
  }
  console.log(`${name}: ${(a.bytecode.length - 2) / 2} bytes`);
}
