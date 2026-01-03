import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { createPin, listPinsByApt, revokePin } from "@/app/lib/store";

export default async function HostPage() {
  // Next.js (versioni recenti) espone cookies() come async
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  // Salviamo i valori prima delle Server Actions (TS non “capisce” il narrowing dentro)
  const aptId = me.aptId;

  const pins = listPinsByApt(aptId);

  async function gen(formData: FormData) {
    "use server";
    const role = (formData.get("role")?.toString() ?? "guest") as any;
    const ttl = Number(formData.get("ttl")?.toString() ?? "120");
    createPin(role, aptId, ttl);
  }

  async function del(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    revokePin(pin);
  }

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-5 space-y-5">
      <h1 className="text-lg font-semibold">Host — Appartamento {aptId}</h1>

      <section className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="text-sm opacity-70 mb-3">Genera PIN</div>
        <form action={gen} className="grid grid-cols-3 gap-2">
          <select
            name="role"
            className="rounded-xl bg-black/40 border border-white/10 p-2"
            defaultValue="guest"
          >
            <option value="guest">Guest</option>
            <option value="cleaner">Cleaner</option>
            <option value="tech">Tech</option>
            <option value="host">Host</option>
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
        <div className="text-sm opacity-70 mb-3">PIN attivi</div>

        <div className="space-y-2">
          {pins.length === 0 && (
            <div className="text-sm opacity-50">Nessun PIN attivo</div>
          )}

          {pins.map((p) => (
            <div
              key={p.pin}
              className="flex items-center justify-between rounded-xl bg-black/30 border border-white/10 p-3"
            >
              <div>
                <div className="font-semibold tracking-widest">{p.pin}</div>
                <div className="text-xs opacity-60">
                  {p.role} • scade tra{" "}
                  {(() => {
                    const to = (p as any).validTo ?? p.expiresAt ?? (p as any).createdAt ?? Date.now();
                    return Math.max(0, Math.round((Number(to) - Date.now()) / 60000));
                  })()} min
                </div>
              </div>

              <form action={del}>
                <input type="hidden" name="pin" value={p.pin} />
                <button className="text-xs px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
                  Revoca
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <form action="/api/auth/logout" method="post">
        <button className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          Logout
        </button>
      </form>
    </main>
  );
}