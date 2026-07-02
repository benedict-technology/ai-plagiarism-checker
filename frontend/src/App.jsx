import { useEffect, useMemo, useState } from "react";

const API_BASE = window.location.origin;
const emptyResults = {
  plagiarism_score: 0,
  ai_likeness_score: 0,
  risk: "None",
  matched_sentences: ["No scan has been run yet."],
  recommendations: ["Run a scan to see suggestions."],
  source_traces: []
};

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    document: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 3v5h4M10 13h5M10 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    upload: <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    search: <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
    trash: <path d="M3 6h18M8 6V4h8v2m-6 4v7m4-7v7M6 6l1 15h10l1-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (path === "/login.html") return "/login";
  if (path === "/dashboard.html") return "/dashboard";
  return path;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function App() {
  const route = useRoute();

  if (route === "/login") return <LoginPage />;
  if (route === "/dashboard") return <DashboardPage />;
  return <LandingPage />;
}

function Brand({ compact = false }) {
  return (
    <button onClick={() => navigate("/")} className="flex min-w-0 items-center gap-3 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white shadow-sm">
        <Icon name="document" />
      </span>
      <span className={`truncate font-bold tracking-tight ${compact ? "text-base" : "text-base sm:text-lg"}`}>
        AI Plagiarism Checker
      </span>
    </button>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8f4] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/50 bg-[#f6f8f4]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Brand />
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => navigate("/login")} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950">
              Login
            </button>
            <button onClick={() => navigate("/login")} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200">
              Start scan
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative flex min-h-[82vh] items-center overflow-hidden px-4 pb-0 pt-24 sm:px-6 lg:pt-28">
          <div className="absolute inset-0 -z-10">
            <img src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1800&q=80" alt="" className="h-full w-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#f6f8f4] via-[#eef5ee]/92 to-[#f5f7fb]/94" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_520px]">
            <div className="max-w-3xl">
              <p className="reveal-up inline-flex rounded-md border border-emerald-200 bg-white/80 px-3 py-1 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur">
                Source-aware academic review
              </p>
              <h1 className="reveal-up delay-1 mt-5 text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                AI Plagiarism Checker
              </h1>
              <p className="reveal-up delay-2 mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                Compare submissions against reference text, trace matched sentences, review AI-likeness signals, and export clean reports from one protected dashboard.
              </p>
              <div className="reveal-up delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => navigate("/login")} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <span>Open dashboard</span>
                  <Icon name="arrow" />
                </button>
                <a href="#workflow" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white/80 px-6 py-3 text-base font-bold text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white">
                  See workflow
                </a>
              </div>
            </div>

            <PreviewPanel />
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-200 bg-white py-6">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3">
            <WorkflowCard icon="upload" title="Upload or paste" text="Load DOCX/PDF text or paste a draft directly into the scan workspace." tone="emerald" />
            <WorkflowCard icon="search" title="Trace matches" text="Compare against references and local sources with matched sentence summaries." tone="amber" />
            <WorkflowCard icon="document" title="Export reports" text="Download a self-contained report with scores, signals, sources, and recommendations." tone="sky" />
          </div>
        </section>

      </main>
    </div>
  );
}

