import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  cleaningStore,
  getJob,
  startJob,
  toggleChecklist,
  completeJob,
  markProblem,
  resolveProblem,
  generatePlaceholderPhoto,
} from "@/app/lib/cleaningstore";
import { listPinsByApt } from "@/app/lib/store";
import * as Store from "@/app/lib/store";
import { door_open, door_close, door_getStateFromLog } from "@/app/lib/domain/doorStore";
import { gate_open } from "@/app/lib/domain/gateStore";
import { ProblemModal } from "./ProblemModal";

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
  const resolve = sp.resolve === "1";
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
    const currentJob = getJob(jobIdStr);
    // Blocca il toggle se il job non è stato avviato
    if (currentJob && currentJob.status === "todo") {
      // Non fare nulla, il job non è stato avviato
    } else {
      toggleChecklist(jobIdStr, toggle);
    }
    redirect(`/app/cleaner/${jobIdStr}`);
  }
  if (resolve) {
    resolveProblem(jobIdStr);
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

  // sicurezza: un cleaner vede solo i job associati ai suoi stay (tramite PIN)
  // Verifica se il job è associato a uno stay per cui il cleaner ha un PIN valido
  const cleanerPins = listPinsByApt(me.aptId).filter((p) => p.role === "cleaner");
  const hasAccess = job.aptId === me.aptId || (job.stayId && cleanerPins.some((p) => p.stayId === job.stayId));
  
  if (!hasAccess) {
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

  const aptId = job.aptId;
  
  // Leggi stato porta dal log condiviso
  const doorState = door_getStateFromLog(Store, aptId);
  const doorIsOpen = doorState === "open";
  
  // Verifica se "Foto finali" è nella checklist e se è done
  const photoItem = job.checklist.find((it) => it.label.includes("Foto finali"));
  const photoItemDone = photoItem?.done ?? false;
  const hasFinalPhotos = job.finalPhotos && job.finalPhotos.length > 0;
  
  // Verifica se tutti gli item della checklist sono completati
  const allChecklistDone = job.checklist.every((it) => it.done);

  async function actOpenDoor() {
    "use server";
    const outcome = door_open(aptId);
    
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "door_opened", "[cleaner] Porta aperta dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo apertura porta fallito");
    }

    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function actCloseDoor() {
    "use server";
    const outcome = door_close(aptId);
    
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "door_closed", "[cleaner] Porta chiusa dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo chiusura porta fallito");
    }

    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function actOpenGate() {
    "use server";
    const outcome = gate_open(aptId);
    
    if (outcome === "ok") {
      Store.logAccessEvent(aptId, "gate_opened", "[cleaner] Portone aperto dal cleaner");
    } else {
      Store.logAccessEvent(aptId, "guest_access_ko", "[cleaner] Tentativo apertura portone fallito");
    }

    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }


  async function actUploadFinalPhotos() {
    "use server";
    const currentJob = getJob(jobIdStr);
    if (!currentJob) {
      redirect(`/app/cleaner/${jobIdStr}`);
      return;
    }

    // Genera automaticamente 2-3 foto placeholder
    const photoCount = 2 + Math.floor(Math.random() * 2); // 2 o 3 foto
    const photos: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      photos.push(generatePlaceholderPhoto(i + 1));
    }

    // Salva le foto nel job
    currentJob.finalPhotos = photos;
    cleaningStore.set(jobIdStr, currentJob);

    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
  }

  async function handleReportProblem(formData: FormData) {
    "use server";
    const note = formData.get("note")?.toString() || "";
    const formJobId = formData.get("jobId")?.toString() || jobIdStr;
    
    // Genera automaticamente 2-3 foto placeholder
    const photoCount = 2 + Math.floor(Math.random() * 2); // 2 o 3 foto
    const photos: string[] = [];
    for (let i = 0; i < photoCount; i++) {
      photos.push(generatePlaceholderPhoto(i + 1));
    }

    markProblem(formJobId, {
      note: note.trim() || undefined,
      photos: photos,
    });

    revalidatePath(`/app/cleaner/${formJobId}`);
    redirect(`/app/cleaner/${formJobId}`);
  }
  
  async function actResolveProblem() {
    "use server";
    resolveProblem(jobIdStr);
    revalidatePath(`/app/cleaner/${jobIdStr}`);
    redirect(`/app/cleaner/${jobIdStr}`);
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

          {job.status === "todo" && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-400/20 p-3 mb-2">
              <div className="text-sm text-yellow-200">
                ⚠️ Avvia il job per poter spuntare gli elementi della checklist
              </div>
            </div>
          )}

          <div className="space-y-2">
            {job.checklist.map((it) => {
              const canToggle = job.status !== "todo" && job.status !== "done";
              return (
                <div
                  key={it.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 ${
                    canToggle
                      ? "bg-black/0 hover:bg-white/5 cursor-pointer"
                      : "bg-black/20 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {canToggle ? (
                    <a
                      href={`/app/cleaner/${jobIdStr}?toggle=${encodeURIComponent(it.id)}`}
                      className="flex items-center justify-between gap-3 w-full"
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
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded border ${
                            it.done ? "bg-cyan-500/40 border-cyan-400/40" : "border-white/20"
                          }`}
                        />
                        <div className={`${it.done ? "opacity-60 line-through" : ""}`}>{it.label}</div>
                      </div>
                      {job.status === "done" ? (
                        <span className="text-xs opacity-50">Completato</span>
                      ) : (
                        <span className="text-sm opacity-50">
                          {it.done ? "Undo" : "Fatto"}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="text-sm opacity-70 mb-2">Controllo accessi</div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs opacity-60">Porta</div>
              <div className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    doorIsOpen
                      ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                      : "bg-white/5 border-white/10 text-white/80"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      doorIsOpen ? "bg-emerald-400" : "bg-white/40"
                    }`}
                  />
                  {doorIsOpen ? "SBLOCCATA" : "CHIUSA"}
                </div>
              </div>
              <div className="flex gap-2">
                {doorIsOpen ? (
                  <form action={actCloseDoor} className="flex-1">
                    <button className="w-full rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-2 text-xs font-semibold">
                      Chiudi porta
                    </button>
                  </form>
                ) : (
                  <form action={actOpenDoor} className="flex-1">
                    <button className="w-full rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-3 py-2 text-xs font-semibold">
                      Apri porta
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs opacity-60">Portone</div>
              <div className="flex gap-2">
                <form action={actOpenGate} className="flex-1">
                  <button className="w-full rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-3 py-2 text-xs font-semibold">
                    Apri portone
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Foto finali - solo se checklist item "Foto finali" è done */}
        {photoItemDone && job.status === "in_progress" && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="text-sm opacity-70 mb-2">Foto finali</div>
            
            {hasFinalPhotos ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {job.finalPhotos?.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <form action={actUploadFinalPhotos}>
                  <button type="submit" className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-semibold">
                    Sostituisci foto
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-[#4a5568] flex items-center justify-center">
                      <span className="text-sm text-[#a0aec0] font-semibold">Foto {num}</span>
                    </div>
                  ))}
                </div>
                <form action={actUploadFinalPhotos}>
                  <button type="submit" className="w-full rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-4 py-2 text-sm font-semibold">
                    Genera foto finali
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {job.status === "todo" && (
            <a
              href={`/app/cleaner/${jobIdStr}?start=1`}
              className="rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/30 px-4 py-2 font-semibold inline-block"
            >
              Avvia
            </a>
          )}

          {job.status === "in_progress" && (
            <>
              {!allChecklistDone ? (
                <div className="flex flex-col gap-2">
                  <span className="rounded-xl bg-gray-500/20 border border-gray-400/30 opacity-50 cursor-not-allowed px-4 py-2 font-semibold inline-block">
                    Completa (checklist incompleta)
                  </span>
                  <div className="text-xs text-yellow-300 opacity-80">
                    ⚠️ Devi completare tutti gli item della checklist prima di completare il job
                  </div>
                </div>
              ) : photoItemDone && !hasFinalPhotos ? (
                <div className="flex flex-col gap-2">
                  <span className="rounded-xl bg-gray-500/20 border border-gray-400/30 opacity-50 cursor-not-allowed px-4 py-2 font-semibold inline-block">
                    Completa (foto finali obbligatorie)
                  </span>
                  <div className="text-xs text-yellow-300 opacity-80">
                    ⚠️ Devi caricare le foto finali prima di completare il job
                  </div>
                </div>
              ) : (
                <a
                  href={`/app/cleaner/${jobIdStr}?done=1`}
                  className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-4 py-2 font-semibold inline-block"
                >
                  Completa
                </a>
              )}
            </>
          )}

          {job.status === "problem" ? (
            <form action={actResolveProblem}>
              <button type="submit" className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-4 py-2 font-semibold">
                Risolvi problema
              </button>
            </form>
          ) : (
            <ProblemModal jobId={jobIdStr} onReport={handleReportProblem} />
          )}
        </div>
      </div>
    </main>
  );
}