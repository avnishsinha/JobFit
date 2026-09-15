"use client";

import { FormEvent, useState } from "react";

type Classification = "Strong Match" | "Partial Match" | "No Evidence";

type RequirementResult = {
  requirement: string;
  classification: Classification;
  similarity: number;
  supporting_evidence: string | null;
  explanation: string;
};

type AnalysisResponse = {
  overall_compatibility: number;
  requirements: RequirementResult[];
  model: string;
  scoring: {
    version: string;
    strong_match_threshold: number;
    partial_match_threshold: number;
  };
};

const initialResume =
  "Developed backend REST APIs using Python and PostgreSQL.\nLed data migration projects and improved reporting workflows.";
const initialJob =
  "Backend Engineer\n\n- Experience developing REST APIs.\n- Strong data analysis skills.\n- Ability to design reliable services.";

const classificationStyles: Record<Classification, string> = {
  "Strong Match": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Partial Match": "border-amber-200 bg-amber-50 text-amber-800",
  "No Evidence": "border-slate-200 bg-slate-100 text-slate-700",
};

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.overall_compatibility === "number" &&
    typeof payload.model === "string" &&
    Array.isArray(payload.requirements) &&
    typeof payload.scoring === "object" &&
    payload.scoring !== null
  );
}

export default function Analyzer() {
  const [resumeText, setResumeText] = useState(initialResume);
  const [jobDescription, setJobDescription] = useState(initialJob);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submitAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAnalysis(null);

    if (!resumeText.trim() || !jobDescription.trim()) {
      setError("Add both your resume text and the job description to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "detail" in payload &&
          typeof payload.detail === "string"
        ) {
          throw new Error(payload.detail);
        }
        throw new Error("The analysis could not be completed.");
      }
      if (!isAnalysisResponse(payload)) {
        throw new Error("The backend returned an invalid analysis response.");
      }
      setAnalysis(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Backend unavailable. Start the FastAPI server and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const counts = analysis
    ? analysis.requirements.reduce(
        (summary, item) => ({
          ...summary,
          [item.classification]: summary[item.classification] + 1,
        }),
        {
          "Strong Match": 0,
          "Partial Match": 0,
          "No Evidence": 0,
        } as Record<Classification, number>,
      )
    : null;

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <header className="border-b border-slate-200/80 bg-[#f6f7f4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              J
            </span>
            <span className="text-lg font-semibold tracking-tight">JobFit</span>
          </div>
          <span className="text-sm text-slate-500">Semantic fit, explained.</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-14 lg:px-10 lg:pt-20">
        <section className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Resume to role alignment
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-6xl">
            See where your experience meets the role.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Compare the experience in your resume with a job description using
            semantic similarity. JobFit highlights supporting evidence without
            pretending to predict hiring outcomes.
          </p>
        </section>

        <form onSubmit={submitAnalysis} className="mt-12 space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <TextInput
              id="resume-text"
              label="Your resume"
              hint="Paste the plain text of your resume."
              value={resumeText}
              onChange={setResumeText}
              placeholder="Built REST APIs..."
            />
            <TextInput
              id="job-description"
              label="Job description"
              hint="Paste the full role description."
              value={jobDescription}
              onChange={setJobDescription}
              placeholder="Experience developing REST APIs..."
            />
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {error}
            </p>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? "Analyzing your fit..." : "Analyze alignment"}
            </button>
            <p className="text-sm text-slate-500">
              Plain text only for now. Your inputs are analyzed in this request
              and not saved.
            </p>
          </div>
        </form>

        {analysis && counts && (
          <section aria-labelledby="results-heading" className="mt-20 space-y-8">
            <div className="flex flex-col justify-between gap-6 border-t border-slate-200 pt-10 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                  Analysis
                </p>
                <h2 id="results-heading" className="mt-3 text-3xl font-semibold tracking-tight">
                  Your alignment at a glance
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAnalysis(null)}
                className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500 focus:outline-none focus:ring-4 focus:ring-sky-200 sm:self-auto"
              >
                Edit inputs
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
              <div className="rounded-2xl bg-slate-950 p-7 text-white">
                <p className="text-sm text-slate-300">Compatibility score</p>
                <p className="mt-3 text-6xl font-semibold tracking-[-0.05em]">
                  {Math.round(analysis.overall_compatibility)}
                  <span className="text-3xl text-slate-400">%</span>
                </p>
                <p className="mt-5 text-sm leading-6 text-slate-300">
                  Based on the classifications of the extracted requirements.
                  This is not a hiring, interview, or ATS probability.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["Strong Match", "Partial Match", "No Evidence"] as Classification[]).map(
                  (classification) => (
                    <div
                      key={classification}
                      className={`rounded-2xl border p-6 ${classificationStyles[classification]}`}
                    >
                      <p className="text-sm font-medium">{classification}</p>
                      <p className="mt-3 text-4xl font-semibold">{counts[classification]}</p>
                      <p className="mt-2 text-sm opacity-75">requirements</p>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold tracking-tight">Requirement detail</h3>
              {analysis.requirements.map((item) => (
                <article key={item.requirement} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <h4 className="max-w-2xl text-lg font-semibold leading-7">{item.requirement}</h4>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${classificationStyles[item.classification]}`}>
                      {item.classification}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{item.explanation}</p>
                  {item.supporting_evidence ? (
                    <blockquote className="mt-5 border-l-2 border-sky-300 pl-4 text-sm leading-6 text-slate-700">
                      “{item.supporting_evidence}”
                      <footer className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Resume evidence · {(item.similarity * 100).toFixed(0)}% semantic similarity
                      </footer>
                    </blockquote>
                  ) : (
                    <p className="mt-5 text-sm font-medium text-slate-500">
                      No supplied resume evidence met the partial-match threshold.
                    </p>
                  )}
                </article>
              ))}
            </div>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-800">
                Methodology and model details
              </summary>
              <p className="mt-4 leading-6">
                JobFit extracts bullet points or requirement-like sentences,
                compares each one with each resume evidence unit, and keeps the
                strongest similarity. The model is {analysis.model}; scoring
                configuration {analysis.scoring.version} uses Strong Match at
                ≥ {(analysis.scoring.strong_match_threshold * 100).toFixed(0)}%
                and Partial Match at ≥{" "}
                {(analysis.scoring.partial_match_threshold * 100).toFixed(0)}%.
              </p>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}

function TextInput({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-base font-semibold text-slate-950">
          {label}
        </label>
        <span className="text-xs text-slate-500">{hint}</span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={11}
        required
        className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}
