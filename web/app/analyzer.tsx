"use client";

import { FormEvent, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

type User = { id: string; email: string };
type Resume = { id: string; name: string; created_at: string };
type Job = {
  id: string;
  title: string;
  company: string | null;
  description: string;
  url: string | null;
  created_at: string;
};
type Requirement = {
  requirement: string;
  classification: "Strong Match" | "Partial Match" | "No Evidence";
  similarity: number;
  supporting_evidence: string | null;
  explanation: string;
};
type Analysis = {
  id?: string;
  overall_compatibility: number;
  requirements: Requirement[];
  model: string;
  scoring: {
    version: string;
    strong_match_threshold: number;
    partial_match_threshold: number;
  };
};
type Summary = {
  id: string;
  resume_id: string;
  job_id: string;
  overall_compatibility: number;
  model: string;
  scoring: Analysis["scoring"];
  created_at: string;
};
type Billing = {
  plan: string;
  status: string;
  analyses_used: number;
  analyses_limit: number | null;
};

const badgeStyles = {
  "Strong Match": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Partial Match": "border-amber-200 bg-amber-50 text-amber-800",
  "No Evidence": "border-slate-200 bg-slate-100 text-slate-700",
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const payload: unknown = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? payload.detail
        : "The request could not be completed.";
    throw new Error(typeof detail === "string" ? detail : "The request could not be completed.");
  }
  return payload as T;
}

