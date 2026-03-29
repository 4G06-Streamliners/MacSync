#!/usr/bin/env python3
"""
MacSync venue order PDF — ReportLab (stdin JSON -> stdout PDF bytes).
"""
from __future__ import annotations

import json
import math
import sys
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tables import LongTable

MAROON = HexColor("#7A003C")
LIGHT_BG = HexColor("#F5E6EB")
HEADER_TEXT = colors.white
PAGE_W, PAGE_H = letter


def money(cents: int) -> str:
    return f"${cents / 100:.2f}"


def fmt_registered(iso: str) -> str:
    if not iso:
        return "—"
    # ISO from Node is often ISO8601 string
    from datetime import datetime

    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.strftime("%b %d, %Y")
    except Exception:
        return iso[:10]


def estimate_total_pages(attendee_count: int) -> int:
    """Page 1 = order summary; following page(s) = attendee roster (new page before roster).

    Conservative rows-per-page so 'Page N of M' in the footer is rarely understated
    when cells wrap in the LongTable.
    """
    per = 22
    if attendee_count <= 0:
        roster_pages = 1
    else:
        roster_pages = max(1, math.ceil(attendee_count / per))
    return 1 + roster_pages


def escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def section_title(text: str, styles: Any) -> Table:
    """Maroon vertical accent bar + section heading."""
    p = Paragraph(f"<b>{escape(text)}</b>", styles["SectionHeading"])
    inner_w = PAGE_W - 1.1 * inch - 6
    t = Table([["", p]], colWidths=[6, inner_w])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), MAROON),
                ("BACKGROUND", (1, 0), (1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (1, 0), (1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def build_styles() -> dict:
    base = getSampleStyleSheet()
    styles = {
        "Normal": ParagraphStyle(
            "n",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=colors.black,
        ),
        "Label": ParagraphStyle(
            "lbl",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=HexColor("#333333"),
        ),
        "MetaValue": ParagraphStyle(
            "mv",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=colors.black,
        ),
        "SectionHeading": ParagraphStyle(
            "sh",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=13,
            textColor=MAROON,
        ),
        "BannerTitle": ParagraphStyle(
            "bt",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=HEADER_TEXT,
        ),
        "BannerSub": ParagraphStyle(
            "bs",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        "FooterNote": ParagraphStyle(
            "fn",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            textColor=HexColor("#555555"),
        ),
    }
    return styles


def build_story(payload: dict[str, Any]) -> list:
    styles = build_styles()
    story: list = []
    meta = payload["meta"]
    brand = payload["brand"]
    ev = payload["event"]
    attendees: list = payload.get("attendees") or []

    # --- Top maroon banner ---
    banner_data = [
        [
            Paragraph(escape("Venue order"), styles["BannerTitle"]),
        ],
        [Paragraph(escape(brand.get("tagline", "")), styles["BannerSub"])],
    ]
    banner = Table(banner_data, colWidths=[PAGE_W - 1.2 * inch])
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), MAROON),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(banner)
    story.append(Spacer(1, 0.15 * inch))

    # --- Invoice grid (two columns of label/value) ---
    rows_meta = [
        ("INVOICE NO.", meta.get("invoiceNo", "—")),
        ("ISSUED", meta.get("issuedDateDisplay", "—")),
        ("EVENT DATE", ev.get("dateDisplay", "—")),
        ("PREPARED BY", meta.get("preparedBy", "—")),
        ("STATUS", meta.get("status", "—")),
    ]
    grid = []
    for lab, val in rows_meta:
        grid.append(
            [
                Paragraph(f"<b>{escape(lab)}</b>", styles["Label"]),
                Paragraph(escape(str(val)), styles["MetaValue"]),
            ]
        )
    meta_table = Table(grid, colWidths=[1.35 * inch, 4.5 * inch])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 0.2 * inch))

    # --- Venue ---
    story.append(section_title("VENUE / BILL TO", styles))
    story.append(Spacer(1, 0.06 * inch))
    loc = (ev.get("location") or "").strip() or "—"
    story.append(Paragraph(escape(loc), styles["Normal"]))
    story.append(Spacer(1, 0.14 * inch))

    # --- Event details ---
    story.append(section_title("EVENT DETAILS", styles))
    story.append(Spacer(1, 0.06 * inch))
    price = ev.get("priceCents", 0) or 0
    price_s = "Free" if price == 0 else f"{money(int(price))} / ticket"
    cap = ev.get("capacity", 0)
    reg = ev.get("registeredCount", 0)
    detail_rows = [
        ("Event name", ev.get("name") or "—"),
        ("Description", (ev.get("description") or "").strip() or "—"),
        ("Location", (ev.get("location") or "").strip() or "—"),
        ("Price / ticket", price_s),
        ("Capacity", f"{reg} / {cap} registered"),
    ]
    for lab, val in detail_rows:
        t = Table(
            [
                [
                    Paragraph(f"<b>{escape(lab)}:</b>", styles["Normal"]),
                    Paragraph(escape(str(val)), styles["Normal"]),
                ]
            ],
            colWidths=[1.15 * inch, 4.7 * inch],
        )
        t.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(t)
    story.append(Spacer(1, 0.14 * inch))

    # --- Seating ---
    story.append(section_title("SEATING CONFIGURATION", styles))
    story.append(Spacer(1, 0.08 * inch))
    if ev.get("requiresTableSignup") and ev.get("tableCount") is not None and ev.get("seatsPerTable") is not None:
        tc = int(ev["tableCount"])
        spt = int(ev["seatsPerTable"])
        seats = tc * spt
        seat_header = ["ZONE / TYPE", "UNIT / CONFIG", "TOTAL"]
        seat_data = [
            seat_header,
            ["Dining tables", f"{tc} × {spt} seats per table", str(seats)],
        ]
        st = Table(seat_data, colWidths=[2.2 * inch, 2.4 * inch, 1.5 * inch])
        st.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), MAROON),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dddddd")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                ]
            )
        )
        story.append(st)
        story.append(Spacer(1, 0.06 * inch))
        story.append(
            Paragraph(
                "<i>Note: Round banquet style (per event setup).</i>",
                styles["FooterNote"],
            )
        )
    else:
        story.append(Paragraph("Table seating is not configured for this event.", styles["Normal"]))
    story.append(Spacer(1, 0.14 * inch))

    # --- Transport ---
    story.append(section_title("TRANSPORTATION", styles))
    story.append(Spacer(1, 0.08 * inch))
    if ev.get("requiresBusSignup") and ev.get("busCount") is not None and ev.get("busCapacity") is not None:
        bc = int(ev["busCount"])
        cap_b = int(ev["busCapacity"])
        tot = bc * cap_b
        trans_header = ["VEHICLE TYPE", "QTY", "CAP (ea.)", "ASSIGNED TO"]
        trans_data = [
            trans_header,
            ["Event bus / shuttle", str(bc), f"{cap_b} seats", "Registered attendees"],
        ]
        tt = Table(trans_data, colWidths=[2.0 * inch, 0.7 * inch, 1.1 * inch, 2.3 * inch])
        tt.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), MAROON),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 1), (-1, 1), LIGHT_BG),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dddddd")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("ALIGN", (1, 1), (2, 1), "RIGHT"),
                ]
            )
        )
        story.append(tt)
    else:
        story.append(Paragraph("Bus / shuttle is not configured for this event.", styles["Normal"]))

    story.append(Spacer(1, 0.2 * inch))

    # --- Attendees (new page) ---
    story.append(PageBreak())
    story.append(section_title("REGISTERED ATTENDEES", styles))
    story.append(Spacer(1, 0.06 * inch))
    story.append(
        Paragraph(
            f"<b>{len(attendees)}</b> registered",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.1 * inch))

    if not attendees:
        story.append(Paragraph("No attendees registered yet.", styles["Normal"]))
    else:
        ah = [
            "Name",
            "Program",
            "Email",
            "Table",
            "Bus",
            "Signed up",
        ]
        ad = [ah]
        for a in attendees:
            ad.append(
                [
                    escape((a.get("name") or "")[:40]),
                    escape((a.get("program") or "—")[:24]),
                    escape((a.get("email") or "")[:36]),
                    escape((a.get("tableSeat") or "—")[:12]),
                    escape((a.get("busSeat") or "—")[:12]),
                    escape(fmt_registered(a.get("registeredAt") or "")),
                ]
            )
        at = LongTable(
            ad,
            colWidths=[1.25 * inch, 0.95 * inch, 1.85 * inch, 0.65 * inch, 0.65 * inch, 0.85 * inch],
            repeatRows=1,
        )
        at.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), MAROON),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("GRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#e0e0e0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#fafafa")]),
                ]
            )
        )
        story.append(at)

    return story


