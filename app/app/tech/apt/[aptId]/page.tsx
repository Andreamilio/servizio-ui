import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import {
  closeDoor,
  getAccessLogByApt,
  getApt,
  getSensorsByApt,
  openDoor,
  revokeAccess,
  toggleSensor,
  toggleVpn,
  toggleWan,
} from "@/app/lib/techstore";

export const dynamic = "force-dynamic";

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export default async function TechAptPage({
  params,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  if (!aptId) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Back
        </Link>
        <div className="mt-3 text-lg font-semibold">AptId mancante (routing)</div>
        <div className="text-sm opacity-60">
          La route non sta passando correttamente il parametro: prova ad aprire
          <span className="font-semibold"> /app/tech/apt/101</span>
        </div>
      </main>
    );
  }
  const apt = getApt(aptId);
  const aptLog = getAccessLogByApt(aptId, 20);

  const sensors = getSensorsByApt(aptId);
  const controllable = sensors.filter((s) => s.controllable);
  const onlineCount = sensors.filter((s) => s.status === "online").length;

  if (!apt) {
    return (
      <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Back
        </Link>
        <div className="mt-3 text-lg font-semibold">Appartamento non trovato</div>
        <div className="text-sm opacity-60">AptId: {aptId}</div>
      </main>
    );
  }

  async function actOpenDoor() {
    "use server";
    openDoor(aptId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actCloseDoor() {
    "use server";
    closeDoor(aptId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actRevoke() {
    "use server";
    revokeAccess(aptId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actWan() {
    "use server";
    toggleWan(aptId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actVpn() {
    "use server";
    toggleVpn(aptId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  async function actToggleSensor(formData: FormData) {
    "use server";
    const sensorId = String(formData.get("sensorId") || "");
    if (!sensorId) return;
    toggleSensor(aptId, sensorId);
    revalidatePath("/app/tech");
    revalidatePath(`/app/tech/apt/${aptId}`);
    redirect(`/app/tech/apt/${aptId}?r=${Date.now()}`);
  }

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="lg:hidden rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs opacity-60">TECH</div>
              <div className="text-sm font-semibold truncate">{apt.aptName}</div>
              <div className="text-xs opacity-60 truncate">{apt.group}</div>
            </div>
            <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
              ← Back
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Chip label="WAN" value={apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"} />
            <Chip label="VPN" value={apt.vpn.toUpperCase()} />
            <Chip label="DOOR" value={apt.door.toUpperCase()} />
            <details className="group">
              <summary className="list-none">
                <div className="cursor-pointer">
                  <Chip label="SENSORS" value={`${onlineCount}/${sensors.length} online`} />
                </div>
              </summary>

              <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider opacity-60">Dettaglio sensori</div>
                  <div className="text-xs opacity-60">
                    {controllable.length} controllabili
                  </div>
                </div>

                <div className="space-y-2">
                  {sensors.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/20 border border-white/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{s.name}</div>
                        <div className="text-[11px] opacity-60 truncate">
                          {s.kind.toUpperCase()} • {s.status.toUpperCase()}
                        </div>
                      </div>

                      {s.controllable ? (
                        <form action={actToggleSensor}>
                          <input type="hidden" name="sensorId" value={s.id} />
                          <button className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold">
                            {s.state === "on" ? "Spegni" : "Accendi"}
                          </button>
                        </form>
                      ) : (
                        <div
                          className={`h-2 w-2 rounded-full ${
                            s.status === "online" ? "bg-emerald-400" : "bg-red-400"
                          }`}
                          aria-label={s.status}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] opacity-60">
                  Tip: su desktop trovi lo stesso pannello nella card “SENSORS”.
                </div>
              </div>
            </details>
          </div>
        </div>
        <Link className="hidden lg:inline-block text-sm opacity-70 hover:opacity-100" href="/app/tech">
          ← Torna a Tech
        </Link>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{apt.aptName}</div>
              <div className="text-sm opacity-70">{apt.group}</div>
            </div>

            <div className="text-left sm:text-right text-sm">
              <div className="opacity-60">Last access</div>
              <div className="font-semibold">{apt.lastAccessLabel}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="opacity-60 text-xs">WAN</div>
              <div className="font-semibold">
                {apt.network === "main" ? "MAIN WAN" : "BACKUP WAN"}
              </div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="opacity-60 text-xs">VPN</div>
              <div className="font-semibold">{apt.vpn.toUpperCase()}</div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="opacity-60 text-xs">DOOR</div>
              <div className="font-semibold">{apt.door.toUpperCase()}</div>
            </div>
            <details className="rounded-xl bg-black/20 border border-white/10 p-3 group">
              <summary className="list-none cursor-pointer">
                <div className="opacity-60 text-xs">SENSORS</div>
                <div className="font-semibold">
                  {onlineCount}/{sensors.length} online
                </div>
                <div className="text-[11px] opacity-60 mt-1">Click per dettaglio</div>
              </summary>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider opacity-60">Dettaglio sensori</div>
                  <div className="text-xs opacity-60">{controllable.length} controllabili</div>
                </div>

                <div className="space-y-2">
                  {sensors.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{s.name}</div>
                        <div className="text-[11px] opacity-60 truncate">
                          {s.kind.toUpperCase()} • {s.status.toUpperCase()}
                        </div>
                      </div>

                      {s.controllable ? (
                        <form action={actToggleSensor}>
                          <input type="hidden" name="sensorId" value={s.id} />
                          <button className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold">
                            {s.state === "on" ? "Spegni" : "Accendi"}
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              s.status === "online" ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            aria-label={s.status}
                          />
                          <div className="text-xs opacity-70">{s.status}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] opacity-60">
                  I toggle sono mock in-memory: vedrai l’effetto al refresh automatico.
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-3">Azioni rapide</div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            {/* Primary CTA depends on door state */}
            {apt.door === "unlocked" ? (
              <>
                <form action={actCloseDoor} className="flex-1">
                  <button className="w-full sm:w-auto rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 font-semibold">
                    Chiudi porta
                  </button>
                </form>
                <form action={actOpenDoor} className="flex-1">
                  <button className="w-full sm:w-auto rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 px-4 py-2 font-semibold">
                    Apri porta
                  </button>
                </form>
              </>
            ) : (
              <>
                <form action={actOpenDoor} className="flex-1">
                  <button className="w-full sm:w-auto rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-4 py-2 font-semibold">
                    Apri porta
                  </button>
                </form>
                <form action={actCloseDoor} className="flex-1">
                  <button className="w-full sm:w-auto rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 font-semibold">
                    Chiudi porta
                  </button>
                </form>
              </>
            )}

            <form action={actRevoke}>
              <button className="w-full sm:w-auto rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold">
                Revoca accessi
              </button>
            </form>

            <form action={actWan}>
              <button className="w-full sm:w-auto rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 font-semibold">
                Switch WAN
              </button>
            </form>

            <form action={actVpn}>
              <button className="w-full sm:w-auto rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 font-semibold">
                Toggle VPN
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm font-semibold">LOG — {apt.aptName}</div>
          </div>

          <div className="p-4 space-y-2">
            {aptLog.length === 0 ? (
              <div className="text-sm opacity-60">Nessun evento.</div>
            ) : (
              aptLog.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl bg-black/20 border border-white/10 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs opacity-60">{e.tsLabel}</div>
                    <div className="text-[10px] opacity-50">Apt {aptId}</div>
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug">{e.title}</div>
                  <div className="mt-1 text-xs opacity-70 leading-snug">{e.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs opacity-60">
          Nota: store in memoria (dev). Ogni azione forza refresh via redirect.
        </div>
      </div>
    </main>
  );
}