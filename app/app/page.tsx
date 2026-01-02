import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { getAccessLog, getIncidents, listApts, techStore } from "@/app/lib/techstore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pillStatus(s: "online" | "offline") {
  return s === "online"
    ? {
        dot: "bg-emerald-400",
        text: "ONLINE",
        box: "bg-emerald-500/10 border-emerald-400/20 text-emerald-200",
      }
    : {
        dot: "bg-red-400",
        text: "OFFLINE",
        box: "bg-red-500/10 border-red-400/20 text-red-200",
      };
}

function pillNet(n: "main" | "backup") {
  return n === "main"
    ? { text: "MAIN WAN", box: "bg-white/5 border-white/10 text-white/80" }
    : { text: "BACKUP WAN", box: "bg-white/5 border-white/10 text-white/80" };
}

export default async function TechPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const apts = listApts();
  const accessLog = getAccessLog(10);
  const incidents = getIncidents(6);

  const totalApts = apts.length;
  const online = apts.filter((a) => a.status === "online").length;
  const offline = totalApts - online;

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      {/* MOBILE HEADER */}
      <div className="p-4 md:hidden">
        <div className="text-xs opacity-60">TECH • monitoring</div>
        <div className="mt-1 text-lg font-semibold">{techStore.clientName}</div>
        <div className="mt-1 text-xs opacity-60">
          {totalApts} appartamenti • {online} online • {offline} offline
        </div>
      </div>

      {/* DESKTOP GRID / MOBILE STACK */}
      <div className="p-4 md:p-6 md:grid md:grid-cols-[280px_1fr_360px] md:gap-6 space-y-4 md:space-y-0">
        {/* SIDEBAR (mobile collapsible) */}
        <aside className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-xs opacity-60">CLIENT</div>
            <div className="mt-2 font-semibold">{techStore.clientName}</div>
            <div className="mt-1 text-xs opacity-60">
              {totalApts} appartamenti • {online} online • {offline} offline
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs opacity-60 mb-3">APARTMENTS</div>

            <div className="space-y-2 max-h-[52vh] md:max-h-[70vh] overflow-auto pr-1">
              {apts.map((a) => (
                <Link
                  key={a.aptId}
                  href={`/app/tech/apt/${a.aptId}`}
                  className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-3 py-2 hover:border-white/20"
                >
                  <div className="text-sm">
                    <div className="font-semibold">{a.aptName}</div>
                    <div className="text-xs opacity-60">{a.group}</div>
                  </div>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      a.status === "online" ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                </Link>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/10 text-xs opacity-60">
            TECH • monitoring
          </div>
        </aside>

        {/* CENTER */}
        <section className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Status</div>
                <div className="text-xs opacity-60 hidden md:block">
                  Click su una riga per aprire il dettaglio appartamento
                </div>
              </div>
              <div className="text-xs opacity-60 md:hidden">Tap per dettagli</div>
            </div>

            {/* desktop header */}
            <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 p-4 text-xs uppercase tracking-wider opacity-60">
              <div>Apartment</div>
              <div>Status</div>
              <div>Network</div>
              <div>Last Access</div>
            </div>

            <div className="px-4 pb-4 space-y-2">
              {apts.map((a) => {
                const st = pillStatus(a.status);
                const net = pillNet(a.network);
                return (
                  <Link
                    key={a.aptId}
                    href={`/app/tech/apt/${a.aptId}`}
                    className="block rounded-xl bg-black/20 border border-white/10 hover:border-white/20"
                  >
                    {/* mobile row */}
                    <div className="md:hidden p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{a.aptName}</div>
                          <div className="text-xs opacity-60">{a.group}</div>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${st.box}`}>
                          <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                          {st.text}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${net.box}`}>{net.text}</div>
                        <div className="text-xs opacity-80 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                          Last access: <span className="opacity-100">{a.lastAccessLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* desktop grid row */}
                    <div className="hidden md:grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 items-center px-4 py-3">
                      <div className="font-semibold">{a.aptName}</div>

                      <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${st.box}`}>
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        {st.text}
                      </div>

                      <div className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${net.box}`}>
                        {net.text}
                      </div>

                      <div className="text-sm opacity-90">Last Access: {a.lastAccessLabel}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm font-semibold">LIVE ACCESS LOG</div>
              <Link href="/app/tech/log" className="text-xs opacity-60 hover:opacity-100">
                Mostra di più
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {accessLog.map((e) => (
                <div key={e.id} className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-xs opacity-60">{e.tsLabel}</div>
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">Apt {e.aptId}</span> <span className="opacity-70">|</span>{" "}
                    <span className="font-semibold">{e.title}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">{e.detail}</div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <div className="text-xs opacity-60">Mostrati ultimi 10 eventi</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="text-sm font-semibold">INCIDENTS</div>
            </div>

            <div className="p-4 space-y-2">
              {incidents.length === 0 ? (
                <div className="text-sm opacity-60">Nessun incidente recente.</div>
              ) : (
                incidents.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg">
                        {i.type === "tamper" && "⚠️"}
                        {i.type === "offline" && "🛑"}
                        {i.type === "failed_access" && "❗"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{i.title}</div>
                        <div className="text-xs opacity-60">
                          Apt {i.aptId} • {i.tsLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              Logout
            </button>
          </form>

          <Link className="block text-center text-xs opacity-60 hover:opacity-100" href="/app/cleaner">
            Vai a Cleaner (debug)
          </Link>
        </aside>
      </div>
    </main>
  );
}