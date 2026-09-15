"use client";

import { FormEvent, type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

type User = { id: string; email: string };
type Resume = { id: string; name: string; created_at: string };
type Job = { id: string; title: string; company: string | null; description: string; url: string | null; created_at: string };
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
  scoring: { version: string; strong_match_threshold: number; partial_match_threshold: number };
};
type Summary = { id: string; resume_id: string; job_id: string; overall_compatibility: number; model: string; scoring: Analysis["scoring"]; created_at: string };
type Billing = { plan: string; status: string; analyses_used: number; analyses_limit: number | null };

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  const payload: unknown = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "detail" in payload ? payload.detail : "The request could not be completed.";
    throw new Error(typeof detail === "string" ? detail : "The request could not be completed.");
  }
  return payload as T;
}

const navItems = ["Why JobFit", "How it works", "Pricing"];

export default function Analyzer() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
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
      api<User>("/auth/me"), api<Resume[]>("/resumes"), api<Job[]>("/jobs"), api<Summary[]>("/analyses"), api<Billing>("/billing"),
    ]);
    setUser(me); setResumes(resumeList); setJobs(jobList); setAnalyses(analysisList); setBilling(billingState);
    setSelectedResume((current) => current || resumeList[0]?.id || "");
    setSelectedJob((current) => current || jobList[0]?.id || "");
  }

  useEffect(() => {
    async function hydrateSession() { try { await refreshWorkspace(); } catch { /* Signed-out visitors see the landing page. */ } }
    void hydrateSession();
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try { await api<User>(`/auth/${authMode}`, { method: "POST", body: JSON.stringify({ email, password }) }); await refreshWorkspace(); setPassword(""); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Authentication failed."); }
    finally { setLoading(false); }
  }

  async function logout() {
    await api<void>("/auth/logout", { method: "POST" });
    setUser(null); setAnalysis(null); setResumes([]); setJobs([]); setAnalyses([]); setBilling(null);
  }

  async function uploadResume(event: FormEvent) {
    event.preventDefault(); if (!resumeFile) return; setLoading(true); setError(null);
    try { const body = new FormData(); body.append("file", resumeFile); await api<Resume>("/resumes", { method: "POST", body }); setResumeFile(null); await refreshWorkspace(); setNotice("Resume added to your private workspace."); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Resume upload failed."); }
    finally { setLoading(false); }
  }

  async function createJob(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try { await api<Job>("/jobs", { method: "POST", body: JSON.stringify({ title, company: company || null, description, url: null }) }); setTitle(""); setCompany(""); setDescription(""); await refreshWorkspace(); setNotice("Job saved. It is ready to compare."); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Job creation failed."); }
    finally { setLoading(false); }
  }

  async function runAnalysis(event: FormEvent) {
    event.preventDefault();
    if (!selectedResume || !selectedJob) { setError("Choose a resume and a job before analyzing."); return; }
    setLoading(true); setError(null);
    try { const summary = await api<Summary>("/analyses", { method: "POST", body: JSON.stringify({ resume_id: selectedResume, job_id: selectedJob }) }); setAnalysis(await api<Analysis>(`/analyses/${summary.id}`)); await refreshWorkspace(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Analysis failed."); }
    finally { setLoading(false); }
  }

  async function openAnalysis(id: string) {
    setLoading(true); setError(null);
    try { setAnalysis(await api<Analysis>(`/analyses/${id}`)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not load analysis."); }
    finally { setLoading(false); }
  }

  async function deleteResource(path: string, message: string) {
    setError(null);
    try { await api<void>(path, { method: "DELETE" }); await refreshWorkspace(); setNotice(message); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Delete failed."); }
  }

  async function startCheckout() {
    try { const checkout = await api<{ url: string }>("/billing/checkout", { method: "POST" }); window.location.assign(checkout.url); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Billing is unavailable."); }
  }

  if (user) {
    return <Workspace user={user} resumes={resumes} jobs={jobs} analyses={analyses} billing={billing} analysis={analysis} selectedResume={selectedResume} selectedJob={selectedJob} loading={loading} resumeFile={resumeFile} title={title} company={company} description={description} notice={notice} error={error} setSelectedResume={setSelectedResume} setSelectedJob={setSelectedJob} setResumeFile={setResumeFile} setTitle={setTitle} setCompany={setCompany} setDescription={setDescription} uploadResume={uploadResume} createJob={createJob} runAnalysis={runAnalysis} openAnalysis={openAnalysis} deleteResource={deleteResource} startCheckout={startCheckout} logout={logout} />;
  }

  return <Landing authMode={authMode} email={email} password={password} loading={loading} error={error} setAuthMode={setAuthMode} setEmail={setEmail} setPassword={setPassword} authenticate={authenticate} />;
}

function Brand() {
  return <Link className="brand" href="/" aria-label="JobFit home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>JobFit</span></Link>;
}

function Landing({ authMode, email, password, loading, error, setAuthMode, setEmail, setPassword, authenticate }: { authMode: "login" | "signup"; email: string; password: string; loading: boolean; error: string | null; setAuthMode: (mode: "login" | "signup") => void; setEmail: (value: string) => void; setPassword: (value: string) => void; authenticate: (event: FormEvent) => void }) {
  return <main className="site-shell">
    <header className="site-nav"><Brand /><nav aria-label="Main navigation">{navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>{item}</a>)}<a className="nav-cta" href="#start">Analyze my resume</a></nav></header>
    <section className="hero section-wrap">
      <div className="hero-copy"><p className="eyebrow">Resume evidence / job requirements</p><h1>Stop guessing which jobs are worth your time.</h1><p className="hero-lede">JobFit compares your actual resume with a job description, shows the evidence behind every match, and surfaces what is unsupported before you start an application.</p><div className="hero-actions"><a className="button button-primary" href="#start">Analyze my resume <span aria-hidden="true">↗</span></a><a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div></div>
      <EvidenceField />
    </section>
    <div className="proof-line section-wrap"><span>Your resume already tells a story.</span><span>See which jobs it supports.</span></div>
    <section id="why-jobfit" className="story section-wrap"><div className="story-label">01 / The problem</div><div><h2>Every application starts with the same doubt.</h2><p>You reread the requirements. You scan your experience. You wonder if “close enough” is enough. Job searching creates a pile of repeated comparison work before the real work even begins.</p></div></section>
    <section className="story story-reverse section-wrap"><div className="story-label">02 / The answer</div><div><h2>Your resume already contains the evidence.</h2><p>JobFit finds how that evidence relates to the requirements of a role. Not a mysterious ATS score. Not a prediction. A clear view of what your resume supports and what it does not show.</p></div></section>
    <section id="how-it-works" className="example-section section-wrap"><div className="section-intro"><p className="eyebrow">A useful answer in seconds</p><h2>See the connection, not just the keywords.</h2></div><div className="evidence-example"><div className="evidence-column"><span className="example-label">Job requirement</span><p>Experience building scalable backend services</p></div><div className="connection-line" aria-hidden="true"><span>semantic relationship</span></div><div className="evidence-column"><span className="example-label">Resume evidence</span><p>Developed REST APIs using Java, Spring Boot and PostgreSQL</p></div><div className="example-result"><span className="status-dot strong" /> Strong Match <small>Supporting evidence found in your resume</small></div></div></section>
    <section className="flow-section section-wrap"><div className="story-label">03 / How it works</div><h2>Resume <span>→</span> Job <span>→</span> Evidence <span>→</span> Decision</h2><p>One simple workflow for deciding where your application time belongs.</p></section>
    <section className="explain-section section-wrap"><div><p className="eyebrow">04 / Explainability</p><h2>A score is useless if you don’t know why.</h2><p>Every result opens into the requirement-level evidence that produced it. Strong matches, partial support, and requirements with no evidence stay visible.</p></div><div className="score-demo"><div className="score-number">78<span>%</span></div><div className="score-question">Why 78%?</div><div className="score-rule"><span>Strong Match</span><b>6</b></div><div className="score-rule"><span>Partial Match</span><b>2</b></div><div className="score-rule"><span>No Evidence</span><b>1</b></div></div></section>
    <section className="gap-section section-wrap"><div className="gap-word">No Evidence</div><div><p className="eyebrow">05 / Honest gaps</p><h2>Not found is not the same as not possible.</h2><p>“No Evidence” means JobFit could not find supporting evidence in the resume you supplied. It does not claim you cannot do the work. It gives you a chance to check what your resume leaves unsaid.</p></div></section>
    <section className="time-section section-wrap"><p className="eyebrow">06 / Your time</p><h2>Your time should go into the application.<br /><em>Not deciding whether to start one.</em></h2><p>JobFit reduces the repetitive comparison between your experience and every new role, so you can make a more informed decision and move on with confidence.</p></section>
    <section id="pricing" className="pricing-section section-wrap"><div><p className="eyebrow">07 / Simple access</p><h2>Use the plan that fits your search.</h2></div><div className="plans"><div><span className="plan-name">Free</span><strong>Start with clarity.</strong><p>Five analyses per UTC month. Save your resume, jobs and explainable results in a private workspace.</p><a className="text-link" href="#start">Get started ↗</a></div><div className="plan-pro"><span className="plan-name">Pro</span><strong>For an active search.</strong><p>When billing is configured, Pro removes the application-level monthly analysis cap for repeated job comparison.</p><a className="button button-primary" href="#start">Analyze my resume <span aria-hidden="true">↗</span></a></div></div></section>
    <section id="start" className="start-section section-wrap"><div><p className="eyebrow">08 / Begin here</p><h2>Know the fit.<br /><em>Then decide.</em></h2></div><div className="auth-panel"><div className="auth-tabs"><button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>Create workspace</button><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Log in</button></div><form onSubmit={authenticate}><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"} /></label><button className="button button-primary full-width" disabled={loading}>{loading ? "Working..." : authMode === "signup" ? "Create private workspace ↗" : "Log in ↗"}</button></form>{error && <p className="inline-error" role="alert">{error}</p>}<p className="privacy-note">Your resume is sensitive personal data. It stays in your private workspace and is never used to claim more than the evidence you provide.</p></div></section>
    <footer className="site-footer section-wrap"><Brand /><span>Evidence for better decisions.</span></footer>
  </main>;
}

function EvidenceField() {
  const particles = Array.from({ length: 28 }, (_, index) => index);
  return <div className="evidence-field" aria-label="Abstract visualization of resume evidence connecting to job requirements" role="img"><div className="field-label field-label-left">resume<br />evidence</div><div className="field-label field-label-right">job<br />requirements</div><div className="field-core">{particles.map((particle) => <span key={particle} className={`particle particle-${particle % 5}`} style={{ "--i": particle } as CSSProperties} />)}<span className="field-node node-left" /><span className="field-node node-right" /><span className="field-link link-strong" /><span className="field-link link-partial" /></div></div>;
}

type WorkspaceProps = { user: User; resumes: Resume[]; jobs: Job[]; analyses: Summary[]; billing: Billing | null; analysis: Analysis | null; selectedResume: string; selectedJob: string; loading: boolean; resumeFile: File | null; title: string; company: string; description: string; notice: string | null; error: string | null; setSelectedResume: (value: string) => void; setSelectedJob: (value: string) => void; setResumeFile: (value: File | null) => void; setTitle: (value: string) => void; setCompany: (value: string) => void; setDescription: (value: string) => void; uploadResume: (event: FormEvent) => void; createJob: (event: FormEvent) => void; runAnalysis: (event: FormEvent) => void; openAnalysis: (id: string) => void; deleteResource: (path: string, message: string) => void; startCheckout: () => void; logout: () => void };

function Workspace(props: WorkspaceProps) {
  const { user, resumes, jobs, analyses, billing, analysis, selectedResume, selectedJob, loading, resumeFile, title, company, description, notice, error, setSelectedResume, setSelectedJob, setResumeFile, setTitle, setCompany, setDescription, uploadResume, createJob, runAnalysis, openAnalysis, deleteResource, startCheckout, logout } = props;
  return <main className="workspace-shell"><header className="workspace-nav"><Brand /><div className="workspace-account"><span>{user.email}</span><button className="text-link" onClick={logout}>Log out</button></div></header><div className="workspace-wrap"><div className="workspace-heading"><div><p className="eyebrow">Private workspace</p><h1>Make the next application a considered one.</h1><p>Resume + job → evidence → decision.</p></div><div className="usage"><span>{billing?.plan === "pro" ? "PRO PLAN" : "FREE PLAN"}</span><strong>{billing?.analyses_used ?? 0}{billing?.analyses_limit ? ` / ${billing.analyses_limit}` : ""}</strong><small>analyses this month</small></div></div>{notice && <p className="workspace-notice" role="status">{notice}</p>}{error && <p className="workspace-error" role="alert">{error}</p>}<div className="workspace-grid"><form className="workspace-form" onSubmit={uploadResume}><div className="form-heading"><span>01</span><h2>Resume evidence</h2></div><p>Your uploaded PDF is parsed securely and used only for your analyses.</p><input required type="file" accept="application/pdf,.pdf" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} /><button className="button button-outline" disabled={loading || !resumeFile}>Add resume</button>{resumes.length > 0 && <ul className="resource-list">{resumes.map((item) => <li key={item.id}><span>{item.name}</span><button type="button" onClick={() => deleteResource(`/resumes/${item.id}`, "Resume deleted.")}>Delete</button></li>)}</ul>}</form><form className="workspace-form" onSubmit={createJob}><div className="form-heading"><span>02</span><h2>Job requirements</h2></div><p>Save the role you are considering so its requirements can be compared.</p><div className="form-row"><input required placeholder="Job title" value={title} onChange={(event) => setTitle(event.target.value)} /><input placeholder="Company (optional)" value={company} onChange={(event) => setCompany(event.target.value)} /></div><textarea required rows={5} placeholder="Paste the full job description" value={description} onChange={(event) => setDescription(event.target.value)} /><button className="button button-outline" disabled={loading}>Save job</button>{jobs.length > 0 && <ul className="resource-list">{jobs.slice(0, 4).map((item) => <li key={item.id}><span>{item.title}</span><button type="button" onClick={() => deleteResource(`/jobs/${item.id}`, "Job deleted.")}>Delete</button></li>)}</ul>}</form></div><form className="analyze-strip" onSubmit={runAnalysis}><div><p className="eyebrow">03 / Decide</p><h2>Ready to see the evidence?</h2><p>{billing?.analyses_limit ? `${billing.analyses_limit - (billing.analyses_used ?? 0)} analyses remaining this month.` : "Your Pro plan has no application-level monthly cap."}</p></div><div className="analyze-controls"><select required aria-label="Select resume" value={selectedResume} onChange={(event) => setSelectedResume(event.target.value)}><option value="">Select resume</option>{resumes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required aria-label="Select job" value={selectedJob} onChange={(event) => setSelectedJob(event.target.value)}><option value="">Select job</option>{jobs.map((item) => <option key={item.id} value={item.id}>{item.title}{item.company ? ` · ${item.company}` : ""}</option>)}</select><button className="button button-primary" disabled={loading || !resumes.length || !jobs.length}>{loading ? "Finding evidence..." : "Analyze my resume ↗"}</button>{billing?.plan !== "pro" && <button type="button" className="text-link" onClick={startCheckout}>Upgrade to Pro</button>}</div></form>{analysis && <AnalysisView analysis={analysis} />}<section className="history-section"><div className="form-heading"><span>04</span><h2>Analysis history</h2></div>{analyses.length === 0 ? <p className="empty-state">Your saved analyses will appear here after your first comparison.</p> : <div className="history-list">{analyses.map((item) => <button key={item.id} onClick={() => openAnalysis(item.id)}><span><strong>{new Date(item.created_at).toLocaleDateString()}</strong><small>{item.model}</small></span><b>{Math.round(item.overall_compatibility)}%</b></button>)}</div>}</section></div></main>;
}

function AnalysisView({ analysis }: { analysis: Analysis }) {
  const counts = analysis.requirements.reduce<Record<string, number>>((all, item) => ({ ...all, [item.classification]: (all[item.classification] ?? 0) + 1 }), {});
  return <section className="analysis-results" aria-labelledby="analysis-results"><div className="results-header"><div><p className="eyebrow">Analysis result</p><h2 id="analysis-results">Here is what your resume supports.</h2><p>This is an evidence-alignment summary, not a hiring, interview or ATS probability.</p></div><div className="compatibility-score"><strong>{Math.round(analysis.overall_compatibility)}<span>%</span></strong><small>overall compatibility</small></div></div><div className="result-summary">{(["Strong Match", "Partial Match", "No Evidence"] as const).map((label) => <div key={label} className={`result-count result-${label.toLowerCase().replace(" ", "-")}`}><span>{label}</span><strong>{counts[label] ?? 0}</strong><small>requirements</small></div>)}</div><div className="requirements"><h3>Requirement detail</h3>{analysis.requirements.map((item) => <article className="requirement" key={item.requirement}><div className="requirement-heading"><h4>{item.requirement}</h4><span className={`status status-${item.classification.toLowerCase().replace(" ", "-")}`}>{item.classification}</span></div><p>{item.explanation}</p>{item.supporting_evidence ? <blockquote>“{item.supporting_evidence}”<footer>Resume evidence · {(item.similarity * 100).toFixed(0)}% semantic similarity</footer></blockquote> : <div className="no-evidence">No supplied resume evidence reached the partial-match threshold.</div>}</article>)}</div><details className="methodology"><summary>Methodology and model details</summary><p>Model: {analysis.model}. Scoring configuration: {analysis.scoring.version}. Strong Match ≥ {(analysis.scoring.strong_match_threshold * 100).toFixed(0)}%; Partial Match ≥ {(analysis.scoring.partial_match_threshold * 100).toFixed(0)}%.</p></details></section>;
}
