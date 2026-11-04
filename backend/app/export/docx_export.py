"""Render canonical contract markdown (the hashed text) to a Word document.

Only the subset the drafting engine emits is supported: '# ' title, '## ' headings, pipe
tables, '**bold**' spans and paragraphs. The footer carries the SHA-256 of the canonical
text, so a printed copy can be matched to the on-chain hash.
"""

from __future__ import annotations

import io
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

_BOLD = re.compile(r"\*\*(.+?)\*\*")


def _runs(par, text: str) -> None:
    pos = 0
    for m in _BOLD.finditer(text):
        if m.start() > pos:
            par.add_run(text[pos:m.start()])
        par.add_run(m.group(1)).bold = True
        pos = m.end()
    if pos < len(text):
        par.add_run(text[pos:])


def _page_number(par) -> None:
    run = par.add_run()
    for tag, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        if tag:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tag)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = txt
        run._r.append(el)


def _table(doc, rows: list[list[str]]) -> None:
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    for i, r in enumerate(rows):
        for j, cell in enumerate(r[: len(rows[0])]):
            c = t.cell(i, j)
            c.text = ""
            _runs(c.paragraphs[0], cell)
            if i == 0:
                for run in c.paragraphs[0].runs:
                    run.bold = True


def to_docx(text: str, document_hash: str, *, draft_notice: bool = True) -> bytes:
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    lines = text.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("# "):
            doc.add_heading(ln[2:], level=0).alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif ln.startswith("## "):
            doc.add_heading(ln[3:], level=2)
        elif ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not lines[i].startswith("|---"):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            if rows:
                _table(doc, rows)
            continue
        elif ln.strip():
            # the engine writes one paragraph per line; signature blocks are line-per-field
            _runs(doc.add_paragraph(), ln)
        i += 1

    sec = doc.sections[0]
    foot = sec.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = foot.add_run(f"SHA-256 of canonical text: {document_hash}   |   Page ")
    r.font.size = Pt(7)
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    _page_number(foot)
    if draft_notice:
        head = sec.header.paragraphs[0]
        head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hr = head.add_run("Prepared with Clausewright, an AI-assisted drafting tool. Review by an advocate is recommended.")
        hr.font.size = Pt(7)
        hr.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
