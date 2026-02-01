from collections import Counter, defaultdict
from io import BytesIO

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    NextPageTemplate,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ============================================================================
# PALETA PROFESIONAL INSTITUCIONAL
# ============================================================================
COLORS = {
    "white": colors.HexColor("#FFFFFF"),
    "black": colors.HexColor("#1a1a1a"),
    "gray_dark": colors.HexColor("#2d2d2d"),
    "gray_medium": colors.HexColor("#555555"),
    "gray_light": colors.HexColor("#888888"),
    "gray_muted": colors.HexColor("#aaaaaa"),
    "gray_border": colors.HexColor("#dddddd"),
    "gray_bg": colors.HexColor("#f8f9fa"),
    "gray_row_alt": colors.HexColor("#f1f3f4"),

    "primary": colors.HexColor("#B70803"),
    "primary_light": colors.HexColor("#dc3545"),
    "primary_dark": colors.HexColor("#8B0000"),

    "success": colors.HexColor("#198754"),
    "success_light": colors.HexColor("#d1e7dd"),
    "warning": colors.HexColor("#fd7e14"),
    "warning_light": colors.HexColor("#fff3cd"),
    "danger": colors.HexColor("#dc3545"),
    "danger_light": colors.HexColor("#f8d7da"),
    "info": colors.HexColor("#6c757d"),
    "info_light": colors.HexColor("#e9ecef"),
}

STATUS_CONFIG = {
    "PENDING": {"label": "Pendiente", "color": COLORS["warning"], "bg": COLORS["warning_light"]},
    "APPROVED": {"label": "Aprobada", "color": COLORS["success"], "bg": COLORS["success_light"]},
    "REJECTED": {"label": "Rechazada", "color": COLORS["danger"], "bg": COLORS["danger_light"]},
    "CANCELLED": {"label": "Cancelada", "color": COLORS["info"], "bg": COLORS["info_light"]},
}


def _format_datetime(value):
    if not value:
        return "—"
    return timezone.localtime(value).strftime("%d/%m/%Y a las %H:%M")


def _format_date_short(value):
    if not value:
        return "—"
    return timezone.localtime(value).strftime("%d/%m/%Y")


def _format_time(value):
    if not value:
        return "—"
    return timezone.localtime(value).strftime("%H:%M")


def _get_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="RptTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=COLORS["primary"],
        alignment=TA_CENTER,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name="RptSubtitle",
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=COLORS["gray_medium"],
        alignment=TA_CENTER,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name="RptSection",
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=COLORS["primary_dark"],
        spaceBefore=20,
        spaceAfter=10,
    ))

    styles.add(ParagraphStyle(
        name="RptCardTitle",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=COLORS["black"],
    ))

    styles.add(ParagraphStyle(
        name="RptBody",
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=COLORS["gray_dark"],
    ))

    styles.add(ParagraphStyle(
        name="RptMuted",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=COLORS["gray_medium"],
    ))

    styles.add(ParagraphStyle(
        name="RptSmall",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=COLORS["gray_light"],
    ))

    styles.add(ParagraphStyle(
        name="RptLabel",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=COLORS["gray_medium"],
    ))

    styles.add(ParagraphStyle(
        name="RptBadge",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
    ))

    styles.add(ParagraphStyle(
        name="RptFooter",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=COLORS["gray_muted"],
        alignment=TA_CENTER,
    ))

    styles.add(ParagraphStyle(
        name="RptTableHeader",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=COLORS["white"],
    ))

    styles.add(ParagraphStyle(
        name="RptTableCell",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=COLORS["gray_dark"],
    ))

    return styles


def _extract_reservation_data(reservation):
    """Extrae datos de una reserva (modelo desnormalizado de microservicio)."""
    creator = f"{reservation.created_by_first_name} {reservation.created_by_last_name}".strip()
    creator = creator or reservation.created_by_email or "Usuario"

    approver = ""
    if reservation.approved_by_id:
        approver = f"{reservation.approved_by_first_name} {reservation.approved_by_last_name}".strip()
        approver = approver or reservation.approved_by_email

    return {
        "id": reservation.id,
        "title": reservation.title or "Sin título",
        "description": reservation.description or "",
        "space": reservation.space_name or "Sin espacio",
        "location": reservation.space_location or "",
        "start_at": reservation.start_at,
        "end_at": reservation.end_at,
        "status": reservation.status,
        "created_by": creator,
        "created_by_email": reservation.created_by_email or "",
        "approved_by": approver,
        "decision_note": reservation.decision_note or "",
    }


def _create_status_cell(status):
    config = STATUS_CONFIG.get(status, STATUS_CONFIG["PENDING"])
    styles = _get_styles()

    badge_style = ParagraphStyle(
        name=f"BadgeStyle_{status}",
        parent=styles["RptBadge"],
        textColor=config["color"],
    )

    return Table(
        [[Paragraph(config["label"], badge_style)]],
        colWidths=[55],
        rowHeights=[16],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), config["bg"]),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ])
    )


