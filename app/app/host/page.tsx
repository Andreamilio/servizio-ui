import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readSession } from "@/app/lib/session";
import { createPin, listPinsByApt, revokePin } from "@/app/lib/store";
import { listJobsByApt } from "@/app/lib/cleaningstore";
import { listClients, listApartmentsByClient } from "@/app/lib/clientStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

function minutesLeft(ts: number) {
  return Math.max(0, Math.round((ts - Date.now()) / 60000));
}

type AptHealth = {
  aptId: string;
  name: string;
  status: "ok" | "warn" | "crit";
  readiness: "Pronto check-in ✅" | "Da pulire" | "Pulizia in corso" | "Problema";
  lastEvent: string;
};

function computeHealth(aptId: string, name: string): AptHealth {
  const jobs = listJobsByApt(aptId);
  const hasProblem = jobs.some((j) => j.status === "problem");
  const hasInProgress = jobs.some((j) => j.status === "in_progress");
  const hasTodo = jobs.some((j) => j.status === "todo");

  const readiness = hasProblem
    ? "Problema"
    : hasInProgress
      ? "Pulizia in corso"
      : hasTodo
        ? "Da pulire"
        : "Pronto check-in ✅";

  const status: AptHealth["status"] = hasProblem ? "crit" : hasInProgress ? "warn" : "ok";

  const lastEvent = hasProblem
    ? "Pulizia segnalata come problema"
    : hasInProgress
      ? "Pulizia avviata"
      : hasTodo
        ? "In attesa pulizie"
        : "Operativo";

  return { aptId, name, status, readiness, lastEvent };
}

