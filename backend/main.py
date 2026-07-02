from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .ai_detection import analyze_ai_content
from .auth import get_current_user, get_db, router as auth_router
from .database import Base, engine
from .document_parser import extract_document_text
from .evaluation import evaluate_benchmark
from .models import SourceDocument
from .report_generator import build_html_report
from .word_processor import scan_word_document
from .email_scanner import EmailScanRequest, scan_email_inbox
from .source_tracing import seed_default_sources, trace_sources


# Define the root paths for the application and frontend assets.
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_DIST_DIR = FRONTEND_DIR / "dist"

app = FastAPI(title="AI Plagiarism Checker", version="1.0.0")

# Allow browser requests from any origin during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure database tables are created when the app starts.
Base.metadata.create_all(bind=engine)

# Register authentication routes defined in auth.py.
app.include_router(auth_router)

# Serve static assets from the root /static path if the directory exists.
if (BASE_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST_DIR / "assets"),
        name="frontend-assets",
    )


class CheckRequest(BaseModel):
    """Request payload for plagiarism and AI analysis scans."""
    text: str = Field(min_length=20, max_length=20000)
    reference_text: str | None = Field(default=None, max_length=20000)


class SourceRequest(BaseModel):
    """Request payload for adding a local source document."""
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=50, max_length=20000)
    url: str | None = Field(default=None, max_length=1000)


def highlight_sections(text: str, source_traces) -> list[dict[str, object]]:
    """Create highlight regions from matched source sentences in the submitted text."""
    highlights: list[dict[str, object]] = []
    seen: set[tuple[int, int, str]] = set()

    for trace in source_traces:
        for sentence in trace.matched_sentences:
            start = text.find(sentence)
            if start == -1:
                continue
            end = start + len(sentence)
            key = (start, end, trace.title)
            if key in seen:
                continue
            seen.add(key)
            highlights.append({
                "text": sentence,
                "start": start,
                "end": end,
                "source_title": trace.title,
                "source_type": trace.source_type,
                "similarity_percentage": trace.similarity_percentage,
            })
    return highlights


def analyze_submission(request: CheckRequest, user_email: str, db: Session) -> dict[str, object]:
    """Analyze a submission for plagiarism and AI-likeness and return a structured response."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    seed_default_sources(db)
    plagiarism, matches, source_traces = trace_sources(
        request.text,
        db,
        reference_text=request.reference_text,
    )
    ai_analysis = analyze_ai_content(request.text)
    ai_score = ai_analysis.score

    risk = "low"
    if plagiarism >= 70 or ai_score >= 75:
        risk = "high"
    elif plagiarism >= 35 or ai_score >= 45:
        risk = "medium"

    return {
        "user": user_email,
        "plagiarism_score": plagiarism,
        "ai_likeness_score": ai_score,
        "ai_detection": {
            "label": ai_analysis.label,
            "confidence": ai_analysis.confidence,
            "signals": ai_analysis.signals,
        },
        "risk": risk,
        "matched_sentences": matches,
        "highlighted_sections": highlight_sections(request.text, source_traces),
        "source_traces": [
            {
                "title": trace.title,
                "source_type": trace.source_type,
                "url": trace.url,
                "similarity_percentage": trace.similarity_percentage,
                "matched_sentences": trace.matched_sentences,
                "sentence_matches": trace.sentence_matches,
            }
            for trace in source_traces
        ],
        "recommendations": [
            "Add citations for copied or closely paraphrased ideas.",
            "Rewrite matched sentences in your own voice.",
            "Include source links in the reference text when possible.",
            "Review AI-likeness signals before making any academic misconduct decision.",
        ],
    }


def frontend_entrypoint() -> Path:
    """Return the built React entrypoint, falling back to the source HTML in development."""
    built_index = FRONTEND_DIST_DIR / "index.html"
    if built_index.exists():
        return built_index
    return FRONTEND_DIR / "index.html"


@app.get("/")
def home():
    """Serve the React frontend."""
    return FileResponse(frontend_entrypoint())


@app.get("/login.html")
def login_page():
    """Serve the React frontend for the legacy login URL."""
    return FileResponse(frontend_entrypoint())


@app.get("/login")
def login_route():
    """Serve the React frontend login route."""
    return FileResponse(frontend_entrypoint())


@app.get("/dashboard.html")
def dashboard_page():
    """Serve the React frontend for the legacy dashboard URL."""
    return FileResponse(frontend_entrypoint())


@app.get("/dashboard")
def dashboard_route():
    """Serve the React frontend dashboard route."""
    return FileResponse(frontend_entrypoint())


@app.get("/health")
def health():
    """Health check endpoint for monitoring and readiness."""
    return {"status": "ok"}


@app.get("/sources")
def list_sources(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return all stored source documents available for tracing."""
    seed_default_sources(db)
    sources = db.query(SourceDocument).order_by(SourceDocument.title).all()
    return [
        {
            "id": source.id,
            "title": source.title,
            "source_type": source.source_type,
            "url": source.url,
        }
        for source in sources
    ]


