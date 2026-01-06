import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getAccessLog, getIncidents, listApts, techStore } from "@/app/lib/techstore";
import { listClients } from "@/app/lib/clientStore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { UserProfile } from "../components/UserProfile";
import { ClientAccordion } from "./components/ClientAccordion";

function pillStatus(s: "online" | "offline") {
  return s === "online"
    ? { dot: "bg-emerald-500", text: "ONLINE", box: "bg-[var(--pastel-green)] border-[var(--border-light)] text-[var(--accent-success)]" }
    : { dot: "bg-red-500", text: "OFFLINE", box: "bg-red-100 border-[var(--border-light)] text-[var(--accent-error)]" };
}

function pillNet(n: "main" | "backup") {
  return n === "main"
    ? { text: "MAIN WAN", box: "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)]" }
    : { text: "BACKUP WAN", box: "bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-primary)]" };
}

export default async function TechPage({
  searchParams,
}: {
  searchParams?: { all?: string } | Promise<{ all?: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const session = readSession(sess);
  const me = validateSessionUser(session);

  if (!me || me.role !== "tech") {
    // Se la sessione era valida ma l'utente è disabilitato, fai logout
    if (session && session.userId && session.role === "tech") {
      redirect("/api/auth/logout");
    }
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const apts = listApts();
  const clients = listClients();
  const clientsCount = clients.length;

  // Raggruppare appartamenti per cliente
  const apartmentsByClient = new Map<string, typeof apts>();
  apts.forEach((apt) => {
    const clientName = apt.group; // Il campo group contiene il nome del cliente
    if (!apartmentsByClient.has(clientName)) {
      apartmentsByClient.set(clientName, []);
    }
    apartmentsByClient.get(clientName)!.push(apt);
  });

  const sp = await Promise.resolve(searchParams ?? {});
  const showAll = sp.all === "1";
  const logLimit = showAll ? 50 : 10;

  const accessLog = getAccessLog(logLimit);
  const incidents = getIncidents(6);

  const techUser = me.userId ? getUser(me.userId) : null;

  const totalApts = apts.length;
  const online = apts.filter((a) => a.status === "online").length;
  const offline = totalApts - online;

  return (
    <AppLayout 
      role="tech" 
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-6 p-4 lg:p-6">
        {/* CENTER */}
        <section className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)]">
              <div className="text-lg font-semibold">Status</div>
              <div className="text-sm opacity-60 mt-1">
                {totalApts} appartamenti • {online} online • {offline} offline
              </div>
            </div>

            <div className="p-4 space-y-3">
              {Array.from(apartmentsByClient.entries()).map(([clientName, clientApts]) => (
                <ClientAccordion
                  key={clientName}
                  clientName={clientName}
                  apartments={clientApts.map((a) => ({
                    aptId: a.aptId,
                    aptName: a.aptName,
                    status: a.status,
                    network: a.network,
                    lastAccessLabel: a.lastAccessLabel,
                  }))}
                />
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
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
                  <div key={e.id} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
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

          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)]">
              <div className="text-sm font-semibold">INCIDENTS</div>
            </div>

            <div className="p-4 space-y-2">
              {incidents.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-3">
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
        </aside>
      </div>
    </AppLayout>
  );
}