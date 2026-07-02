from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader


SUPPORTED_EXTENSIONS = {".docx", ".pdf"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def extract_text_from_docx(content: bytes) -> str:
    """Extract all readable text from a DOCX document in memory."""
    document = Document(BytesIO(content))
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from every PDF page and concatenate pages with blank lines."""
    reader = PdfReader(BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text.strip())
    return "\n\n".join(pages)


def extract_document_text(filename: str, content: bytes) -> str:
    """Validate file metadata and return extracted text from supported documents."""
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise ValueError(f"Unsupported file type. Upload one of: {supported}")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError("File is too large. Maximum size is 10 MB.")

    if extension == ".docx":
        return extract_text_from_docx(content)
    return extract_text_from_pdf(content)
