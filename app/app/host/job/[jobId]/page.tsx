import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { getJob, resolveProblem } from "@/app/lib/cleaningstore";
import { revalidatePath } from "next/cache";
import { listStaysByApt } from "@/app/lib/staysStore";
import { getApartment } from "@/app/lib/clientStore";
import { listClients } from "@/app/lib/clientStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDT(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDTFull(ts?: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeLeftDHM(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  if (diff <= 0) return "Scaduto";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}g ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default async function HostJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const resolvedParams = await Promise.resolve(params);
  const jobId = String(resolvedParams?.jobId ?? "");

  const job = getJob(jobId);

  if (!job) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/host">
            ← Torna alla dashboard
          </Link>
          <div className="text-lg font-semibold">Job non trovato</div>
          <div className="text-sm opacity-60">Job richiesto: {jobId}</div>
        </div>
      </main>
    );
  }

  // Recupera informazioni sull'appartamento
  const apt = getApartment(job.aptId);
  const aptName = apt?.name ?? job.aptName;

  // Cerca lo stay associato
  let associatedStay = null;
  if (job.stayId) {
    // Se il job ha un stayId, usalo direttamente
    const stays = listStaysByApt(job.aptId);
    associatedStay = stays.find((s) => s.stayId === job.stayId) ?? null;
  } else {
    // Altrimenti, cerca lo stay più recente per quell'appartamento
    const stays = listStaysByApt(job.aptId);
    associatedStay = stays.length > 0 ? stays[0] : null;
  }

  // Recupera clientId per i link
  const clients = (listClients() as any[]) ?? [];
  const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? "");
  let clientId = "";
  for (const client of clients) {
    const apts = client?.apartments ?? [];
    if (apts.some((a: any) => String(a?.aptId ?? a?.id ?? "") === job.aptId)) {
      clientId = getClientId(client);
      break;
    }
  }

  const statusColors: Record<string, string> = {
    todo: "bg-yellow-50 border-yellow-200 text-yellow-700",
    in_progress: "bg-blue-50 border-blue-200 text-blue-700",
    done: "bg-green-50 border-green-200 text-green-700",
    problem: "bg-red-50 border-red-200 text-red-700",
  };

  const statusLabels: Record<string, string> = {
    todo: "Da fare",
    in_progress: "In corso",
    done: "Completato",
    problem: "Problema",
  };

  // Calcola la durata del job se è stato completato
  const duration = job.startedAt && job.completedAt
    ? Math.round((job.completedAt - job.startedAt) / (60 * 1000))
    : null;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            className="text-sm opacity-70 hover:opacity-100"
            href={
              associatedStay && clientId
                ? `/app/host/stay/${encodeURIComponent(associatedStay.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`
                : clientId
                ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`
                : "/app/host"
            }>
            ← Torna {associatedStay ? "allo stay" : "alla dashboard"}
          </Link>
        </div>

        {/* Header con informazioni principali */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-lg font-semibold">{aptName}</div>
              <div className="text-sm opacity-70 mt-1">Job ID: {job.id}</div>
              {job.windowLabel && (
                <div className="text-sm opacity-70 mt-1">Finestra oraria: {job.windowLabel}</div>
              )}
            </div>
            <div className={`px-3 py-1 rounded-lg border text-sm font-semibold ${statusColors[job.status] ?? statusColors.todo}`}>
              {statusLabels[job.status] ?? job.status}
            </div>
          </div>
        </div>

        {/* Informazioni sullo stay associato */}
        {associatedStay && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
            <div className="text-sm opacity-70 mb-3">Soggiorno associato</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Stay ID</div>
                <div className="font-mono text-sm">{associatedStay.stayId}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Check-in</div>
                <div className="text-sm">{fmtDTFull(associatedStay.checkInAt)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Check-out</div>
                <div className="text-sm">{fmtDTFull(associatedStay.checkOutAt)}</div>
              </div>
              {associatedStay.cleanerName && (
                <div className="flex items-center justify-between">
                  <div className="text-xs opacity-60">Cleaner assegnato</div>
                  <div className="text-sm font-semibold">{associatedStay.cleanerName}</div>
                </div>
              )}
              {associatedStay.guests && associatedStay.guests.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-xs opacity-60">Ospiti</div>
                  <div className="text-sm">{associatedStay.guests.length} ospite/i</div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                <Link
                  href={`/app/host/stay/${encodeURIComponent(associatedStay.stayId)}?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(job.aptId)}`}
                  className="text-xs px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 inline-block">
                  Vai al dettaglio stay →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Foto finali */}
        {job.finalPhotos && job.finalPhotos.length > 0 && (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
            <div className="text-sm opacity-70 mb-3">Foto finali</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {job.finalPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border-light)]">
                  <img src={photo} alt={`Foto finale ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problema - Note e foto */}
        {job.status === "problem" && (job.problemNote || (job.problemPhotos && job.problemPhotos.length > 0)) && (
          <div className="rounded-2xl bg-red-500/10 border border-red-400/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-red-200">⚠️ Problema segnalato</div>
              <form action={async () => {
                "use server";
                resolveProblem(jobId);
                revalidatePath(`/app/host/job/${jobId}`);
                redirect(`/app/host/job/${jobId}`);
              }}>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold"
                >
                  Risolvi problema
                </button>
              </form>
            </div>
            
            {job.problemNote && (
              <div className="mb-3">
                <div className="text-xs opacity-70 mb-1">Note</div>
                <div className="text-sm opacity-90">{job.problemNote}</div>
              </div>
            )}

            {job.problemPhotos && job.problemPhotos.length > 0 && (
              <div>
                <div className="text-xs opacity-70 mb-2">Foto</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {job.problemPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-red-400/30">
                      <img src={photo} alt={`Foto problema ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="text-sm opacity-70 mb-3">Checklist</div>
          <div className="space-y-2">
            {job.checklist && job.checklist.length > 0 ? (
              job.checklist.map((item) => {
                const completedCount = job.checklist.filter((i) => i.done).length;
                const totalCount = job.checklist.length;
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        item.done
                          ? "bg-green-500/30 border-green-500/50"
                          : "bg-[var(--bg-secondary)] border-white/20"
                      }`}>
                      {item.done && (
                        <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={`flex-1 ${item.done ? "opacity-50 line-through" : ""}`}>
                      {item.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm opacity-60">Nessuna checklist disponibile</div>
            )}
          </div>
          {job.checklist && job.checklist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
              <div className="text-xs opacity-60">
                Completati: {job.checklist.filter((i) => i.done).length} / {job.checklist.length}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp e durata */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="text-sm opacity-70 mb-3">Cronologia</div>
          <div className="space-y-2">
            {job.startedAt && (
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Avviato il</div>
                <div className="text-sm">{fmtDTFull(job.startedAt)}</div>
              </div>
            )}
            {job.completedAt && (
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Completato il</div>
                <div className="text-sm">{fmtDTFull(job.completedAt)}</div>
              </div>
            )}
            {duration !== null && (
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-60">Durata</div>
                <div className="text-sm font-semibold">{duration} minuti</div>
              </div>
            )}
            {!job.startedAt && !job.completedAt && (
              <div className="text-sm opacity-60">Job non ancora avviato</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

