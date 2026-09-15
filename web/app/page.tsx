type HealthResult =
  | { ok: true; service: string }
  | { ok: false; message: string };

async function getBackendHealth(): Promise<HealthResult> {
  const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${backendUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return { ok: false, message: `Backend returned HTTP ${response.status}.` };
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("status" in payload) ||
      payload.status !== "ok" ||
      !("service" in payload) ||
      typeof payload.service !== "string"
    ) {
      return { ok: false, message: "Backend returned an invalid health response." };
    }

    return { ok: true, service: payload.service };
  } catch {
    return {
      ok: false,
      message: "Backend is unavailable. Start the FastAPI server and try again.",
    };
  }
}

export default async function Home() {
  const health = await getBackendHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
          JobFit
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Understand how your experience aligns with a job.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          The JobFit foundation is ready. Semantic analysis and the product
          workflow will be added in later roadmap phases.
        </p>
      </section>

      <section
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-950">System status</h2>
        {health.ok ? (
          <p className="mt-3 text-emerald-700">
            Backend connected ({health.service}).
          </p>
        ) : (
          <p className="mt-3 text-amber-700">{health.message}</p>
        )}
      </section>
    </main>
  );
}

