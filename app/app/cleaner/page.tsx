import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { listJobsByApt, listJobsByStay } from "@/app/lib/cleaningstore";
import { listStaysByApt } from "@/app/lib/staysStore";
import { listPinsByApt } from "@/app/lib/store";

export default async function CleanerHome() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;

  const me = readSession(sess); // sync

  if (!me || me.role !== "cleaner") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  // Trova tutti i PIN del cleaner per questo aptId
  const cleanerPins = listPinsByApt(me.aptId).filter((p) => p.role === "cleaner");
  
  // Trova tutti gli stay associati ai PIN del cleaner
  const stayIds = new Set<string>();
  for (const pin of cleanerPins) {
    if (pin.stayId) {
      stayIds.add(pin.stayId);
    }
  }

  // Raccogli tutti i job associati agli stay del cleaner
  const jobs: any[] = [];
  for (const stayId of stayIds) {
    const stayJobs = listJobsByStay(stayId);
    jobs.push(...stayJobs);
  }

  // Aggiungi anche i job diretti per questo aptId (per retrocompatibilità)
  const aptJobs = listJobsByApt(me.aptId);
  for (const job of aptJobs) {
    if (!jobs.find((j) => j.id === job.id)) {
      jobs.push(job);
    }
  }

  // Ordina per stato
  const rank: Record<string, number> = {
    todo: 0,
    in_progress: 1,
    problem: 2,
    done: 3,
  };
  jobs.sort((a, b) => rank[a.status] - rank[b.status]);

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Pulizie — Apt {me.aptId}</h1>

          <div className="flex items-center gap-3">
            <Link className="text-sm opacity-70 hover:opacity-100" href="/app/host">
              ← Host
            </Link>

            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-sm opacity-70 hover:opacity-100">
                Esci
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">Job assegnati</div>

          {jobs.length === 0 ? (
            <div className="text-sm opacity-70">Nessun job disponibile.</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/app/cleaner/${j.id}`}
                  className="block rounded-xl bg-black/30 border border-white/10 p-4 hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{j.aptName}</div>
                    <span className="text-xs opacity-70">{j.windowLabel}</span>
                  </div>

                  <div className="mt-2 text-sm opacity-80">
                    Stato:{" "}
                    <span className="font-semibold">
                      {j.status === "todo" && "Da fare"}
                      {j.status === "in_progress" && "In corso"}
                      {j.status === "done" && "Completato"}
                      {j.status === "problem" && "Problema"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}