@app.post("/sources")
def create_source(
    request: SourceRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new local source document for comparison."""
    source = SourceDocument(
        title=request.title.strip(),
        source_type="local",
        url=request.url,
        content=request.content.strip(),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return {
        "id": source.id,
        "title": source.title,
        "source_type": source.source_type,
        "url": source.url,
    }


@app.get("/evaluation")
def benchmark_evaluation(user=Depends(get_current_user)):
    """Run a benchmark evaluation of similarity matching logic."""
    return evaluate_benchmark()


@app.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Receive an uploaded document and extract its text content."""
    content = await file.read()
    try:
        extracted_text = extract_document_text(file.filename or "", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not extract readable text from this document.",
        ) from exc

    if len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="The uploaded document does not contain enough readable text.",
        )

    return {
        "filename": file.filename,
        "text": extracted_text[:20000],
        "character_count": len(extracted_text),
    }


@app.post("/check")
def check_plagiarism(
    request: CheckRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze submitted text for plagiarism and AI-likeness."""
    return analyze_submission(request, user.email, db)


@app.post("/report")
def generate_report(
    request: CheckRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return an HTML report for a completed scan."""
    scan = analyze_submission(request, user.email, db)
    html = build_html_report(
        scan=scan,
        submitted_text=request.text,
        reference_text=request.reference_text,
        generated_for=user.email,
    )
    headers = {"Content-Disposition": 'attachment; filename="plagiarism-report.html"'}
    return Response(content=html, media_type="text/html", headers=headers)


class EmailScanPayload(BaseModel):
    imap_server: str = Field(min_length=3, max_length=200)
    imap_port: int = Field(default=993, ge=1, le=65535)
    email_address: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=1, max_length=500)
    subject_keyword: str = Field(min_length=1, max_length=200)
    max_emails: int = Field(default=20, ge=1, le=50)


@app.post("/scan-emails")
def scan_emails(
    payload: EmailScanPayload,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = EmailScanRequest(
        imap_server=payload.imap_server.strip(),
        imap_port=payload.imap_port,
        email_address=payload.email_address.strip(),
        password=payload.password,
        subject_keyword=payload.subject_keyword.strip(),
        max_emails=payload.max_emails,
    )
    response = scan_email_inbox(request, db)
    return {
        "emails_found": response.emails_found,
        "emails_scanned": response.emails_scanned,
        "error": response.error,
        "results": [
            {"student_email":r.student_email,"student_name":r.student_name,
             "subject":r.subject,"source":r.source,"text_preview":r.text_preview,
             "plagiarism_score":r.plagiarism_score,"ai_likeness_score":r.ai_likeness_score,
             "ai_label":r.ai_label,"risk":r.risk,"matched_sentences":r.matched_sentences,
             "source_traces":r.source_traces,"error":r.error}
            for r in response.results
        ],
    }


@app.post("/scan-word")
async def scan_word(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Scan a .docx file paragraph by paragraph and return an annotated .docx."""
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported.")
    docx_bytes = await file.read()
    if len(docx_bytes) < 100:
        raise HTTPException(status_code=400, detail="Uploaded file appears to be empty.")
    result = scan_word_document(docx_bytes, db)
    if result.error:
        raise HTTPException(status_code=422, detail=result.error)
    summary = {
        "high_count": result.high_count,
        "medium_count": result.medium_count,
        "clean_count": result.clean_count,
        "total_scanned": len(result.paragraphs),
        "paragraphs": [
            {"index":p.index,"text":p.text[:200],"plagiarism_score":p.plagiarism_score,
             "ai_score":p.ai_score,"ai_label":p.ai_label,"risk":p.risk,
             "top_source_url":p.top_source_url,"top_source_title":p.top_source_title,
             "top_source_similarity":p.top_source_similarity}
            for p in result.paragraphs
        ],
    }
    import base64
    return {
        "summary": summary,
        "annotated_docx_b64": base64.b64encode(result.annotated_docx_bytes).decode(),
    }