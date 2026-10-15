#!/usr/bin/env python3
"""Build the System Design book: chapters/*.md -> dist/book.html (+ cover.html).

Markdown extensions on top of standard Markdown:

  @part N | Title | Subtitle            part divider page (first line of a file)

  :::diagram WxH | Caption               inline SVG figure from a tiny DSL
  box  id x y w h "Label" kind           kinds: client svc db cache queue lb store zone note cdn
  arrow a b "label" [dashed] [both] [off=N] [noarrow] [lx=N] [ly=N]
  line x1 y1 x2 y2 "label" [dashed] [both] [noarrow]
  text x y "label" [small|bold|muted|accent] [start|end]
  :::

  :::key|tradeoff|tip|pitfall|example|deep Title
  markdown body
  :::

  :::quiz
  Q: question (markdown)
  A: answer (markdown)
  :::
"""
import html
import json
import math
import re
import shlex
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
CH_DIR = ROOT / "chapters"
DIST = ROOT / "dist"

MD_EXT = ["tables", "fenced_code", "attr_list", "sane_lists", "md_in_html"]


def md(text):
    return markdown.markdown(text, extensions=MD_EXT)


# ---------------------------------------------------------------- diagrams --

KIND_CLASS = {
    "client": "k-client", "svc": "k-svc", "db": "k-db", "cache": "k-cache",
    "queue": "k-queue", "lb": "k-lb", "store": "k-store", "zone": "k-zone",
    "note": "k-note", "cdn": "k-cdn", "bad": "k-bad", "good": "k-good",
}


def esc(s):
    return html.escape(s, quote=True)


def multiline(x, y, label, cls="", anchor="middle", lh=14):
    lines = label.split("\\n")
    y0 = y - (len(lines) - 1) * lh / 2
    out = []
    for i, ln in enumerate(lines):
        out.append(
            f'<text x="{x:.1f}" y="{y0 + i * lh:.1f}" class="{cls}" '
            f'text-anchor="{anchor}" dominant-baseline="central">{esc(ln)}</text>'
        )
    return "".join(out)


def clip(box, tx, ty):
    """Point where the segment from box centre towards (tx,ty) leaves the box."""
    x, y, w, h = box
    cx, cy = x + w / 2, y + h / 2
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    sx = (w / 2 + 3) / abs(dx) if dx else math.inf
    sy = (h / 2 + 3) / abs(dy) if dy else math.inf
    s = min(sx, sy)
    return cx + dx * s, cy + dy * s


