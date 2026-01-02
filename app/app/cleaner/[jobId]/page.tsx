import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import {
  cleaningStore,
  getJob,
  startJob,
  toggleChecklist,
  completeJob,
  markProblem,
} from "@/app/lib/cleaningstore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CleanerJobPage({
  params,
  searchParams,
}: {
  // In alcune versioni/setting di Next il `params` e/o `searchParams` possono arrivare come Promise.
  params: { jobId: string } | Promise<{ jobId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;

  const me = readSession(sess); // <-- NON await (è sync)

  if (!me || me.role !== "cleaner") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const resolvedParams = await Promise.resolve(params as any);
  const jobIdRaw = (resolvedParams as any)?.jobId;
  const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
  const jobIdStr = String(jobId ?? ""); // es: "job-017-1"

  const spResolved = (await Promise.resolve(searchParams as any)) ?? {};
  const sp = spResolved as Record<string, string | string[] | undefined>;
  const start = sp.start === "1";
  const done = sp.done === "1";
  const problem = sp.problem === "1";
  const toggle =
    typeof sp.toggle === "string"
      ? sp.toggle
      : Array.isArray(sp.toggle)
        ? sp.toggle[0]
        : undefined;

  // Mutazioni server-side (MVP) guidate da querystring, poi redirect per vedere l'aggiornamento.
  if (start) {
    startJob(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (done) {
    completeJob(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (problem) {
    markProblem(jobIdStr);
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (toggle) {
    toggleChecklist(jobIdStr, toggle);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  const job = getJob(jobIdStr);

  if (!job) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/cleaner">
            ← Torna a Pulizie
          </Link>
          <div className="text-lg font-semibold">Job non trovato</div>
          <div className="text-sm opacity-60">Job richiesto: {jobIdStr}</div>
          <div className="text-xs opacity-50 mt-2">
            Store keys: {Array.from(cleaningStore.keys()).join(", ")}
          </div>
        </div>
      </main>
    );
  }

  // sicurezza: un cleaner vede solo i job del suo aptId
  if (job.aptId !== me.aptId) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/cleaner">
            ← Torna a Pulizie
          </Link>
          <div className="text-lg font-semibold">Non autorizzato</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/cleaner">
          ← Torna a Pulizie
        </Link>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{job.aptName}</div>
              <div className="text-sm opacity-70">{job.windowLabel}</div>
              {job.notesFromHost && (
                <div className="mt-2 text-sm opacity-80">
                  Note host: <span className="opacity-100">{job.notesFromHost}</span>
                </div>
              )}
            </div>

            <div className="text-right text-sm">
              <div className="opacity-70">Stato</div>
              <div className="font-semibold">
                {job.status === "todo" && "Da fare"}
                {job.status === "in_progress" && "In corso"}
                {job.status === "done" && "Completato"}
                {job.status === "problem" && "Problema"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="text-sm opacity-70">Checklist</div>

          <div className="space-y-2">
            {job.checklist.map((it) => (
              <a
                key={it.id}
                href={`/app/cleaner/${jobIdStr}?toggle=${encodeURIComponent(it.id)}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/0 hover:bg-white/5 px-2 py-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded border ${
                      it.done ? "bg-cyan-500/40 border-cyan-400/40" : "border-white/20"
                    }`}
                  />
                  <div className={`${it.done ? "opacity-60 line-through" : ""}`}>{it.label}</div>
                </div>
                <span className="text-sm opacity-70 hover:opacity-100">
                  {it.done ? "Undo" : "Fatto"}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={`/app/cleaner/${jobIdStr}?start=1`}
            className="rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-4 py-2 font-semibold inline-block"
          >
            Avvia
          </a>

          <a
            href={`/app/cleaner/${jobIdStr}?done=1`}
            className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-4 py-2 font-semibold inline-block"
          >
            Completa
          </a>

          <a
            href={`/app/cleaner/${jobIdStr}?problem=1`}
            className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold inline-block"
          >
            Segnala problema
          </a>
        </div>
      </div>
    </main>
  );
}