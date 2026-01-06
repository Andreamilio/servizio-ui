import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { getIncidents, listApts, techStore } from "@/app/lib/techstore";
import * as Store from "@/app/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pillStatus(s: "online" | "offline") {
  return s === "online"
    ? {
        dot: "bg-emerald-400",
        text: "ONLINE",
        box: "bg-[var(--pastel-green)] border-[var(--border-light)] text-[var(--accent-success)]",
      }
    : {
        dot: "bg-red-400",
        text: "OFFLINE",
        box: "bg-red-100 border-[var(--border-light)] text-[var(--accent-error)]",
      };
}

function pillNet(n: "main" | "backup") {
  return n === "main"
    ? { text: "MAIN WAN", box: "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-primary)]" }
    : { text: "BACKUP WAN", box: "bg-[var(--bg-secondary)] border-[var(--border-light)] text-[var(--text-primary)]" };
}

export default async function TechPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const apts = listApts();

  // ✅ Shared audit log (same source as Host)
  const accessLog = (Store.accessLog ?? []).slice(0, 10).map((e) => {
    const tsLabel = new Date(e.ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const title =
      e.type === "door_opened"
        ? "Door Opened"
        : e.type === "door_closed"
        ? "Door Closed"
        : e.type === "pin_created"
        ? "PIN Created"
        : e.type === "pin_revoked"
        ? "PIN Revoked"
        : e.type === "cleaning_done"
        ? "Cleaning Done"
        : e.type === "problem_reported"
        ? "Problem Reported"
        : e.type === "guest_access_ok"
        ? "Guest Access OK"
        : e.type === "guest_access_ko"
        ? "Guest Access KO"
        : e.type === "cleaner_access_ok"
        ? "Cleaner Access OK"
        : String(e.type);

    return {
      id: String(e.id),
      tsLabel,
      aptId: String(e.aptId),
      title,
      detail: String(e.label ?? ""),
      level: "ok" as const,
    };
  });

  const incidents = getIncidents(6);

  const totalApts = apts.length;
  const online = apts.filter((a) => a.status === "online").length;
  const offline = totalApts - online;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
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
        <aside className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-light)]">
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
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-2 hover:border-[var(--border-medium)]"
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

          <div className="p-4 border-t border-[var(--border-light)] text-xs opacity-60">
            TECH • monitoring
          </div>
        </aside>

        {/* CENTER */}
        <section className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
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
                    className="block rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--border-medium)]"
                  >
                    <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-center md:gap-2">
                      <div>
                        <div className="font-semibold">{a.aptName}</div>
                        <div className="text-xs opacity-60">{a.group}</div>
                      </div>

                      <div>
                        <div
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${st.box}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                          {st.text}
                        </div>
                      </div>

                      <div>
                        <div
                          className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold ${net.box}`}
                        >
                          {net.text}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs opacity-80 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2 md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-sm md:opacity-90">
                          Last Access: <span className="opacity-100">{a.lastAccessLabel}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
              <div className="text-sm font-semibold">LIVE ACCESS LOG</div>
              <Link href="/app/tech/log" className="text-xs opacity-60 hover:opacity-100">
                Mostra di più
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {accessLog.map((e) => (
                <div key={e.id} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
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

          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)]">
              <div className="text-sm font-semibold">INCIDENTS</div>
            </div>

            <div className="p-4 space-y-2">
              {incidents.length === 0 ? (
                <div className="text-sm opacity-60">Nessun incidente recente.</div>
              ) : (
                incidents.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-3"
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
            <button className="w-full rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-4 py-3">
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