def render_diagram(spec, caption, fig_id, fig_label):
    head, _, body = spec.partition("\n")
    w, h = (int(v) for v in head.lower().split("x"))
    boxes = {}
    shapes, edges, labels = [], [], []
    for raw in body.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        tok = shlex.split(line)
        cmd = tok[0]
        flags = set(t for t in tok if "=" not in t)
        kv = dict(t.split("=", 1) for t in tok if "=" in t and not t.startswith('"'))
        if cmd == "box":
            _, bid, x, y, bw, bh, label, *rest = tok
            x, y, bw, bh = map(float, (x, y, bw, bh))
            kind = rest[0] if rest else "svc"
            boxes[bid] = (x, y, bw, bh)
            cls = KIND_CLASS.get(kind, "k-svc")
            if kind in ("db", "store"):
                ry = min(9, bh / 6)
                shapes.append(
                    f'<g class="{cls}"><path d="M{x},{y + ry} '
                    f'a{bw / 2},{ry} 0 0 0 {bw},0 a{bw / 2},{ry} 0 0 0 {-bw},0 '
                    f'v{bh - 2 * ry} a{bw / 2},{ry} 0 0 0 {bw},0 v{-(bh - 2 * ry)}"/>'
                    f'<path class="rim" d="M{x},{y + ry} a{bw / 2},{ry} 0 0 0 {bw},0"/></g>'
                )
                labels.append(multiline(x + bw / 2, y + bh / 2 + ry / 2, label, "lbl"))
            elif kind == "zone":
                shapes.append(
                    f'<rect class="{cls}" x="{x}" y="{y}" width="{bw}" height="{bh}" rx="10"/>'
                )
                labels.append(
                    f'<text x="{x + 10}" y="{y + 15}" class="zlbl">{esc(label)}</text>'
                )
            elif kind == "note":
                labels.append(multiline(x + bw / 2, y + bh / 2, label, "note"))
            elif kind == "queue":
                shapes.append(
                    f'<rect class="{cls}" x="{x}" y="{y}" width="{bw}" height="{bh}" rx="4"/>'
                )
                for i in range(1, 4):
                    xx = x + bw - 8 * i
                    shapes.append(
                        f'<line class="qbar" x1="{xx}" y1="{y + 5}" x2="{xx}" y2="{y + bh - 5}"/>'
                    )
                labels.append(multiline(x + (bw - 26) / 2, y + bh / 2, label, "lbl"))
            else:
                rx = 18 if kind == "client" else 6
                shapes.append(
                    f'<rect class="{cls}" x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{rx}"/>'
                )
                labels.append(multiline(x + bw / 2, y + bh / 2, label, "lbl"))
        elif cmd in ("arrow", "line"):
            if cmd == "arrow":
                a, b = tok[1], tok[2]
                rest = tok[3:]
                ba, bb = boxes[a], boxes[b]
                acx, acy = ba[0] + ba[2] / 2, ba[1] + ba[3] / 2
                bcx, bcy = bb[0] + bb[2] / 2, bb[1] + bb[3] / 2
                off = float(kv.get("off", 0))
                if off:
                    L = math.hypot(bcx - acx, bcy - acy) or 1
                    nx, ny = -(bcy - acy) / L * off, (bcx - acx) / L * off
                    acx, acy, bcx, bcy = acx + nx, acy + ny, bcx + nx, bcy + ny
                    ba = (ba[0] + nx, ba[1] + ny, ba[2], ba[3])
                    bb = (bb[0] + nx, bb[1] + ny, bb[2], bb[3])
                x1, y1 = clip(ba, bcx, bcy)
                x2, y2 = clip(bb, acx, acy)
            else:
                x1, y1, x2, y2 = map(float, tok[1:5])
                rest = tok[5:]
            label = next((r for r in rest if "=" not in r and r not in
                          ("dashed", "both", "noarrow", "accent", "bad")), "")
            cls = "edge"
            if "dashed" in flags:
                cls += " dashed"
            if "accent" in flags:
                cls += " accent"
            if "bad" in flags:
                cls += " badedge"
            mk = "" if "noarrow" in flags else ' marker-end="url(#ah)"'
            if "both" in flags:
                mk += ' marker-start="url(#ahs)"'
            edges.append(
                f'<line class="{cls}" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"{mk}/>'
            )
            if label:
                mx = (x1 + x2) / 2 + float(kv.get("lx", 0))
                my = (y1 + y2) / 2 + float(kv.get("ly", -8))
                labels.append(multiline(mx, my, label, "elbl", lh=12))
        elif cmd == "circle":
            cx, cy, r = map(float, tok[1:4])
            dash = ' stroke-dasharray="5 4"' if "dashed" in flags else ""
            shapes.append(
                f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#9aa3b0" stroke-width="1.6"{dash}/>'
            )
        elif cmd == "text":
            x, y, label = float(tok[1]), float(tok[2]), tok[3]
            cls = " ".join(f"t-{f}" for f in tok[4:] if f in
                           ("small", "bold", "muted", "accent", "big", "mono"))
            anchor = "start" if "start" in flags else "end" if "end" in flags else "middle"
            labels.append(multiline(x, y, label, "txt " + cls, anchor=anchor))
        else:
            raise ValueError(f"unknown diagram command: {line}")

    svg = (
        f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" '
        f'aria-label="{esc(caption)}">'
        '<defs>'
        '<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
        '<path d="M0,1 L10,5 L0,9 z" class="ahead"/></marker>'
        '<marker id="ahs" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">'
        '<path d="M10,1 L0,5 L10,9 z" class="ahead"/></marker>'
        '</defs>'
        + "".join(shapes) + "".join(edges) + "".join(labels) + "</svg>"
    )
    return (
        f'<figure class="dia" id="{fig_id}">{svg}'
        f'<figcaption><span class="fignum">{fig_label}</span> {md_inline(caption)}</figcaption></figure>'
    )


def md_inline(s):
    out = md(s)
    return re.sub(r"^<p>(.*)</p>$", r"\1", out.strip(), flags=re.S)


# ------------------------------------------------------------------- build --

