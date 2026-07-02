# AI Plagiarism Checker

FastAPI app with login/register and a protected dashboard for checking text against manual references, local source documents, and optionally configured ethical web sources.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Run

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

This starts the FastAPI backend on http://127.0.0.1:8000.

## Frontend

The frontend is a React app in `frontend/`.

For local React development, run the FastAPI backend on port 8000, then start Vite:

```powershell
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 in your browser. Vite proxies API calls to the FastAPI backend.

For production-style serving from FastAPI:

```powershell
cd frontend
npm install
npm run build
cd ..
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000 in your browser.

## System Capabilities

- Modular preprocessing in `backend/preprocessing.py`
- TF-IDF vectorization and cosine similarity in `backend/similarity.py`
- AI-likeness scoring in `backend/ai_detection.py`
- DOCX and PDF text extraction through `/upload-document`
- Local database and configured web-source tracing in `backend/source_tracing.py`
- Downloadable HTML report generation through `/report`
- Benchmark comparison in `backend/evaluation.py`

## Source Tracing

The `/check` endpoint compares submitted text against:

- Text pasted into the dashboard reference box
- Local source documents stored in the database
- URLs listed in `ETHICAL_SOURCE_URLS`, separated by commas
- Online search results from a configured search provider

Protected source APIs:

```powershell
GET /sources
POST /sources
```

The scan response includes `source_traces` and `highlighted_sections` for matched source details and future UI highlighting.

### Online Search Discovery

To automatically discover possible copied online sources, configure one search provider in `.env`:

```powershell
ONLINE_SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=your-key
```

Supported providers are `brave`, `bing`, and `serpapi`. Use `BING_SEARCH_API_KEY` for Bing or `SERPAPI_API_KEY` for SerpAPI.

Optional tuning:

```powershell
ONLINE_SEARCH_MAX_QUERIES=3
ONLINE_SEARCH_RESULTS_PER_QUERY=4
ONLINE_SEARCH_MAX_URLS=8
ONLINE_SOURCE_MAX_PAGE_CHARS=20000
```

When configured, the backend selects strong sentence snippets from the submitted text, searches the web, fetches candidate pages, extracts readable page text, and compares those pages with the existing similarity engine. The dashboard shows suspected sources, links, similarity percentages, and sentence-level submitted/source matches.

## Reports

After running a scan in the dashboard, use **Download report** to generate a self-contained HTML report with:

- Plagiarism, AI-likeness, and risk summary
- AI detection label, confidence, and signals
- Matched sentences and source trace details
- Recommendations, submitted text, and optional reference text

The protected report API accepts the same payload as `/check`:

```powershell
POST /report
```

Open the downloaded HTML file in a browser to print or save it as a PDF.

## Evaluation

Run the built-in benchmark comparison:

```powershell
python scripts/evaluate_benchmark.py
```

Or call the protected API:

```powershell
GET /evaluation
```

## Notes

- Set a strong `SECRET_KEY` environment variable before deploying.
- The AI-likeness checker is a heuristic and should be treated as decision support, not a final academic misconduct judgment.
