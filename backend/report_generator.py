from datetime import datetime, timezone
from html import escape


def _risk_class(risk: str) -> str:
    """Return a CSS class name based on the risk level."""
    return {
        "high": "risk-high",
        "medium": "risk-medium",
        "low": "risk-low",
    }.get(risk.lower(), "risk-low")


def _list_items(items: list[str], empty_text: str) -> str:
    """Render a list of values to HTML list items, with a fallback if empty."""
    values = items or [empty_text]
    return "\n".join(f"<li>{escape(value)}</li>" for value in values)


def build_html_report(
    *,
    scan: dict[str, object],
    submitted_text: str,
    reference_text: str | None,
    generated_for: str,
) -> str:
    """Build a complete self-contained HTML report for a scan result."""
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    risk = str(scan.get("risk", "low"))
    ai_detection = scan.get("ai_detection", {})
    if not isinstance(ai_detection, dict):
        ai_detection = {}

    source_traces = scan.get("source_traces", [])
    if not isinstance(source_traces, list):
        source_traces = []

    source_sections: list[str] = []
    for trace in source_traces:
        if not isinstance(trace, dict):
            continue
        title = escape(str(trace.get("title", "Untitled source")))
        source_type = escape(str(trace.get("source_type", "source")))
        url = trace.get("url")
        similarity = escape(str(trace.get("similarity_percentage", 0)))
        matched_sentences = trace.get("matched_sentences", [])
        if not isinstance(matched_sentences, list):
            matched_sentences = []
        sentence_matches = trace.get("sentence_matches", [])
        if not isinstance(sentence_matches, list):
            sentence_matches = []

        source_link = ""
        if url:
            escaped_url = escape(str(url), quote=True)
            source_link = f'<p><a href="{escaped_url}">{escaped_url}</a></p>'

        match_rows = []
        for match in sentence_matches[:8]:
            if not isinstance(match, dict):
                continue
            match_rows.append(
                "<tr>"
                f"<td>{escape(str(match.get('similarity_percentage', 0)))}%</td>"
                f"<td>{escape(str(match.get('submitted_sentence', '')))}</td>"
                f"<td>{escape(str(match.get('source_sentence', '')))}</td>"
                "</tr>"
            )

        table = ""
        if match_rows:
            table = (
                "<table>"
                "<thead><tr><th>Match</th><th>Submitted sentence</th><th>Source sentence</th></tr></thead>"
                f"<tbody>{''.join(match_rows)}</tbody>"
                "</table>"
            )

        source_sections.append(
            "<section class=\"source\">"
            f"<h3>{title}</h3>"
            f"<p class=\"muted\">{source_type} source · {similarity}% similarity</p>"
            f"{source_link}"
            f"<ul>{_list_items([str(item) for item in matched_sentences], 'No sentence-level matches recorded.')}</ul>"
            f"{table}"
            "</section>"
        )

    recommendations = scan.get("recommendations", [])
    if not isinstance(recommendations, list):
        recommendations = []
    signals = ai_detection.get("signals", [])
    if not isinstance(signals, list):
        signals = []
    matched_sentences = scan.get("matched_sentences", [])
    if not isinstance(matched_sentences, list):
        matched_sentences = []

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Plagiarism Report</title>
    <style>
        :root {{
            color-scheme: light;
            --ink: #0f172a;
            --muted: #64748b;
            --line: #dfe7ef;
            --page: #f6f8f5;
            --panel: #ffffff;
            --accent: #047857;
            --high: #be123c;
            --medium: #b45309;
            --low: #047857;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            margin: 0;
            background: var(--page);
            color: var(--ink);
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
        }}
        main {{
            max-width: 980px;
            margin: 0 auto;
            padding: 32px 20px 48px;
        }}
        header, section {{
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 8px;
            margin-bottom: 18px;
            padding: 22px;
        }}
        h1, h2, h3, p {{ margin-top: 0; }}
        h1 {{ font-size: 30px; margin-bottom: 8px; }}
        h2 {{ font-size: 20px; border-bottom: 1px solid var(--line); padding-bottom: 10px; }}
        h3 {{ font-size: 17px; margin-bottom: 4px; }}
        .muted {{ color: var(--muted); }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }}
        .metric {{
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 16px;
        }}
        .metric span {{ color: var(--muted); display: block; font-size: 13px; }}
        .metric strong {{ display: block; font-size: 30px; margin-top: 4px; }}
        .risk-high strong {{ color: var(--high); }}
        .risk-medium strong {{ color: var(--medium); }}
        .risk-low strong {{ color: var(--low); }}
        pre {{
            white-space: pre-wrap;
            word-break: break-word;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #f8fafc;
            padding: 16px;
            font-family: Arial, Helvetica, sans-serif;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 13px;
        }}
        th, td {{
            border: 1px solid var(--line);
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }}
        th {{ background: #f1f5f9; }}
        a {{ color: var(--accent); }}
        @media (max-width: 720px) {{
            .summary {{ grid-template-columns: 1fr; }}
        }}
        @media print {{
            body {{ background: white; }}
            main {{ padding: 0; }}
            header, section {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <main>
        <header>
            <h1>AI Plagiarism Report</h1>
            <p class="muted">Generated {generated_at} for {escape(generated_for)}</p>
        </header>

        <section>
            <h2>Summary</h2>
            <div class="summary">
                <div class="metric">
                    <span>Plagiarism</span>
                    <strong>{escape(str(scan.get("plagiarism_score", 0)))}%</strong>
                </div>
                <div class="metric">
                    <span>AI likeness</span>
                    <strong>{escape(str(scan.get("ai_likeness_score", 0)))}%</strong>
                </div>
                <div class="metric {_risk_class(risk)}">
                    <span>Risk</span>
                    <strong>{escape(risk.title())}</strong>
                </div>
            </div>
        </section>

        <section>
            <h2>AI Detection</h2>
            <p><strong>{escape(str(ai_detection.get("label", "Not available")))}</strong></p>
            <p class="muted">Confidence: {escape(str(ai_detection.get("confidence", "unknown")))}</p>
            <ul>{_list_items([str(item) for item in signals], "No AI-likeness signals were detected.")}</ul>
        </section>

        <section>
            <h2>Matched Sentences</h2>
            <ul>{_list_items([str(item) for item in matched_sentences], "No close matches found.")}</ul>
        </section>

        <section>
            <h2>Source Traces</h2>
            {''.join(source_sections) if source_sections else '<p class="muted">No source traces were found.</p>'}
        </section>

        <section>
            <h2>Recommendations</h2>
            <ul>{_list_items([str(item) for item in recommendations], "No recommendations were generated.")}</ul>
        </section>

        <section>
            <h2>Submitted Text</h2>
            <pre>{escape(submitted_text)}</pre>
        </section>

        <section>
            <h2>Reference Text</h2>
            <pre>{escape(reference_text or "No reference text supplied.")}</pre>
        </section>
    </main>
</body>
</html>"""