export default function Analyzer() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [analyses, setAnalyses] = useState<Summary[]>([]);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [selectedResume, setSelectedResume] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshWorkspace() {
    const [me, resumeList, jobList, analysisList, billingState] = await Promise.all([
      api<User>("/auth/me"),
      api<Resume[]>("/resumes"),
      api<Job[]>("/jobs"),
      api<Summary[]>("/analyses"),
      api<Billing>("/billing"),
    ]);
    setUser(me);
    setResumes(resumeList);
    setJobs(jobList);
    setAnalyses(analysisList);
    setBilling(billingState);
    setSelectedResume((current) => current || resumeList[0]?.id || "");
    setSelectedJob((current) => current || jobList[0]?.id || "");
  }

  useEffect(() => {
    async function hydrateSession() {
      try {
        await refreshWorkspace();
      } catch {
        // An anonymous visitor sees the sign-in surface.
      }
    }
    void hydrateSession();
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api<User>(`/auth/${authMode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refreshWorkspace();
      setPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await api<void>("/auth/logout", { method: "POST" });
    setUser(null);
    setAnalysis(null);
    setResumes([]);
    setJobs([]);
    setAnalyses([]);
  }

  async function uploadResume(event: FormEvent) {
    event.preventDefault();
    if (!resumeFile) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", resumeFile);
      await api<Resume>("/resumes", { method: "POST", body });
      setResumeFile(null);
      await refreshWorkspace();
      setNotice("Resume uploaded securely for this workspace.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Resume upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createJob(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api<Job>("/jobs", {
        method: "POST",
        body: JSON.stringify({ title, company: company || null, description, url: null }),
      });
      setTitle("");
      setCompany("");
      setDescription("");
      await refreshWorkspace();
      setNotice("Job saved to your private workspace.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Job creation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis(event: FormEvent) {
    event.preventDefault();
    if (!selectedResume || !selectedJob) {
      setError("Upload a resume and save a job before analyzing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const summary = await api<Summary>("/analyses", {
        method: "POST",
        body: JSON.stringify({ resume_id: selectedResume, job_id: selectedJob }),
      });
      setAnalysis(await api<Analysis>(`/analyses/${summary.id}`));
      await refreshWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function openAnalysis(id: string) {
    setLoading(true);
    try {
      setAnalysis(await api<Analysis>(`/analyses/${id}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout() {
    try {
      const checkout = await api<{ url: string }>("/billing/checkout", { method: "POST" });
      window.location.assign(checkout.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Billing is unavailable.");
    }

  }

  async function deleteResource(path: string, message: string) {
    try {
      await api<void>(path, { method: "DELETE" });
      await refreshWorkspace();
      setNotice(message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Delete failed.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <header className="border-b border-slate-200/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">J</span>
            <span className="text-lg font-semibold tracking-tight">JobFit</span>
          </div>
          {user ? (
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{user.email}</span>
              <button onClick={logout} className="font-semibold text-slate-950 underline underline-offset-4">Log out</button>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Private career workspace</span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-14 lg:px-10 lg:pt-20">
        <section className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Evidence-based job alignment</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">A clearer view of how your experience fits.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">JobFit compares your actual resume evidence with a role, saves the explanation in your private workspace, and never presents alignment as a hiring prediction.</p>
        </section>

        {!user ? (
          <form onSubmit={authenticate} className="mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex gap-5 border-b border-slate-200 pb-4 text-sm">
              <button type="button" onClick={() => setAuthMode("login")} className={authMode === "login" ? "font-semibold text-slate-950" : "text-slate-500"}>Log in</button>
              <button type="button" onClick={() => setAuthMode("signup")} className={authMode === "signup" ? "font-semibold text-slate-950" : "text-slate-500"}>Create account</button>
            </div>
            <label className="mt-6 block text-sm font-semibold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="mt-4 block text-sm font-semibold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
            <button disabled={loading} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading ? "Working..." : authMode === "login" ? "Log in" : "Create private workspace"}</button>
          </form>
        ) : (
          <section className="mt-12 space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={uploadResume} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-xl font-semibold">Resume library</h2>
                <p className="mt-2 text-sm text-slate-500">PDF only, maximum 5 MB. Text is extracted server-side and scoped to your account.</p>
                <input required type="file" accept="application/pdf,.pdf" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} className="mt-6 block w-full text-sm" />
                <button disabled={loading || !resumeFile} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Upload resume</button>
                {resumes.length > 0 && <div className="mt-4 space-y-2">{resumes.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-600"><span className="truncate">{item.name}</span><button type="button" onClick={() => deleteResource(`/resumes/${item.id}`, "Resume deleted.")} className="text-xs font-semibold text-rose-700 underline underline-offset-2">Delete</button></div>)}</div>}
              </form>
              <form onSubmit={createJob} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-xl font-semibold">Save a job</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input required placeholder="Job title" value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <input placeholder="Company (optional)" value={company} onChange={(event) => setCompany(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                </div>
                <textarea required rows={5} placeholder="Paste the full job description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                <button disabled={loading} className="mt-3 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Save job</button>
                {jobs.length > 0 && <div className="mt-4 space-y-2">{jobs.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-600"><span className="truncate">{item.title}</span><button type="button" onClick={() => deleteResource(`/jobs/${item.id}`, "Job deleted.")} className="text-xs font-semibold text-rose-700 underline underline-offset-2">Delete</button></div>)}</div>}
              </form>
            </div>

            <form onSubmit={runAnalysis} className="rounded-2xl bg-slate-950 p-7 text-white">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div><h2 className="text-xl font-semibold">Run an analysis</h2><p className="mt-2 text-sm text-slate-300">Your free plan includes {billing?.analyses_limit ?? 5} analyses per month.</p></div>
                <button type="button" onClick={startCheckout} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold hover:border-white">Upgrade to Pro</button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <select required value={selectedResume} onChange={(event) => setSelectedResume(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"><option value="">Select resume</option>{resumes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select required value={selectedJob} onChange={(event) => setSelectedJob(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"><option value="">Select job</option>{jobs.map((item) => <option key={item.id} value={item.id}>{item.title}{item.company ? ` · ${item.company}` : ""}</option>)}</select>
              </div>
              <button disabled={loading || !resumes.length || !jobs.length} className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{loading ? "Analyzing..." : "Analyze alignment"}</button>
            </form>

            {analysis && <AnalysisView analysis={analysis} />}

            <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-semibold">Analysis history</h2>
              {analyses.length === 0 ? <p className="mt-4 text-sm text-slate-500">Your saved analyses will appear here.</p> : <div className="mt-5 divide-y divide-slate-200">{analyses.map((item) => <button key={item.id} onClick={() => openAnalysis(item.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-slate-50"><span><span className="block text-sm font-semibold">{new Date(item.created_at).toLocaleDateString()}</span><span className="block text-xs text-slate-500">Model: {item.model}</span></span><span className="text-lg font-semibold">{Math.round(item.overall_compatibility)}%</span></button>)}</div>}
            </section>
          </section>
        )}

        {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      </div>
    </main>
  );
}

function AnalysisView({ analysis }: { analysis: Analysis }) {
  const counts = analysis.requirements.reduce<Record<string, number>>((all, item) => ({ ...all, [item.classification]: (all[item.classification] ?? 0) + 1 }), {});
  return <section aria-labelledby="analysis-results" className="space-y-6"><div className="grid gap-5 lg:grid-cols-[1fr_2fr]"><div className="rounded-2xl bg-sky-700 p-7 text-white"><p className="text-sm text-sky-100">Compatibility summary</p><p className="mt-3 text-6xl font-semibold">{Math.round(analysis.overall_compatibility)}<span className="text-3xl">%</span></p><p className="mt-4 text-sm leading-6 text-sky-100">An evidence-alignment summary, not a hiring or ATS probability.</p></div><div className="grid gap-3 sm:grid-cols-3">{(["Strong Match", "Partial Match", "No Evidence"] as const).map((label) => <div key={label} className={`rounded-2xl border p-6 ${badgeStyles[label]}`}><p className="text-sm font-medium">{label}</p><p className="mt-3 text-4xl font-semibold">{counts[label] ?? 0}</p><p className="mt-2 text-sm opacity-75">requirements</p></div>)}</div></div><div><h2 id="analysis-results" className="text-2xl font-semibold">Requirement detail</h2><div className="mt-4 space-y-4">{analysis.requirements.map((item) => <article key={item.requirement} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row"><h3 className="text-lg font-semibold">{item.requirement}</h3><span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyles[item.classification]}`}>{item.classification}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{item.explanation}</p>{item.supporting_evidence ? <blockquote className="mt-4 border-l-2 border-sky-300 pl-4 text-sm leading-6 text-slate-700">“{item.supporting_evidence}”<footer className="mt-2 text-xs text-slate-400">Resume evidence · {(item.similarity * 100).toFixed(0)}% similarity</footer></blockquote> : <p className="mt-4 text-sm text-slate-500">No supplied resume evidence reached the partial-match threshold.</p>}</article>)}</div></div><details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><summary className="cursor-pointer font-semibold text-slate-800">Methodology and model details</summary><p className="mt-4 leading-6">Model: {analysis.model}. Scoring configuration: {analysis.scoring.version}. Strong Match ≥ {(analysis.scoring.strong_match_threshold * 100).toFixed(0)}%; Partial Match ≥ {(analysis.scoring.partial_match_threshold * 100).toFixed(0)}%.</p></details></section>;
}