function PreviewPanel() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[520px] md:block">
      <div className="pulse-ring absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300" />
      <div className="relative overflow-hidden rounded-lg border border-white/80 bg-white/88 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-bold text-slate-500">Live analysis</p>
            <p className="text-xl font-black text-slate-950">Submission scan</p>
          </div>
          <span className="rounded-md bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">Active</span>
        </div>
        <div className="relative mt-5 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="scan-line absolute left-0 right-0 top-4 h-1 bg-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.65)]" />
          <div className="space-y-3">
            {["w-11/12", "w-9/12", "w-10/12", "w-7/12", "w-8/12"].map((width) => (
              <div key={width} className={`h-3 ${width} rounded bg-slate-200`} />
            ))}
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
              <div className="h-3 w-8/12 rounded bg-rose-300" />
              <div className="mt-2 h-3 w-5/12 rounded bg-rose-200" />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="h-3 w-10/12 rounded bg-amber-300" />
              <div className="mt-2 h-3 w-6/12 rounded bg-amber-200" />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MetricCard label="Plagiarism" value="18%" tone="rose" />
          <MetricCard label="AI likeness" value="31%" tone="amber" />
          <MetricCard label="Risk" value="Low" tone="emerald" />
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({ icon, title, text, tone }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    sky: "bg-sky-100 text-sky-800"
  };
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${tones[tone]}`}>
        <Icon name={icon} />
      </div>
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", tone: "slate" });
  const isLogin = mode === "login";

  async function submitAuth(event) {
    event.preventDefault();
    setMessage({ text: "Working...", tone: "slate" });

    const response = await fetch(`${API_BASE}/${isLogin ? "login" : "register"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password })
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      setMessage({ text: data.detail || "Request failed", tone: "red" });
      return;
    }

    if (!isLogin) {
      setMode("login");
      setMessage({ text: "Account created. You can log in now.", tone: "emerald" });
      return;
    }

    localStorage.setItem("access_token", data.access_token);
    navigate("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="grid w-full overflow-hidden rounded-lg bg-white shadow-lg md:grid-cols-[1fr_420px]">
        <div className="bg-emerald-700 p-8 text-white md:p-10">
          <h1 className="text-4xl font-bold tracking-tight">AI Plagiarism Checker</h1>
          <p className="mt-4 max-w-lg text-emerald-50">Check writing against reference material, review matched sentences, and keep dashboard access protected with account login.</p>
          <div className="mt-8 grid gap-3 text-sm text-emerald-50">
            <p>Secure email registration</p>
            <p>Protected dashboard and scan endpoint</p>
            <p>Plagiarism and AI-likeness risk summary</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-md bg-slate-100 p-1">
            <button type="button" onClick={() => setMode("login")} className={tabClass(isLogin)}>Login</button>
            <button type="button" onClick={() => setMode("register")} className={tabClass(!isLogin)}>Register</button>
          </div>

          <form className="space-y-4" onSubmit={submitAuth}>
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete={isLogin ? "current-password" : "new-password"} minLength={8} />
            <button type="submit" className="w-full rounded-md bg-emerald-700 p-3 font-semibold text-white hover:bg-emerald-800">
              {isLogin ? "Login" : "Create account"}
            </button>
          </form>

          <p className={`mt-4 min-h-6 text-center text-sm ${messageTone(message.tone)}`}>{message.text}</p>
        </div>
      </section>
    </main>
  );
}

