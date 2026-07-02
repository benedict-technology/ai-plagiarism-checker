"""email_scanner.py
Connects to any IMAP email account, searches for student emails by subject
keyword, extracts assignment text from the email body and supported attachments
(.docx, .pdf, .txt), then runs each submission through the existing plagiarism
and AI detection engine.
"""

import email
import imaplib
import re
from dataclasses import dataclass, field
from email.header import decode_header
from email.message import Message

from sqlalchemy.orm import Session

from .ai_detection import analyze_ai_content
from .document_parser import extract_document_text
from .source_tracing import seed_default_sources, trace_sources


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class EmailScanRequest:
    """All credentials and filter options supplied by the lecturer."""
    imap_server: str          # e.g. imap.gmail.com / outlook.office365.com
    imap_port: int            # usually 993 (SSL)
    email_address: str        # lecturer's email
    password: str             # app password or account password
    subject_keyword: str      # filter keyword, e.g. "Assignment 1"
    max_emails: int = 20      # safety cap so scans don't run forever


@dataclass
class AttachmentResult:
    """Text extracted from a single email attachment."""
    filename: str
    text: str
    error: str = ""


@dataclass
class EmailScanResult:
    """Plagiarism + AI result for one student email."""
    student_email: str
    student_name: str
    subject: str
    source: str                     # "body" or attachment filename
    text_preview: str               # first 300 chars of the scanned text
    plagiarism_score: int
    ai_likeness_score: int
    ai_label: str
    risk: str
    matched_sentences: list[str]
    source_traces: list[dict]
    error: str = ""


@dataclass
class EmailScanResponse:
    """Full response returned to the frontend after scanning an inbox."""
    emails_found: int
    emails_scanned: int
    results: list[EmailScanResult] = field(default_factory=list)
    error: str = ""


# ---------------------------------------------------------------------------
# IMAP helpers
# ---------------------------------------------------------------------------

def _decode_mime_header(raw: str | bytes | None) -> str:
    """Decode a MIME-encoded email header to a plain string."""
    if raw is None:
        return ""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    parts = decode_header(raw)
    decoded_parts = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded_parts.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded_parts.append(str(part))
    return " ".join(decoded_parts).strip()