CALLOUT_TITLES = {
    "key": "Key idea", "tradeoff": "Trade-off", "tip": "Interview tip",
    "pitfall": "Common pitfall", "example": "Worked example", "deep": "Going deeper",
}

BLOCK_RE = re.compile(r"^:::(\w+)[ \t]*(.*?)\n(.*?)^:::[ \t]*$", re.M | re.S)


class Book:
    def __init__(self):
        self.ch = 0          # chapter counter (case studies continue numbering)
        self.toc = []        # (level, id, number, title)
        self.answers = []    # (chapter_label, chapter_title, [(qid, aid, n, answer_html)])
        self.parts_html = []

    def process_file(self, path):
        text = path.read_text()
        out = []
        m = re.match(r"@part\s+(.*?)\s*\|\s*(.*?)\s*\|\s*(.*)\n", text)
        if m:
            num, title, sub = m.groups()
            pid = f"part-{num.lower()}"
            self.toc.append(("part", pid, num, title))
            out.append(
                f'<section class="part" id="{pid}"><div class="part-inner">'
                f'<div class="part-num">Part {esc(num)}</div><h1 class="part-title">{esc(title)}</h1>'
                f'<p class="part-sub">{md_inline(sub)}</p></div></section>'
            )
            text = text[m.end():]

        # split into chapters on top-level headings
        chunks = re.split(r"^(?=# )", text, flags=re.M)
        for chunk in chunks:
            if not chunk.strip():
                continue
            out.append(self.process_chapter(chunk))
        return "\n".join(out)

    def process_chapter(self, chunk):
        first, _, body = chunk.partition("\n")
        title = first[2:].strip()
        appendix = False
        am = re.match(r"\[(appendix|front)\]\s*(.*)", title)
        if am:
            appendix = am.group(1)
            title = am.group(2)
        if appendix:
            num = ""
            cid = "ap-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        else:
            self.ch += 1
            num = str(self.ch)
            cid = f"ch-{num}"
        self.toc.append(("chapter", cid, num, title))

        placeholders = {}
        fig = [0]
        quiz_items = []

        def stash(html_):
            key = f"@@PH{len(placeholders)}@@"
            placeholders[key] = html_
            return f"\n\n{key}\n\n"

        def block(m):
            kind, arg, content = m.group(1), m.group(2).strip(), m.group(3)
            if kind == "diagram":
                size, _, cap = arg.partition("|")
                fig[0] += 1
                label = f"Figure {num}.{fig[0]}" if num else f"Figure A.{fig[0]}"
                fid = f"fig-{num or 'a'}-{fig[0]}"
                return stash(render_diagram(size.strip() + "\n" + content, cap.strip(), fid, label))
            if kind == "quiz":
                items = re.split(r"^Q:\s*", content, flags=re.M)[1:]
                lis = []
                for it in items:
                    q, _, a = it.partition("\nA:")
                    n = len(quiz_items) + 1
                    qid, aid = f"q-{cid}-{n}", f"a-{cid}-{n}"
                    quiz_items.append((qid, aid, n, md(a.strip())))
                    lis.append(
                        f'<li id="{qid}"><div class="qtext">{md(q.strip())}</div>'
                        f'<a class="qlink" href="#{aid}">See answer &#8594;</a></li>'
                    )
                return stash(
                    '<section class="quiz"><div class="quiz-head">Check your understanding</div>'
                    f'<ol>{"".join(lis)}</ol></section>'
                )
            if kind in CALLOUT_TITLES:
                t = arg or CALLOUT_TITLES[kind]
                inner = BLOCK_RE.sub(block, content)
                inner_html = md(inner)
                for k, v in placeholders.items():
                    inner_html = inner_html.replace(f"<p>{k}</p>", v)
                return stash(
                    f'<aside class="callout c-{kind}"><div class="c-tag">{CALLOUT_TITLES[kind]}</div>'
                    f'<div class="c-title">{md_inline(t) if arg else ""}</div>{inner_html}</aside>'
                )
            raise ValueError(f"unknown block {kind}")

        body = BLOCK_RE.sub(block, body)
        html_ = md(body)
        for k, v in placeholders.items():
            html_ = html_.replace(f"<p>{k}</p>", v)

        # number sections
        sec = [0]

        def h2(m):
            sec[0] += 1
            stitle = m.group(1)
            sid = f"{cid}-s{sec[0]}"
            snum = f"{num}.{sec[0]}" if num else ""
            plain = re.sub(r"<.*?>", "", stitle)
            self.toc.append(("section", sid, snum, plain))
            n = f'<span class="secnum">{snum}</span>' if snum else ""
            return f'<h2 id="{sid}">{n}{stitle}</h2>'

        html_ = re.sub(r"<h2>(.*?)</h2>", h2, html_)

        if quiz_items:
            self.answers.append((num, title, cid, quiz_items))

        if appendix == "front":
            label = ""
        elif appendix:
            label = '<div class="ch-num">Appendix</div>'
        else:
            label = f'<div class="ch-num">Chapter {num}</div>'
        return (
            f'<section class="chapter{" appendix" if appendix else ""}" id="{cid}">'
            f'<header class="ch-head">{label}<h1>{esc(title)}</h1>'
            f'<a class="toc-back" href="#toc">&#8617; Contents</a></header>'
            f'{html_}</section>'
        )

    def answer_key(self):
        parts = ['<section class="chapter appendix" id="answers"><header class="ch-head">'
                 '<div class="ch-num">Appendix</div><h1>Answer Key</h1>'
                 '<a class="toc-back" href="#toc">&#8617; Contents</a></header>'
                 '<p class="lead">Every answer links back to its question. Try each question '
                 'honestly before reading the answer &mdash; retrieval is what makes it stick.</p>']
        for num, title, cid, items in self.answers:
            lab = f"Chapter {num}" if num else "Appendix"
            parts.append(f'<h3 class="ak-ch"><a href="#{cid}">{lab}: {esc(title)}</a></h3><ol class="ak">')
            for qid, aid, n, a in items:
                parts.append(
                    f'<li id="{aid}" value="{n}">{a}<a class="qlink back" href="#{qid}">'
                    f'&#8617; Back to question</a></li>'
                )
            parts.append("</ol>")
        parts.append("</section>")
        self.toc.append(("chapter", "answers", "", "Answer Key"))
        return "".join(parts)

    def toc_html(self, pages=None):
        pages = pages or {}
        rows = []
        for level, id_, num, title in self.toc:
            pn = pages.get(id_, "")
            if level == "part":
                rows.append(f'<li class="t-part"><a href="#{id_}"><span class="t-n">Part {num}</span>'
                            f'<span class="t-t">{esc(title)}</span><span class="t-p">{pn}</span></a></li>')
            elif level == "chapter":
                rows.append(f'<li class="t-ch"><a href="#{id_}"><span class="t-n">{num}</span>'
                            f'<span class="t-t">{esc(title)}</span><span class="t-dots"></span>'
                            f'<span class="t-p">{pn}</span></a></li>')
            else:
                rows.append(f'<li class="t-sec"><a href="#{id_}"><span class="t-n">{num}</span>'
                            f'<span class="t-t">{esc(title)}</span><span class="t-dots"></span>'
                            f'<span class="t-p">{pn}</span></a></li>')
        return ('<section class="toc" id="toc"><h1>Contents</h1>'
                f'<ol class="toc-list">{"".join(rows)}</ol></section>')


def main():
    pages = {}
    pf = DIST / "pages.json"
    if "--with-pages" in sys.argv and pf.exists():
        pages = json.loads(pf.read_text())
    DIST.mkdir(exist_ok=True)
    book = Book()
    body = []
    for f in sorted(CH_DIR.glob("*.md")):
        body.append(book.process_file(f))
    body.append(book.answer_key())
    css = (ROOT / "style.css").read_text()
    doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<title>System Design: From First Principles to Planet Scale</title>'
        f"<style>{css}</style></head><body>"
        + book.toc_html(pages) + "\n".join(body) + "</body></html>"
    )
    (DIST / "book.html").write_text(doc)
    cover = (ROOT / "cover.html").read_text().replace("/*CSS*/", css)
    (DIST / "cover.html").write_text(cover)
    ids = [t[1] for t in book.toc]
    (DIST / "toc-ids.json").write_text(json.dumps(ids))
    print(f"built: {book.ch} chapters, {sum(len(a[3]) for a in book.answers)} quiz questions, "
          f"{len(book.toc)} toc entries")


if __name__ == "__main__":
    main()