function DashboardPage() {
  const [token] = useState(() => localStorage.getItem("access_token"));
  const [userEmail, setUserEmail] = useState("Loading account...");
  const [activeTab, setActiveTab] = useState("document");
  const [text, setText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [message, setMessage] = useState({ text: "", tone: "slate" });
  const [results, setResults] = useState(emptyResults);
  const [latestReportPayload, setLatestReportPayload] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [emailForm, setEmailForm] = useState({
    imap_server: "", imap_port: "993", email_address: "",
    password: "", subject_keyword: "", max_emails: "20",
  });
  const [emailScanResults, setEmailScanResults] = useState(null);
  const [isEmailScanning, setIsEmailScanning] = useState(false);
  const [emailMessage, setEmailMessage] = useState({ text: "", tone: "slate" });

  // Word processor state
  const [wordFile, setWordFile] = useState(null);
  const [wordScanResult, setWordScanResult] = useState(null);
  const [isWordScanning, setIsWordScanning] = useState(false);
  const [wordMessage, setWordMessage] = useState({ text: "", tone: "slate" });

  const fetchWithAuth = useMemo(() => async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (response.status === 401 || response.status === 403) logout();
    return response;
  }, [token]);

  useEffect(() => {
    if (!token) {
      logout();
      return;
    }

    fetchWithAuth("/me")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setUserEmail(data.email);
      })
      .catch(() => setUserEmail("Account unavailable"));
  }, [fetchWithAuth, token]);

  function logout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  function clearDocumentText() {
    setText("");
    setLatestReportPayload(null);
    setMessage({ text: "Document text cleared.", tone: "slate" });
  }

  async function uploadDocument(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setMessage({ text: "Extracting document text...", tone: "slate" });

    const response = await fetch(`${API_BASE}/upload-document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await readJsonResponse(response);
    event.target.value = "";

    if (!response.ok) {
      setMessage({ text: data.detail || "Document upload failed", tone: "red" });
      return;
    }

    setText(data.text);
    setMessage({ text: `Loaded ${data.filename} (${data.character_count} characters).`, tone: "emerald" });
  }

  async function runScan(event) {
    event.preventDefault();
    setIsScanning(true);
    setLatestReportPayload(null);
    setMessage({ text: "Analyzing text...", tone: "slate" });

    const payload = { text, reference_text: referenceText || null };
    const response = await fetchWithAuth("/check", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const data = await readJsonResponse(response);
    setIsScanning(false);

    if (!response.ok) {
      setMessage({ text: data.detail || "Scan failed", tone: "red" });
      return;
    }

    setResults({
      ...data,
      matched_sentences: data.matched_sentences?.length ? data.matched_sentences : ["No close matches found."],
      recommendations: data.recommendations?.length ? data.recommendations : ["No recommendations."],
      source_traces: data.source_traces?.length ? data.source_traces : []
    });
    setLatestReportPayload(payload);
    setMessage({ text: "Scan complete.", tone: "emerald" });
  }

  async function downloadReport() {
    if (!latestReportPayload) return;
    setIsReporting(true);
    setMessage({ text: "Generating report...", tone: "slate" });

    const response = await fetchWithAuth("/report", {
      method: "POST",
      body: JSON.stringify(latestReportPayload)
    });
    setIsReporting(false);

    if (!response.ok) {
      const data = await readJsonResponse(response);
      setMessage({ text: data.detail || "Report generation failed", tone: "red" });
      return;
    }

    const reportBlob = await response.blob();
    const reportUrl = URL.createObjectURL(reportBlob);
    const downloadLink = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadLink.href = reportUrl;
    downloadLink.download = `plagiarism-report-${timestamp}.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(reportUrl);
    setMessage({ text: "Report downloaded.", tone: "emerald" });
  }


  async function runEmailScan(event) {
    event.preventDefault();
    setIsEmailScanning(true);
    setEmailMessage({ text: "Connecting to inbox...", tone: "slate" });
    setEmailScanResults(null);
    try {
      const response = await fetchWithAuth("/scan-emails", {
        method: "POST",
        body: JSON.stringify({
          imap_server: emailForm.imap_server.trim(),
          imap_port: parseInt(emailForm.imap_port) || 993,
          email_address: emailForm.email_address.trim(),
          password: emailForm.password,
          subject_keyword: emailForm.subject_keyword.trim(),
          max_emails: parseInt(emailForm.max_emails) || 20,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setEmailMessage({ text: data.detail || "Scan failed.", tone: "rose" });
        return;
      }
      if (data.error) {
        setEmailMessage({ text: data.error, tone: "rose" });
        return;
      }
      setEmailScanResults(data);
      setEmailMessage({
        text: `Found ${data.emails_found} email(s), scanned ${data.emails_scanned}. ${data.results.length} result(s) returned.`,
        tone: "emerald",
      });
    } catch (err) {
      setEmailMessage({ text: "Network error — is the backend running?", tone: "rose" });
    } finally {
      setIsEmailScanning(false);
    }
  }

  function updateEmailForm(field, value) {
    setEmailForm(prev => ({ ...prev, [field]: value }));
  }

  function clearEmailScan() {
    setEmailScanResults(null);
    setEmailMessage({ text: "Email scan cleared.", tone: "slate" });
  }

  async function runWordScan(event) {
    event.preventDefault();
    if (!wordFile) { setWordMessage({ text: "Please select a .docx file.", tone: "rose" }); return; }
    setIsWordScanning(true);
    setWordScanResult(null);
    setWordMessage({ text: "Scanning document paragraphs...", tone: "slate" });
    try {
      const formData = new FormData();
      formData.append("file", wordFile);
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/scan-word`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setWordMessage({ text: data.detail || "Scan failed.", tone: "rose" });
        return;
      }
      setWordScanResult(data);
      const s = data.summary;
      setWordMessage({
        text: `Scan complete — ${s.total_scanned} paragraph(s) scanned. High: ${s.high_count} | Medium: ${s.medium_count} | Clean: ${s.clean_count}`,
        tone: "emerald",
      });
    } catch (err) {
      setWordMessage({ text: "Network error — is the backend running?", tone: "rose" });
    } finally {
      setIsWordScanning(false);
    }
  }

  function downloadAnnotatedDocx() {
    if (!wordScanResult?.annotated_docx_b64) return;
    const binary = atob(wordScanResult.annotated_docx_b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    a.href = url; a.download = `annotated-${wordFile?.name || "document"}-${ts}.docx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function clearWordScan() {
    setWordScanResult(null); setWordFile(null);
    setWordMessage({ text: "Cleared.", tone: "slate" });
  }

  function downloadEmailReport() {
    if (!emailScanResults || !emailScanResults.results.length) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const results = emailScanResults.results;

    const riskColor = r => r === "high" ? "#fee2e2" : r === "medium" ? "#fef3c7" : "#d1fae5";
    const riskText = r => r === "high" ? "#991b1b" : r === "medium" ? "#92400e" : "#065f46";

    const rows = results.map(r => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;font-family:sans-serif;">
        <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:700;font-size:15px;">${r.student_name || r.student_email}</div>
            <div style="color:#64748b;font-size:12px;">${r.student_email}</div>
            <div style="color:#94a3b8;font-size:12px;">Subject: ${r.subject}</div>
            <div style="color:#3b82f6;font-size:12px;">Source: ${r.source}</div>
          </div>
          <div style="text-align:right;">
            <span style="background:${riskColor(r.risk)};color:${riskText(r.risk)};padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;">${(r.risk||"unknown").toUpperCase()} RISK</span>
            <div style="margin-top:6px;font-size:12px;color:#be123c;">Plagiarism: <strong>${r.plagiarism_score}%</strong></div>
            <div style="font-size:12px;color:#b45309;">AI Likeness: <strong>${r.ai_likeness_score}%</strong> · ${r.ai_label}</div>
          </div>
        </div>
        ${r.error ? `<div style="padding:12px 18px;color:#dc2626;font-size:13px;">${r.error}</div>` : ""}
        ${r.text_preview ? `<div style="padding:12px 18px;background:#f8fafc;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569;">${r.text_preview}</div>` : ""}
        ${(r.source_traces||[]).length > 0 ? `
          <div style="padding:12px 18px;">
            <div style="font-weight:600;font-size:13px;margin-bottom:8px;">Source Traces</div>
            ${r.source_traces.map(t => `
              <div style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;font-weight:600;">${t.title}</span>
                  <span style="font-size:12px;font-weight:700;color:#be123c;">${t.similarity_percentage}% match</span>
                </div>
                ${t.url ? `
                  <div style="margin-top:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:8px 12px;">
                    <div style="font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;margin-bottom:4px;">Source URL (Proof)</div>
                    <a href="${t.url}" style="font-size:12px;color:#1d4ed8;word-break:break-all;">${t.url}</a>
                  </div>` : ""}
              </div>`).join("")}
          </div>` : ""}
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Email Scan Report - ${timestamp}</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:sans-serif;">
  <div style="max-width:800px;margin:0 auto;">
    <div style="background:#1e293b;color:white;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:20px;">✉️ Email Scan Report</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Generated: ${new Date().toLocaleString()} · ${results.length} submission(s) scanned</p>
    </div>
    ${rows}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-scan-report-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Brand compact />
            <p className="hidden truncate text-sm text-slate-500 sm:block">{userEmail}</p>
          </div>
          <button onClick={logout} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300">
            Logout
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-1 pt-2">
            <button
              onClick={() => setActiveTab("document")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-b-2 transition ${activeTab === "document" ? "border-emerald-600 text-emerald-700 bg-emerald-50" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              📄 Document Scan
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-b-2 transition ${activeTab === "email" ? "border-blue-600 text-blue-700 bg-blue-50" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              ✉️ Email Scanner
            </button>
            <button
              onClick={() => setActiveTab("word")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-md border-b-2 transition ${activeTab === "word" ? "border-purple-600 text-purple-700 bg-purple-50" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              📝 Word Processor
            </button>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Document Scan Tab ── */}
        {activeTab === "document" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h1 className="text-lg font-bold tracking-tight">Document Scan</h1>
                <p className="mt-1 text-sm text-slate-500">Paste text or load a DOCX/PDF, then compare it with sources.</p>
              </div>
              <form className="space-y-4" onSubmit={runScan}>
                <div className="px-5 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <label htmlFor="text" className="block text-sm font-semibold text-slate-700">Text to check</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={clearDocumentText} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200">
                        <Icon name="trash" className="h-4 w-4" />
                        <span>Clear</span>
                      </button>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-within:ring-2 focus-within:ring-emerald-200">
                        <Icon name="upload" className="h-4 w-4" />
                        <span>Upload DOCX/PDF</span>
                        <input type="file" className="sr-only" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadDocument} />
                      </label>
                    </div>
                  </div>
                  <textarea id="text" rows="13" className="mt-3 w-full resize-y rounded-md border border-slate-300 bg-white p-4 text-sm leading-6 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" required minLength={20} placeholder="Paste the assignment, article, or paragraph you want to check." value={text} onChange={(event) => setText(event.target.value)} />
                </div>
                <div className="px-5">
                  <label htmlFor="referenceText" className="block text-sm font-semibold text-slate-700">Reference text</label>
                  <textarea id="referenceText" rows="7" className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white p-4 text-sm leading-6 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Paste source material to compare against." value={referenceText} onChange={(event) => setReferenceText(event.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <button type="submit" disabled={isScanning} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-70">
                    <Icon name="search" className="h-4 w-4" />
                    <span>{isScanning ? "Analysing (may take ~15s)..." : "Run scan"}</span>
                  </button>
                  <p className={`min-h-6 text-sm ${messageTone(message.tone)}`}>{message.text}</p>
                </div>
              </form>
            </section>
            <aside className="space-y-4">
              <ResultsPanel results={results} canDownload={Boolean(latestReportPayload) && !isReporting} isReporting={isReporting} onDownload={downloadReport} />
              <SourceTracesPanel traces={results.source_traces} />
              <ListPanel title="Matched sentences" items={results.matched_sentences} />
              <ListPanel title="Recommendations" items={results.recommendations} marker />
            </aside>
          </div>
        )}

        {/* ── Email Scanner Tab ── */}
        {activeTab === "email" && (
          <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">

            {/* Left: Connection form */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm self-start">
              <div className="border-b border-slate-100 px-5 py-4">
                <h1 className="text-lg font-bold tracking-tight">✉️ Email Scanner</h1>
                <p className="mt-1 text-sm text-slate-500">Connect your inbox and scan student emails by subject keyword.</p>
              </div>
              <form className="space-y-4 p-5" onSubmit={runEmailScan}>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">IMAP Server</label>
                  <input type="text" required placeholder="e.g. imap.gmail.com" value={emailForm.imap_server}
                    onChange={e => updateEmailForm("imap_server", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <p className="mt-1 text-xs text-slate-400">Gmail: imap.gmail.com · Outlook: outlook.office365.com · Yahoo: imap.mail.yahoo.com</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">IMAP Port</label>
                    <input type="number" required value={emailForm.imap_port}
                      onChange={e => updateEmailForm("imap_port", e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Max emails</label>
                    <input type="number" min="1" max="50" value={emailForm.max_emails}
                      onChange={e => updateEmailForm("max_emails", e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input type="email" required placeholder="lecturer@university.edu.gh" value={emailForm.email_address}
                    onChange={e => updateEmailForm("email_address", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password / App Password</label>
                  <input type="password" required placeholder="Use an App Password for Gmail/Outlook" value={emailForm.password}
                    onChange={e => updateEmailForm("password", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <p className="mt-1 text-xs text-slate-400">Gmail/Outlook require an App Password — not your normal password.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Subject Keyword Filter</label>
                  <input type="text" required placeholder='e.g. Assignment 1, Final Project' value={emailForm.subject_keyword}
                    onChange={e => updateEmailForm("subject_keyword", e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <p className="mt-1 text-xs text-slate-400">Only emails whose subject contains this keyword will be scanned.</p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <button type="submit" disabled={isEmailScanning}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70">
                    <span>{isEmailScanning ? "Scanning inbox..." : "Scan Inbox"}</span>
                  </button>
                  {emailMessage.text && (
                    <p className={`mt-3 text-sm ${messageTone(emailMessage.tone)}`}>{emailMessage.text}</p>
                  )}
                </div>
              </form>
            </section>

            {/* Right: Results */}
            <section className="space-y-4">

              {/* Action bar — only shown when results exist */}
              {emailScanResults && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{emailScanResults.results.length}</span> result(s) from{" "}
                    <span className="font-bold text-slate-900">{emailScanResults.emails_scanned}</span> email(s) scanned
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearEmailScan}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                    >
                      🗑 Clear results
                    </button>
                    <button
                      type="button"
                      onClick={downloadEmailReport}
                      disabled={!emailScanResults.results.length}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ⬇ Download report
                    </button>
                  </div>
                </div>
              )}

              {!emailScanResults && !isEmailScanning && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
                  <p className="text-4xl mb-3">✉️</p>
                  <p className="font-semibold">No email scan run yet.</p>
                  <p className="mt-1 text-sm">Fill in the form and click Scan Inbox to begin.</p>
                </div>
              )}
              {isEmailScanning && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-8 text-center text-blue-700">
                  <div className="flex justify-center gap-1.5 mb-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
                    ))}
                  </div>
                  <p className="font-semibold">Scanning inbox...</p>
                  <p className="mt-1 text-sm opacity-75">Fetching emails · Extracting text · Checking sources in parallel</p>
                </div>
              )}
              {emailScanResults && emailScanResults.results.map((result, i) => (
                <EmailResultCard key={i} result={result} />
              ))}
            </section>
          </div>
        )}

        {/* ── Word Processor Tab ── */}
        {activeTab === "word" && (
          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">

            {/* Left: Upload form */}
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm self-start">
              <div className="border-b border-slate-100 px-5 py-4">
                <h1 className="text-lg font-bold tracking-tight">📝 Word Processor Scanner</h1>
                <p className="mt-1 text-sm text-slate-500">Upload a .docx file to scan each paragraph for plagiarism and AI content. Download an annotated copy with colour-coded highlights and source comments.</p>
              </div>
              <form className="space-y-4 p-5" onSubmit={runWordScan}>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select .docx file</label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-purple-200 bg-purple-50 px-4 py-8 text-center transition hover:border-purple-400 hover:bg-purple-100">
                    <span className="text-3xl">📄</span>
                    <span className="text-sm font-semibold text-purple-700">
                      {wordFile ? wordFile.name : "Click to choose a .docx file"}
                    </span>
                    {wordFile && (
                      <span className="text-xs text-slate-400">
                        {(wordFile.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={e => { setWordFile(e.target.files[0] || null); setWordScanResult(null); setWordMessage({text:"",tone:"slate"}); }}
                    />
                  </label>
                </div>

                <div className="rounded-md border border-purple-100 bg-purple-50 p-3 text-xs text-purple-700 space-y-1">
                  <p className="font-bold">What the annotated output includes:</p>
                  <p>🔴 Red highlight = High risk (plagiarism ≥70% or AI ≥75%)</p>
                  <p>🟡 Yellow highlight = Medium risk (plagiarism ≥35% or AI ≥45%)</p>
                  <p>🟢 Green highlight = Clean paragraph</p>
                  <p>💬 Word comments show the source URL as proof</p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <button type="submit" disabled={isWordScanning || !wordFile}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-purple-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50">
                    <span>{isWordScanning ? "Scanning paragraphs..." : "Scan Document"}</span>
                  </button>
                  {wordMessage.text && (
                    <p className={`text-sm ${messageTone(wordMessage.tone)}`}>{wordMessage.text}</p>
                  )}
                </div>
              </form>
            </section>

            {/* Right: Results */}
            <section className="space-y-4">

              {!wordScanResult && !isWordScanning && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
                  <p className="text-4xl mb-3">📝</p>
                  <p className="font-semibold">No document scanned yet.</p>
                  <p className="mt-1 text-sm">Upload a .docx file and click Scan Document to begin.</p>
                </div>
              )}

              {isWordScanning && (
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-8 text-center text-purple-700">
                  <div className="flex justify-center gap-1.5 mb-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />
                    ))}
                  </div>
                  <p className="font-semibold">Scanning paragraphs...</p>
                  <p className="mt-1 text-sm opacity-75">Each paragraph is checked for plagiarism and AI content in parallel</p>
                </div>
              )}

              {wordScanResult && (
                <>
                  {/* Summary + action bar */}
                  <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-3">
                        <span className="rounded-md bg-rose-50 border border-rose-200 px-3 py-1.5 text-sm font-bold text-rose-700">🔴 High risk: {wordScanResult.summary.high_count}</span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-bold text-amber-700">🟡 Medium: {wordScanResult.summary.medium_count}</span>
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-bold text-emerald-700">🟢 Clean: {wordScanResult.summary.clean_count}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={clearWordScan}
                          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 transition">
                          🗑 Clear
                        </button>
                        <button onClick={downloadAnnotatedDocx}
                          className="rounded-md bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 transition">
                          ⬇ Download annotated .docx
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Paragraph results */}
                  <div className="space-y-3">
                    {wordScanResult.summary.paragraphs.map((para, i) => (
                      <article key={i} className={`rounded-lg border shadow-sm overflow-hidden ${
                        para.risk === "high" ? "border-rose-200 bg-rose-50" :
                        para.risk === "medium" ? "border-amber-200 bg-amber-50" :
                        "border-emerald-200 bg-emerald-50"
                      }`}>
                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-wide mb-1 ${
                              para.risk === 'high' ? 'text-rose-500' :
                              para.risk === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                            }">Paragraph {para.index + 1}</p>
                            <p className="text-sm text-slate-700 leading-5">{para.text}</p>
                          </div>
                          <div className="shrink-0 text-right space-y-1">
                            <div className="text-xs font-bold text-rose-700">Plagiarism: {para.plagiarism_score}%</div>
                            <div className="text-xs font-bold text-amber-700">AI: {para.ai_score}% · {para.ai_label}</div>
                          </div>
                        </div>
                        {para.top_source_url && (
                          <div className="border-t border-white/50 bg-white/60 px-4 py-2">
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-0.5">Source proof</p>
                            <a href={para.top_source_url} target="_blank" rel="noreferrer"
                              className="text-xs font-semibold text-blue-700 underline underline-offset-2 break-all hover:text-blue-900">
                              {para.top_source_url}
                            </a>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}


      </main>
    </div>
  );
}

function ResultsPanel({ results, canDownload, isReporting, onDownload }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Results</h2>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Live</span>
      </div>
      <dl className="mt-4 grid gap-3">
        <MetricBlock label="Plagiarism" value={`${results.plagiarism_score}%`} tone="rose" />
        <MetricBlock label="AI likeness" value={`${results.ai_likeness_score}%`} tone="amber" />
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-4">
          <dt className="text-sm font-medium text-slate-600">Risk</dt>
          <dd className="rounded-md bg-white px-3 py-1 text-sm font-bold uppercase text-slate-700 shadow-sm">{results.risk}</dd>
        </div>
      </dl>
      <button type="button" onClick={onDownload} disabled={!canDownload} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
        <Icon name="document" className="h-4 w-4" />
        <span>{isReporting ? "Building report..." : "Download report"}</span>
      </button>
    </section>
  );
}

function sourceTypeBadgeStyle(source_type) {
  if (source_type === "online_search") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (source_type === "ethical_web") return "bg-purple-50 text-purple-700 border border-purple-200";
  if (source_type === "manual_reference") return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function sourceTypeLabel(source_type) {
  if (source_type === "online_search") return "🌐 Web source";
  if (source_type === "ethical_web") return "🔗 Configured web";
  if (source_type === "manual_reference") return "📋 Manual reference";
  return "📁 Local source";
}

function similarityColor(pct) {
  if (pct >= 70) return "bg-rose-100 text-rose-700 border border-rose-200";
  if (pct >= 35) return "bg-amber-100 text-amber-700 border border-amber-200";
  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
}

function SourceTracesPanel({ traces = [] }) {
  const webSources = traces.filter(t => t.url);
  const localSources = traces.filter(t => !t.url);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Source traces</h2>
        <div className="flex items-center gap-2">
          {webSources.length > 0 && (
            <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {webSources.length} web
            </span>
          )}
          {localSources.length > 0 && (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {localSources.length} local
            </span>
          )}
        </div>
      </div>

      {traces.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">Run a scan to see suspected online or local sources.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {traces.map((trace, index) => (
            <article key={`${trace.title}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-4">

              {/* Header row: title + similarity badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-bold text-slate-900 leading-5">
                    {trace.title || "Untitled source"}
                  </h3>
                  <span className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${sourceTypeBadgeStyle(trace.source_type)}`}>
                    {sourceTypeLabel(trace.source_type)}
                  </span>
                </div>
                <span className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-bold shadow-sm ${similarityColor(trace.similarity_percentage || 0)}`}>
                  {trace.similarity_percentage || 0}% match
                </span>
              </div>

              {/* URL proof link — prominent when available */}
              {trace.url ? (
                <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-1">Source URL (proof)</p>
                  <a
                    href={trace.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                  >
                    {trace.url}
                  </a>
                  <a
                    href={trace.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition"
                  >
                    Open source ↗
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400 italic">No external URL — local database source.</p>
              )}

              <SentenceMatches matches={trace.sentence_matches || []} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SentenceMatches({ matches }) {
  if (!matches.length) {
    return <p className="mt-3 text-sm text-slate-600">No sentence-level comparison available for this source.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {matches.slice(0, 3).map((match, index) => (
        <div key={`${match.submitted_sentence}-${index}`} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 inline-flex rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
            {match.similarity_percentage || 0}% sentence match
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Submitted</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">{match.submitted_sentence}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Source</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{match.source_sentence}</p>
        </div>
      ))}
    </div>
  );
}

function MetricBlock({ label, value, tone }) {
  const tones = {
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700"
  };
  const valueTones = {
    rose: "text-rose-950",
    amber: "text-amber-950"
  };
  return (
    <div className={`rounded-md border p-4 ${tones[tone]}`}>
      <dt className="text-sm font-medium">{label}</dt>
      <dd className={`mt-1 text-3xl font-bold ${valueTones[tone]}`}>{value}</dd>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  const tones = {
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700"
  };
  const values = {
    rose: "text-rose-950",
    amber: "text-amber-950",
    emerald: "text-emerald-950"
  };
  return (
    <div className={`float-soft rounded-md border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-black ${values[tone]}`}>{value}</p>
    </div>
  );
}

function ListPanel({ title, items, marker = false }) {
  const className = marker
    ? "mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 marker:text-emerald-600"
    : "mt-3 space-y-2 text-sm leading-6 text-slate-700";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <ul className={className}>
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}

function formatSourceType(sourceType = "") {
  return sourceType.replace(/_/g, " ") || "unknown";
}

function Field({ label, value, onChange, ...props }) {
  const id = label.toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" required {...props} />
    </div>
  );
}

function riskBadge(risk) {
  if (risk === "high") return "bg-rose-100 text-rose-700 border border-rose-200";
  if (risk === "medium") return "bg-amber-100 text-amber-700 border border-amber-200";
  if (risk === "low") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-500 border border-slate-200";
}

function EmailResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const hasError = Boolean(result.error);

  return (
    <article className={`rounded-lg border shadow-sm overflow-hidden ${hasError ? "border-slate-200 bg-white" : "border-slate-200 bg-white"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{result.student_name || result.student_email}</p>
          <p className="text-xs text-slate-500 truncate">{result.student_email}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">Subject: {result.subject}</p>
          <p className="text-xs text-blue-600 mt-0.5">Source: {result.source}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!hasError && (
            <>
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${riskBadge(result.risk)}`}>
                {(result.risk || "unknown").toUpperCase()} RISK
              </span>
              <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-700">
                Plagiarism {result.plagiarism_score}%
              </span>
              <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                AI {result.ai_likeness_score}% · {result.ai_label}
              </span>
            </>
          )}
          {hasError && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Error</span>
          )}
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <p className="px-5 py-3 text-sm text-rose-600">{result.error}</p>
      )}

      {/* Text preview */}
      {!hasError && result.text_preview && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Text preview</p>
          <p className="text-xs text-slate-600 leading-5 line-clamp-3">{result.text_preview}</p>
        </div>
      )}

      {/* Source traces */}
      {!hasError && result.source_traces && result.source_traces.length > 0 && (
        <div className="px-5 py-3">
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-blue-700 hover:underline">
            {expanded ? "▲ Hide" : "▼ Show"} {result.source_traces.length} source trace(s)
          </button>
          {expanded && (
            <div className="mt-3 space-y-3">
              {result.source_traces.map((trace, i) => (
                <div key={i} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-800 break-words">{trace.title}</p>
                    <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {trace.similarity_percentage}%
                    </span>
                  </div>
                  {trace.url && (
                    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-1">Source URL (proof)</p>
                      <a href={trace.url} target="_blank" rel="noreferrer"
                        className="block break-all text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                        {trace.url}
                      </a>
                      <a href={trace.url} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800 transition">
                        Open source ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasError && (!result.source_traces || result.source_traces.length === 0) && (
        <p className="px-5 py-3 text-xs text-slate-400">No matching sources found.</p>
      )}
    </article>
  );
}

function tabClass(active) {
  return active
    ? "rounded bg-white px-3 py-2 text-sm font-semibold shadow"
    : "rounded px-3 py-2 text-sm font-semibold text-slate-600";
}

function messageTone(tone) {
  return {
    emerald: "text-emerald-700",
    red: "text-red-600",
    slate: "text-slate-600"
  }[tone] || "text-slate-600";
}

export default App;