def _create_summary_stats(counter):
    """Crea estadísticas de resumen en formato horizontal."""
    styles = _get_styles()
    total = sum(counter.values())

    stats_data = []
    for status_key in ["APPROVED", "PENDING", "REJECTED", "CANCELLED"]:
        count = counter.get(status_key, 0)
        config = STATUS_CONFIG[status_key]
        stats_data.append([
            Paragraph(f'<font color="{config["color"]}">{config["label"]}</font>', styles["RptLabel"]),
            Paragraph(f'<b>{count}</b>', styles["RptBody"]),
        ])

    stats_data.append([
        Paragraph("<b>TOTAL</b>", styles["RptLabel"]),
        Paragraph(f'<b>{total}</b>', styles["RptBody"]),
    ])

    return Table(
        [stats_data],
        colWidths=[35*mm] * 5,
        style=TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), COLORS["gray_bg"]),
            ("BOX", (0, 0), (-1, -1), 0.5, COLORS["gray_border"]),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )


def _create_reservations_table(reservations_data):
    """Crea tabla profesional de reservas."""
    styles = _get_styles()

    # Encabezados
    headers = [
        Paragraph("<b>RESERVA</b>", styles["RptTableHeader"]),
        Paragraph("<b>ESPACIO</b>", styles["RptTableHeader"]),
        Paragraph("<b>SOLICITANTE</b>", styles["RptTableHeader"]),
        Paragraph("<b>FECHA/HORA</b>", styles["RptTableHeader"]),
        Paragraph("<b>ESTADO</b>", styles["RptTableHeader"]),
    ]

    rows = [headers]

    for i, data in enumerate(reservations_data):
        row = [
            Paragraph(data["title"][:30] + ("..." if len(data["title"]) > 30 else ""), styles["RptTableCell"]),
            Paragraph(data["space"], styles["RptTableCell"]),
            Paragraph(data["created_by"], styles["RptTableCell"]),
            Paragraph(f'{_format_date_short(data["start_at"])}<br/>{_format_time(data["start_at"])} - {_format_time(data["end_at"])}', styles["RptTableCell"]),
            _create_status_cell(data["status"]),
        ]
        rows.append(row)

    col_widths = [45*mm, 35*mm, 40*mm, 35*mm, 20*mm]

    table_style = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), COLORS["primary"]),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLORS["white"]),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

        # Filas
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 1), (-1, -1), "LEFT"),
        ("ALIGN", (-1, 1), (-1, -1), "CENTER"),

        # Bordes
        ("BOX", (0, 0), (-1, -1), 1, COLORS["gray_border"]),
        ("LINEBELOW", (0, 0), (-1, 0), 2, COLORS["primary_dark"]),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, COLORS["gray_border"]),

        # Padding
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]

    # Filas alternadas
    for i in range(1, len(rows)):
        if i % 2 == 0:
            table_style.append(("BACKGROUND", (0, i), (-1, i), COLORS["gray_row_alt"]))
        else:
            table_style.append(("BACKGROUND", (0, i), (-1, i), COLORS["white"]))

    return Table(rows, colWidths=col_widths, style=TableStyle(table_style), repeatRows=1)


def _add_header_footer(canvas, doc):
    """Agrega encabezado y pie de página a cada página."""
    canvas.saveState()
    width, height = LETTER

    # Línea superior decorativa
    canvas.setStrokeColor(COLORS["primary"])
    canvas.setLineWidth(3)
    canvas.line(20*mm, height - 12*mm, width - 20*mm, height - 12*mm)

    # Pie de página
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(COLORS["gray_muted"])

    # Número de página
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(width / 2, 12*mm, f"Página {page_num}")

    # Línea inferior
    canvas.setStrokeColor(COLORS["gray_border"])
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 18*mm, width - 20*mm, 18*mm)

    # Info institucional
    canvas.drawString(20*mm, 12*mm, "LibApartado - FESC")
    canvas.drawRightString(width - 20*mm, 12*mm, _format_date_short(timezone.now()))

    canvas.restoreState()