def _extract_body_text(msg: Message) -> str:
    """Extract the plain-text body from an email message."""
    body_parts: list[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            # Only look at plain-text parts that are not attachments.
            if content_type == "text/plain" and "attachment" not in disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body_parts.append(payload.decode(charset, errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            body_parts.append(payload.decode(charset, errors="replace"))

    return "\n".join(body_parts).strip()


def _extract_attachments(msg: Message) -> list[AttachmentResult]:
    """Extract text from all supported attachments in an email."""
    results: list[AttachmentResult] = []
    supported = {".docx", ".pdf", ".txt"}

    for part in msg.walk():
        disposition = str(part.get("Content-Disposition", ""))
        if "attachment" not in disposition:
            continue

        raw_filename = part.get_filename() or ""
        filename = _decode_mime_header(raw_filename)
        if not filename:
            continue

        suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if suffix not in supported:
            continue

        payload = part.get_payload(decode=True)
        if not payload:
            results.append(AttachmentResult(filename=filename, text="", error="Empty attachment"))
            continue

        try:
            if suffix == ".txt":
                text = payload.decode("utf-8", errors="replace")
            else:
                text = extract_document_text(filename, payload)
            results.append(AttachmentResult(filename=filename, text=text))
        except Exception as exc:
            results.append(AttachmentResult(filename=filename, text="", error=str(exc)))

    return results


# ---------------------------------------------------------------------------
# Risk classification (mirrors logic in main.py)
# ---------------------------------------------------------------------------

def _classify_risk(plagiarism: int, ai_score: int) -> str:
    if plagiarism >= 70 or ai_score >= 75:
        return "high"
    if plagiarism >= 35 or ai_score >= 45:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Core scan logic
# ---------------------------------------------------------------------------

def _scan_text(text: str, db: Session) -> dict:
    """Run one piece of text through plagiarism + AI detection."""
    plagiarism, matched_sentences, source_traces = trace_sources(text, db)
    ai_analysis = analyze_ai_content(text)

    return {
        "plagiarism_score": plagiarism,
        "ai_likeness_score": ai_analysis.score,
        "ai_label": ai_analysis.label,
        "risk": _classify_risk(plagiarism, ai_analysis.score),
        "matched_sentences": matched_sentences,
        "source_traces": [
            {
                "title": t.title,
                "source_type": t.source_type,
                "url": t.url,
                "similarity_percentage": t.similarity_percentage,
                "matched_sentences": t.matched_sentences,
                "sentence_matches": t.sentence_matches,
            }
            for t in source_traces
        ],
    }


def scan_email_inbox(request: EmailScanRequest, db: Session) -> EmailScanResponse:
    """Connect to the lecturer's IMAP inbox, find student emails by subject
    keyword, and return plagiarism + AI scan results for each submission.
    """
    seed_default_sources(db)

    # --- Connect to IMAP server ---
    try:
        mail = imaplib.IMAP4_SSL(request.imap_server, request.imap_port)
    except Exception as exc:
        return EmailScanResponse(
            emails_found=0,
            emails_scanned=0,
            error=f"Could not connect to {request.imap_server}:{request.imap_port} — {exc}",
        )

    try:
        mail.login(request.email_address, request.password)
    except imaplib.IMAP4.error as exc:
        mail.logout()
        return EmailScanResponse(
            emails_found=0,
            emails_scanned=0,
            error=f"Login failed — {exc}. For Gmail use an App Password. "
                  "For Outlook enable IMAP in account settings.",
        )

    try:
        mail.select("INBOX")
    except Exception as exc:
        mail.logout()
        return EmailScanResponse(
            emails_found=0,
            emails_scanned=0,
            error=f"Could not open INBOX — {exc}",
        )

    # --- Search by subject keyword ---
    keyword = request.subject_keyword.strip()
    search_criterion = f'SUBJECT "{keyword}"'
    try:
        status, data = mail.search(None, search_criterion)
    except Exception as exc:
        mail.logout()
        return EmailScanResponse(
            emails_found=0,
            emails_scanned=0,
            error=f"Search failed — {exc}",
        )

    if status != "OK" or not data or not data[0]:
        mail.logout()
        return EmailScanResponse(
            emails_found=0,
            emails_scanned=0,
            error=f"No emails found with subject containing '{keyword}'.",
        )

    email_ids = data[0].split()
    emails_found = len(email_ids)

    # Respect the safety cap and process newest emails first.
    email_ids_to_scan = list(reversed(email_ids))[:request.max_emails]

    results: list[EmailScanResult] = []

    for email_id in email_ids_to_scan:
        try:
            status, msg_data = mail.fetch(email_id, "(RFC822)")
        except Exception:
            continue

        if status != "OK" or not msg_data or not msg_data[0]:
            continue

        raw_bytes = msg_data[0][1]
        if not isinstance(raw_bytes, bytes):
            continue

        msg = email.message_from_bytes(raw_bytes)

        # --- Parse sender ---
        from_header = _decode_mime_header(msg.get("From", ""))
        subject = _decode_mime_header(msg.get("Subject", "(No subject)"))

        # Extract name and email address from "Name <email>" format.
        match = re.match(r"^(.*?)\s*<([^>]+)>", from_header)
        if match:
            student_name = match.group(1).strip().strip('"') or match.group(2)
            student_email = match.group(2).strip()
        else:
            student_email = from_header.strip()
            student_name = student_email

        # --- Extract body text ---
        body_text = _extract_body_text(msg)

        # --- Extract attachment texts ---
        attachments = _extract_attachments(msg)

        # Build a list of (source_label, text) pairs to scan.
        texts_to_scan: list[tuple[str, str]] = []

        if body_text and len(body_text.split()) >= 15:
            texts_to_scan.append(("Email body", body_text))

        for att in attachments:
            if att.error:
                results.append(EmailScanResult(
                    student_email=student_email,
                    student_name=student_name,
                    subject=subject,
                    source=att.filename,
                    text_preview="",
                    plagiarism_score=0,
                    ai_likeness_score=0,
                    ai_label="Unknown",
                    risk="unknown",
                    matched_sentences=[],
                    source_traces=[],
                    error=f"Could not read attachment: {att.error}",
                ))
            elif att.text and len(att.text.split()) >= 15:
                texts_to_scan.append((att.filename, att.text))

        if not texts_to_scan:
            results.append(EmailScanResult(
                student_email=student_email,
                student_name=student_name,
                subject=subject,
                source="—",
                text_preview="",
                plagiarism_score=0,
                ai_likeness_score=0,
                ai_label="Unknown",
                risk="unknown",
                matched_sentences=[],
                source_traces=[],
                error="No scannable text found in this email.",
            ))
            continue

        for source_label, text in texts_to_scan:
            try:
                scan = _scan_text(text[:20000], db)
            except Exception as exc:
                results.append(EmailScanResult(
                    student_email=student_email,
                    student_name=student_name,
                    subject=subject,
                    source=source_label,
                    text_preview=text[:300],
                    plagiarism_score=0,
                    ai_likeness_score=0,
                    ai_label="Error",
                    risk="unknown",
                    matched_sentences=[],
                    source_traces=[],
                    error=f"Scan failed: {exc}",
                ))
                continue

            results.append(EmailScanResult(
                student_email=student_email,
                student_name=student_name,
                subject=subject,
                source=source_label,
                text_preview=text[:300],
                **scan,
            ))

    try:
        mail.logout()
    except Exception:
        pass

    return EmailScanResponse(
        emails_found=emails_found,
        emails_scanned=len(email_ids_to_scan),
        results=results,
    )