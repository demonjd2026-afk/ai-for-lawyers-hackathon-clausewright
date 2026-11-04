import { clsx } from "clsx";
import { Download, FileCheck2, FileUp, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { api, download } from "../api";
import { Markdown } from "../components/Markdown";
import { Button } from "../components/ui/Button";
import { Text } from "../components/ui/Field";
import { Empty, Notice, Panel, PanelHeading, SectionTitle } from "../components/ui/Primitives";

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export function Evidence() {
  const fileId = useId();
  const [hash, setHash] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [over, setOver] = useState(false);
  const [title, setTitle] = useState("Service Agreement");
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [escrow, setEscrow] = useState("");
  const [compare, setCompare] = useState("");
  const [cert, setCert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setErr("Choose a file under 20 MB.");
    setErr(null);
    setFileName(f.name);
    setHashing(true);
    try {
      setHash(await sha256Hex(await f.arrayBuffer()));
    } finally {
      setHashing(false);
    }
  }

  async function make() {
    setErr(null);
    setBusy(true);
    try {
      const r = await api.certificate({
        document_title: title, document_hash: hash, certifier_name: name, certifier_role: roleTitle,
        ...(escrow ? { escrow_address: escrow, chain: "Sepolia" } : {}),
      });
      setCert(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const match = compare && hash ? compare.trim().toLowerCase() === hash.toLowerCase() : null;

  return (
    <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel className="self-start">
        <PanelHeading title="Prove a document has not changed"
          lede="Courts admit electronic records with a certificate under section 63 of the Bharatiya Sakshya Adhiniyam, 2023, which must state the record's hash. The hash is computed here in your browser; the file is never uploaded." />

        <label htmlFor={fileId}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
          className={clsx("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            over ? "border-saffron-500 bg-saffron-500/8" : "border-mist-300 bg-mist-50 hover:border-ink-300 hover:bg-mist-100")}>
          <FileUp className="size-7 text-ink-500" aria-hidden />
          <span className="font-semibold text-ink-900">{hashing ? "Computing SHA-256…" : fileName ? fileName : "Drop the document here or choose a file"}</span>
          <span className="text-[0.78rem] text-mist-500">PDF, Word or any file up to 20 MB</span>
          <input id={fileId} type="file" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        <div className="mt-4 space-y-3">
          <Text mono label="SHA-256" value={hash} onChange={(v) => setHash(v.trim())} placeholder="0x…" flag={hash && !HASH_RE.test(hash) ? "blocker" : undefined}
            hint="Or paste the fingerprint printed on a Clausewright contract." />
          <Text mono label="Compare with the fingerprint recorded in the escrow" value={compare} onChange={setCompare} placeholder="0x…" />
          {match !== null && (
            <Notice tone={match ? "ok" : "err"} role="status">
              {match ? <><strong>Identical.</strong> This is the document that was recorded.</> : <><strong>Different.</strong> This is not the document that was recorded.</>}
            </Notice>
          )}
        </div>

        <SectionTitle>Certificate details</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Document title" value={title} onChange={setTitle} />
          <Text label="Your name" value={name} onChange={setName} />
          <Text label="Your role" value={roleTitle} onChange={setRoleTitle} placeholder="Proprietor, Pixelnest Studio" />
          <Text mono label="Escrow address (optional)" value={escrow} onChange={setEscrow} placeholder="0x…" />
        </div>
        {err && <Notice tone="err" role="alert" className="mt-3">{err}</Notice>}
        <div className="mt-5">
          <Button loading={busy} disabled={!HASH_RE.test(hash) || !name || !roleTitle} onClick={make} icon={<FileCheck2 className="size-4" />}>Draft certificate</Button>
        </div>
      </Panel>

      <div className="self-start">
        {cert ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-[0.95rem] font-bold text-ink-900">Certificate under s.63(4), Part A</h3>
              <Button size="sm" variant="ghost" className="ml-auto" icon={<Download className="size-4" />}
                onClick={() => download(new Blob([cert], { type: "text/markdown" }), "bsa-63-certificate-part-a.md")}>Download</Button>
            </div>
            <Markdown text={cert} />
            <p className="mt-3 text-[0.8rem] leading-relaxed text-mist-700">
              Part B must be completed by an expert who computes the hash independently. The on-chain record supports the certificate; it does not replace it.
            </p>
          </>
        ) : (
          <Panel>
            <Empty icon={<ShieldCheck className="size-8" />} title="The draft certificate appears here">
              Fill in the fingerprint, your name and your role, then draft Part A.
            </Empty>
          </Panel>
        )}
      </div>
    </div>
  );
}