def build_reservations_report(reservations, *, start=None, end=None, space=None, statuses=None):
    """Genera un reporte PDF profesional e institucional."""
    buffer = BytesIO()

    doc = BaseDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=25*mm,
        title="Reporte de Reservas - LibApartado",
        author="Sistema LibApartado - FESC",
    )

    # Frame principal
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main"
    )

    # Template con header/footer
    template = PageTemplate(id="main", frames=frame, onPage=_add_header_footer)
    doc.addPageTemplates([template])

    styles = _get_styles()
    story = []

    # ═══════════════════════════════════════════════════════════════════════
    # PORTADA / ENCABEZADO
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10*mm))

    # Título institucional
    story.append(Paragraph("LIBAPARTADO", styles["RptTitle"]))
    story.append(Paragraph("Sistema de Gestión de Reservas", styles["RptSubtitle"]))
    story.append(Paragraph("Fundación de Estudios Superiores Comfanorte - FESC", styles["RptMuted"]))

    story.append(Spacer(1, 8*mm))

    # Línea decorativa
    line_table = Table(
        [[""]],
        colWidths=[80*mm],
        rowHeights=[2],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLORS["primary"]),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ])
    )
    story.append(line_table)

    story.append(Spacer(1, 8*mm))

    # Título del reporte
    story.append(Paragraph("REPORTE DE RESERVAS", ParagraphStyle(
        name="ReportMainTitle",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=COLORS["black"],
        alignment=TA_CENTER,
        spaceAfter=15,
    )))

    # Información del reporte
    info_data = [
        ["Fecha de generación:", _format_datetime(timezone.now())],
    ]
    if start:
        info_data.append(["Período desde:", _format_datetime(start)])
    if end:
        info_data.append(["Período hasta:", _format_datetime(end)])
    if space:
        info_data.append(["Espacio filtrado:", space])
    if statuses:
        status_names = [STATUS_CONFIG.get(s, {}).get("label", s) for s in statuses]
        info_data.append(["Estados incluidos:", ", ".join(status_names)])

    info_table = Table(
        [[Paragraph(f"<b>{row[0]}</b>", styles["RptMuted"]),
          Paragraph(row[1], styles["RptBody"])] for row in info_data],
        colWidths=[45*mm, 100*mm],
        style=TableStyle([
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])
    )
    story.append(info_table)

    story.append(Spacer(1, 10*mm))

    # ═══════════════════════════════════════════════════════════════════════
    # PROCESAR DATOS
    # ═══════════════════════════════════════════════════════════════════════
    reservation_data = [_extract_reservation_data(r) for r in reservations]

    grouped = defaultdict(list)
    global_counter = Counter()

    for data in reservation_data:
        grouped[data["space"]].append(data)
        global_counter[data["status"]] += 1

    # ═══════════════════════════════════════════════════════════════════════
    # RESUMEN EJECUTIVO
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("RESUMEN EJECUTIVO", styles["RptSection"]))

    if reservation_data:
        story.append(_create_summary_stats(global_counter))
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph(
            f"Se registraron un total de <b>{len(reservation_data)}</b> reservas distribuidas en <b>{len(grouped)}</b> espacio(s).",
            styles["RptBody"]
        ))
    else:
        story.append(Paragraph(
            "No se encontraron reservas con los criterios de búsqueda especificados.",
            styles["RptMuted"]
        ))

    story.append(Spacer(1, 10*mm))

    # ═══════════════════════════════════════════════════════════════════════
    # DETALLE POR ESPACIO
    # ═══════════════════════════════════════════════════════════════════════
    for space_name in sorted(grouped.keys()):
        space_reservations = grouped[space_name]

        # Título del espacio con línea
        story.append(Table(
            [[Paragraph(f"<b>{space_name.upper()}</b>", ParagraphStyle(
                name="SpaceTitle",
                fontName="Helvetica-Bold",
                fontSize=12,
                textColor=COLORS["white"],
            ))]],
            colWidths=[175*mm],
            style=TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLORS["primary"]),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ])
        ))

        story.append(Spacer(1, 3*mm))

        # Resumen del espacio
        space_counter = Counter(r["status"] for r in space_reservations)
        summary_text = []
        for status_key in ["APPROVED", "PENDING", "REJECTED", "CANCELLED"]:
            count = space_counter.get(status_key, 0)
            if count > 0:
                config = STATUS_CONFIG[status_key]
                summary_text.append(f'<font color="{config["color"]}">{config["label"]}: {count}</font>')

        story.append(Paragraph(
            f"<b>Total:</b> {len(space_reservations)} reserva(s) — " + " | ".join(summary_text),
            styles["RptMuted"]
        ))

        story.append(Spacer(1, 4*mm))

        # Tabla de reservas del espacio
        sorted_reservations = sorted(space_reservations, key=lambda x: x["start_at"] or timezone.now())
        story.append(_create_reservations_table(sorted_reservations))

        story.append(Spacer(1, 8*mm))

    # ═══════════════════════════════════════════════════════════════════════
    # PIE DEL DOCUMENTO
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10*mm))

    # Línea final
    story.append(Table(
        [[""]],
        colWidths=[175*mm],
        rowHeights=[1],
        style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), COLORS["gray_border"])])
    ))

    story.append(Spacer(1, 5*mm))

    story.append(Paragraph(
        "Este documento fue generado automáticamente por el sistema LibApartado.<br/>"
        "Para consultas, comuníquese con la administración de la biblioteca.",
        styles["RptFooter"]
    ))

    # Construir PDF
    doc.build(story)
    pdf_content = buffer.getvalue()
    buffer.close()

    return pdf_content
