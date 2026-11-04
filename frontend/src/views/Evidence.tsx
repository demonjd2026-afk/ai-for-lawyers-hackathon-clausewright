import { useState } from "react";
import { api, download } from "../api";
import { Text } from "../components/Fields";
import { Markdown } from "../components/Markdown";

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Evidence() {
  const [hash, setHash] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [title, setTitle] = useState("Service Agreement");
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [escrow, setEscrow] = useState("");
  const [compare, setCompare] = useState("");
  const [cert, setCert] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setErr("Choose a file under 20 MB.");
    setErr(null);
    setFileName(f.name);
    setHash(await sha256Hex(await f.arrayBuffer()));
  }

  async function make() {
    setErr(null);
    try {
      const r = await api.certificate({
        document_title: title, document_hash: hash, certifier_name: name, certifier_role: roleTitle,
        ...(escrow ? { escrow_address: escrow, chain: "Sepolia" } : {}),
      });
      setCert(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const match = compare && hash ? compare.trim().toLowerCase() === hash.toLowerCase() : null;

  return (
    <div className="bench">
      <div className="panel">
        <h2>Prove a document has not changed</h2>
        <p className="lede">Courts admit electronic records with a certificate under section 63 of the Bharatiya Sakshya Adhiniyam, 2023,
          which must state the record's hash. Choose the file to compute its SHA-256 here in your browser; the file is not uploaded.</p>
        <label className="field">
          <span>Document file</span>
          <input type="file" onChange={(e) => onFile(e.target.files?.[0])} />
          {fileName && <small className="hint">{fileName}</small>}
        </label>
        <div style={{ marginTop: "0.6rem" }}>
          <Text mono label="SHA-256" value={hash} onChange={(v) => setHash(v.trim())} placeholder="0x…" hint="Or paste the fingerprint shown on a Clausewright contract." />
        </div>
        <div style={{ marginTop: "0.6rem" }}>
          <Text mono label="Compare with the fingerprint recorded in the escrow" value={compare} onChange={setCompare} placeholder="0x…" />
          {match !== null && <p className={`notice ${match ? "ok" : "err"}`}>{match ? "Identical. The document is unchanged." : "Different. This is not the document that was recorded."}</p>}
        </div>
        <h3>Certificate details</h3>
        <div className="grid2">
          <Text label="Document title" value={title} onChange={setTitle} />
          <Text label="Your name" value={name} onChange={setName} />
          <Text label="Your role" value={roleTitle} onChange={setRoleTitle} placeholder="Proprietor, Pixelnest Studio" />
          <Text mono label="Escrow address (optional)" value={escrow} onChange={setEscrow} placeholder="0x…" />
        </div>
        {err && <p className="notice err" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: "0.8rem" }}>
          <button className="btn" disabled={!/^0x[0-9a-fA-F]{64}$/.test(hash) || !name || !roleTitle} onClick={make}>Draft certificate</button>
        </div>
      </div>
      <div className="panel">
        {cert ? (
          <>
            <Markdown text={cert} />
            <div className="row" style={{ marginTop: "1rem" }}>
              <button className="btn small quiet" onClick={() => download(new Blob([cert], { type: "text/markdown" }), "bsa-63-certificate-part-a.md")}>Download</button>
            </div>
            <p className="hint">Part B must be completed by an expert who computes the hash independently. The on-chain record supports the
              certificate; it does not replace it.</p>
          </>
        ) : (
          <p className="lede">The draft Part A of the certificate appears here.</p>
        )}
      </div>
    </div>
  );
}