def run() -> bytes:
    raw = sys.stdin.buffer.read()
    payload = json.loads(raw.decode("utf-8"))
    total_pages = estimate_total_pages(len(payload.get("attendees") or []))

    buf = BytesIO()

    def on_page(canv: pdfcanvas.Canvas, doc: Any) -> None:
        canv.saveState()
        fh = 0.42 * inch
        canv.setFillColor(MAROON)
        canv.rect(0, 0, PAGE_W, fh, fill=1, stroke=0)
        canv.setFillColor(colors.white)
        fs = 7.5
        font = "Helvetica"
        meta = payload["meta"]
        brand = payload["brand"]
        foot = (
            f"Generated by MacSync — {brand.get('org', '')} — {meta.get('issuedDateDisplay', '')} — "
            f"{meta.get('invoiceNo', '')} — {brand.get('url', '')} — Page {canv.getPageNumber()} of {total_pages}"
        )
        x0 = 0.55 * inch
        max_w = PAGE_W - 1.1 * inch
        words = foot.split()
        lines: list[str] = []
        line = ""
        for w in words:
            test = (line + " " + w).strip()
            if stringWidth(test, font, fs) <= max_w:
                line = test
            else:
                if line:
                    lines.append(line)
                line = w
        if line:
            lines.append(line)
        y = 0.22 * inch
        for ln in lines[:3]:
            canv.setFont(font, fs)
            canv.drawString(x0, y, ln)
            y -= fs + 2
        canv.restoreState()

    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.65 * inch,
        title="MacSync Venue Order",
        author="MacSync",
    )
    story = build_story(payload)
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


if __name__ == "__main__":
    try:
        sys.stdout.buffer.write(run())
    except Exception as e:
        sys.stderr.write(f"venue_order_pdf: {e}\n")
        sys.exit(1)
