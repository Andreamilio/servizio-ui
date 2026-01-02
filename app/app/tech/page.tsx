import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { getAccessLog, getIncidents, listApts, techStore } from "@/app/lib/techstore";

function pillStatus(s: "online" | "offline") {
  return s === "online"
    ? { dot: "bg-emerald-400", text: "ONLINE", box: "bg-emerald-500/10 border-emerald-400/20 text-emerald-200" }
    : { dot: "bg-red-400", text: "OFFLINE", box: "bg-red-500/10 border-red-400/20 text-red-200" };
}

function pillNet(n: "main" | "backup") {
  return n === "main"
    ? { text: "MAIN WAN", box: "bg-white/5 border-white/10 text-white/80" }
    : { text: "BACKUP WAN", box: "bg-white/5 border-white/10 text-white/80" };
}

export default async function TechPage({
  searchParams,
}: {
  searchParams?: { all?: string } | Promise<{ all?: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const apts = listApts();

  // gruppi (es. "Lakeside Tower") per sidebar espandibile
  const groups = Array.from(new Set(apts.map((a) => a.group)));

  const sp = await Promise.resolve(searchParams ?? {});
  const showAll = sp.all === "1";
  const logLimit = showAll ? 50 : 10;

  const accessLog = getAccessLog(logLimit);
  const incidents = getIncidents(6);

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      <div className="lg:hidden px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <div className="text-xs opacity-60">TECH</div>
          <div className="text-sm font-semibold">{techStore.clientName}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm">
            Logout
          </button>
        </form>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-4 lg:gap-6 p-4 lg:p-6">
        {/* SIDEBAR */}
        <aside className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-xs opacity-60">CLIENTS</div>
          </div>

          <div className="p-4">
            {/* Header cliente (NO dropdown) */}
            <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-3">
              <div className="font-semibold">{techStore.clientName}</div>
              <div className="text-xs opacity-60 mt-0.5">
                1 cliente • {apts.length} appartamenti
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs opacity-60 mb-3">APARTMENTS CLIENT</div>

              <div className="space-y-2 max-h-[50vh] lg:max-h-[70vh] overflow-auto pr-1">
                {groups.map((g) => {
                  const inGroup = apts.filter((a) => a.group === g);
                  return (
                    <details
                      key={g}
                      className="group/apt rounded-xl bg-black/20 border border-white/10 overflow-hidden"
                      open
                    >
                      <summary className="list-none cursor-pointer select-none px-3 py-2 hover:bg-black/25">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{g}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs opacity-60">{inGroup.length}</div>
                            <div className="text-xs opacity-60 transition-transform group-open/apt:rotate-180">▾</div>
                          </div>
                        </div>
                      </summary>

                      <div className="p-2 pt-0 space-y-2">
                        {inGroup.map((a) => (
                          <Link
                            key={a.aptId}
                            href={`/app/tech/apt/${a.aptId}`}
                            className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-3 py-2 hover:border-white/20"
                          >
                            <div className="text-sm">
                              <div className="font-semibold">{a.aptName}</div>
                              <div className="text-xs opacity-60">Apt {a.aptId}</div>
                            </div>
                            <div
                              className={`h-2 w-2 rounded-full ${
                                a.status === "online" ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                          </Link>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 text-xs opacity-60">
            TECH • monitoring
          </div>
        </aside>

        {/* CENTER */}
        <section className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="text-lg font-semibold">Status</div>
            </div>

            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 p-4 text-xs uppercase tracking-wider opacity-60">
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
                    className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 items-start sm:items-center rounded-xl bg-black/20 border border-white/10 px-4 py-3 hover:border-white/20 active:scale-[.99] transition"
                  >
                    <div className="font-semibold">{a.aptName}</div>

                    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${st.box}`}>
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      {st.text}
                    </div>

                    <div className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${net.box}`}>
                      {net.text}
                    </div>

                    <div className="text-sm opacity-90 mt-1 sm:mt-0">Last Access: {a.lastAccessLabel}</div>
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
              <div>
                <div className="text-sm font-semibold">LIVE ACCESS LOG</div>
                <div className="text-xs opacity-60">
                  {showAll ? "Ultimi 50 eventi" : "Ultimi 10 eventi"}
                </div>
              </div>

              {showAll ? (
                <Link className="text-xs opacity-70 hover:opacity-100" href="/app/tech">
                  Mostra meno
                </Link>
              ) : (
                <Link className="text-xs opacity-70 hover:opacity-100" href="/app/tech?all=1">
                  Mostra di più
                </Link>
              )}
            </div>

            <div className="p-4 space-y-3">
              {accessLog.length === 0 ? (
                <div className="text-sm opacity-60">Nessun evento.</div>
              ) : (
                accessLog.map((e) => (
                  <div key={e.id} className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-xs opacity-60">{e.tsLabel}</div>
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">Apt {e.aptId}</span>{" "}
                      <span className="opacity-70">|</span>{" "}
                      <span className="font-semibold">{e.title}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-70">{e.detail}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="text-sm font-semibold">INCIDENTS</div>
            </div>

            <div className="p-4 space-y-2">
              {incidents.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {i.type === "tamper" && "⚠️"}
                      {i.type === "offline" && "🛑"}
                      {i.type === "failed_access" && "❗"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{i.title}</div>
                      <div className="text-xs opacity-60">Apt {i.aptId} • {i.tsLabel}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form action="/api/auth/logout" method="post" className="hidden lg:block">
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              Logout
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}