export default async function HostPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
  const q = (pick(sp, "q") ?? "").trim().toLowerCase();
  const aptSelected = pick(sp, "apt");

  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  // MVP: appartamenti reali dal clientStore (in V2 arriva da DB/API).
  // Nota: il prototipo può avere naming diverso (id/clientId, aptName/name). Qui normalizziamo.
  const clients = (listClients() as any[]) ?? [];

  const getClientId = (c: any) => String(c?.id ?? c?.clientId ?? c?.clientID ?? c?.slug ?? "");
  const getClientName = (c: any) => String(c?.name ?? c?.clientName ?? c?.title ?? "");

  const wantedClientId = (pick(sp, "client") ?? getClientId(clients[0]) ?? "").trim();
  const client =
    clients.find((c) => getClientId(c) === wantedClientId) ??
    (clients[0] ?? null);

  const clientId = client ? getClientId(client) : "";

  // se non c'è nessun client seedato, fallback su un solo apt dell'host
  const apartments = clientId
    ? (listApartmentsByClient(clientId) as any[]).map((a) => ({
        aptId: String(a?.aptId ?? a?.id ?? a?.apt ?? ""),
        name: String(a?.aptName ?? a?.name ?? a?.title ?? `Apt ${a?.aptId ?? a?.id ?? ""}`),
      }))
    : [{ aptId: me.aptId, name: `Apt ${me.aptId} — Principale` }];

  const clientLabel = client ? getClientName(client) : "Organizzazione";

  const healthAll = apartments.map((a) => computeHealth(a.aptId, a.name));
  const healthFiltered = q
    ? healthAll.filter((a) => a.aptId.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
    : healthAll;

  const total = healthAll.length;
  const ok = healthAll.filter((a) => a.status === "ok").length;
  const warn = healthAll.filter((a) => a.status === "warn").length;
  const crit = healthAll.filter((a) => a.status === "crit").length;

  const criticalFirst = healthAll.filter((a) => a.status === "crit").slice(0, 5);

  async function genPin(formData: FormData) {
    "use server";
    const role = (formData.get("role")?.toString() ?? "guest") as any;
    const ttl = Number(formData.get("ttl")?.toString() ?? "120");
    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!aptId) return;
    createPin(role, aptId, ttl);
    redirect(`/app/host?apt=${encodeURIComponent(aptId)}`);
  }

  async function delPin(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    const aptId = formData.get("aptId")?.toString() ?? "";
    if (!pin) return;
    revokePin(pin);
    redirect(aptId ? `/app/host?apt=${encodeURIComponent(aptId)}` : "/app/host");
  }

  // Dettaglio appartamento (sempre nello stesso file, MVP)
  if (aptSelected) {
    const apt = apartments.find((a) => a.aptId === aptSelected);
    const health = apt ? computeHealth(apt.aptId, apt.name) : null;
    const pins = listPinsByApt(aptSelected);
    const jobs = listJobsByApt(aptSelected);

    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs opacity-60">Host • Dettaglio appartamento</div>
              <h1 className="text-lg font-semibold">{apt?.name ?? (aptSelected ? `Apt ${aptSelected}` : "Apt")}</h1>
            </div>

            <div className="flex items-center gap-3">
              <Link className="text-sm opacity-70 hover:opacity-100" href="/app/host">
                ← Dashboard
              </Link>

              <form action="/api/auth/logout" method="post">
                <button className="text-sm opacity-70 hover:opacity-100">Esci</button>
              </form>
            </div>
          </div>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Stato operativo</div>
                <div className="mt-1 font-semibold">{health?.readiness ?? "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-70">Ultimo evento</div>
                <div className="mt-1 text-sm opacity-90">{health?.lastEvent ?? "—"}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90">
                Apri porta (mock)
              </button>
              <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90">
                Supporto
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm opacity-70 mb-3">Genera accesso</div>
            <form action={genPin} className="grid grid-cols-3 gap-2">
              <input type="hidden" name="aptId" value={aptSelected} />
              <select
                name="role"
                className="rounded-xl bg-black/40 border border-white/10 p-2"
                defaultValue="guest"
              >
                <option value="guest">Guest</option>
                <option value="cleaner">Cleaner</option>
              </select>
              <input
                name="ttl"
                defaultValue="120"
                className="rounded-xl bg-black/40 border border-white/10 p-2"
              />
              <button className="rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-2 font-semibold">
                Crea
              </button>
            </form>
            <div className="text-xs opacity-50 mt-2">TTL in minuti (es. 120 = 2 ore)</div>
          </section>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm opacity-70 mb-3">Accessi attivi (PIN)</div>

            <div className="space-y-2">
              {pins.length === 0 && <div className="text-sm opacity-50">Nessun PIN attivo</div>}

              {pins.map((p) => (
                <div
                  key={p.pin}
                  className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3"
                >
                  <div>
                    <div className="font-semibold tracking-widest">{p.pin}</div>
                    <div className="text-xs opacity-60">
                      {p.role} • scade tra {minutesLeft(p.expiresAt)} min
                    </div>
                  </div>

                  <form action={delPin}>
                    <input type="hidden" name="aptId" value={aptSelected} />
                    <input type="hidden" name="pin" value={p.pin} />
                    <button className="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
                      Revoca
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm opacity-70 mb-3">Pulizie (job)</div>
            {jobs.length === 0 ? (
              <div className="text-sm opacity-60">Nessun job registrato.</div>
            ) : (
              <div className="space-y-2">
                {jobs.map((j) => (
                  <div key={j.id} className="rounded-xl bg-black/30 border border-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{j.windowLabel}</div>
                      <div className="text-xs opacity-70">{j.id}</div>
                    </div>
                    <div className="mt-1 text-sm opacity-80">
                      Stato:{" "}
                      <span className="font-semibold">
                        {j.status === "todo" && "Da fare"}
                        {j.status === "in_progress" && "In corso"}
                        {j.status === "done" && "Completato"}
                        {j.status === "problem" && "Problema"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  // Dashboard Host (overview)
  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs opacity-60">Host • Dashboard</div>
            <h1 className="text-xl font-semibold">{clientLabel}</h1>
          </div>

          <div className="flex items-center gap-3">
            <form action="/app/host" method="get" className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Cerca appartamento…"
                className="w-56 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
              />
              <button className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm opacity-90">
                Cerca
              </button>
            </form>

            <form action="/api/auth/logout" method="post">
              <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm opacity-90">
                Logout
              </button>
            </form>
          </div>
        </div>
        <div className="text-sm opacity-70">
          {client ? (
            <div>
              <span className="font-semibold">{clientLabel}</span>
              <span className="opacity-50"> • </span>
              <span className="opacity-80">{apartments.length} appartamenti</span>
            </div>
          ) : (
            <div className="opacity-60">Nessun client configurato (fallback su apt host).</div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Totali</div>
            <div className="mt-1 text-2xl font-semibold">{total}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">OK</div>
            <div className="mt-1 text-2xl font-semibold">{ok}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Attenzione</div>
            <div className="mt-1 text-2xl font-semibold">{warn}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs opacity-60">Problema</div>
            <div className="mt-1 text-2xl font-semibold">{crit}</div>
          </div>
        </div>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">🔴 Problemi (critical first)</div>
            <div className="text-xs opacity-50">Mostra max 5</div>
          </div>

          {criticalFirst.length === 0 ? (
            <div className="mt-3 text-sm opacity-60">Nessun problema critico rilevato.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {criticalFirst.map((a) => (
                <Link
                  key={a.aptId}
                  href={`/app/host?apt=${encodeURIComponent(a.aptId)}`}
                  className="block rounded-xl bg-black/30 border border-white/10 p-3 hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs opacity-70">{a.readiness}</div>
                  </div>
                  <div className="mt-1 text-sm opacity-70">{a.lastEvent}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm opacity-70">Appartamenti</div>
            <div className="text-xs opacity-50">Vista compatta</div>
          </div>

          <div className="mt-3 space-y-2">
            {healthFiltered.map((a) => (
              <Link
                key={a.aptId}
                href={`/app/host?apt=${encodeURIComponent(a.aptId)}`}
                className="block rounded-xl bg-black/30 border border-white/10 p-4 hover:border-white/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="mt-1 text-xs opacity-60">Ultimo evento: {a.lastEvent}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs opacity-60">Stato</div>
                    <div className="font-semibold">
                      {a.status === "ok" && "🟢 OK"}
                      {a.status === "warn" && "🟡 Attenzione"}
                      {a.status === "crit" && "🔴 Problema"}
                    </div>
                    <div className="mt-1 text-xs opacity-70">{a.readiness}</div>
                  </div>
                </div>
              </Link>
            ))}

            {healthFiltered.length === 0 && (
              <div className="text-sm opacity-60">Nessun appartamento trovato.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}