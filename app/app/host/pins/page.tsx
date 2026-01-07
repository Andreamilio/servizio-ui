import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { createPin, listPinsByApt, revokePin, type Role, type PinRecord } from "@/app/lib/store";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Key, X, LogOut } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function HostPage() {
  // Next.js (versioni recenti) espone cookies() come async
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "host") {
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  // Salviamo i valori prima delle Server Actions (TS non "capisce" il narrowing dentro)
  const aptId = me.aptId;

  const pins = listPinsByApt(aptId);

  async function gen(formData: FormData) {
    "use server";
    const role = (formData.get("role")?.toString() ?? "guest") as Role;
    const ttl = Number(formData.get("ttl")?.toString() ?? "120");
    createPin(role, aptId, ttl);
    revalidatePath("/app/host/pins");
    redirect("/app/host/pins");
  }

  async function del(formData: FormData) {
    "use server";
    const pin = formData.get("pin")?.toString() ?? "";
    revokePin(pin);
    revalidatePath("/app/host/pins");
    redirect("/app/host/pins");
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Gestione PIN</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Appartamento {aptId}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button variant="ghost" size="sm" icon={LogOut} type="submit">
              Logout
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[var(--text-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Genera PIN</h2>
              </div>
            </CardHeader>
            <CardBody>
              <form action={gen} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Ruolo</label>
                    <select
                      name="role"
                      className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                      defaultValue="guest"
                    >
                      <option value="guest">Guest</option>
                      <option value="cleaner">Cleaner</option>
                      <option value="tech">Tech</option>
                      <option value="host">Host</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      name="ttl"
                      type="number"
                      label="TTL (minuti)"
                      defaultValue="120"
                      placeholder="120"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="primary" fullWidth>
                      Crea PIN
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">TTL in minuti (es. 120 = 2 ore)</p>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">PIN attivi</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {pins.length === 0 && (
                  <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                    Nessun PIN attivo
                  </div>
                )}

                {pins.map((p) => (
                  <div
                    key={p.pin}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
                  >
                    <div>
                      <div className="font-mono font-semibold text-lg tracking-widest text-[var(--text-primary)]">{p.pin}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {p.role} • scade tra{" "}
                        {(() => {
                          const pinRecord = p as PinRecord;
                          const to = pinRecord.validTo ?? pinRecord.expiresAt ?? pinRecord.createdAt ?? Date.now();
                          return Math.max(0, Math.round((Number(to) - Date.now()) / 60000));
                        })()} min
                      </div>
                    </div>

                    <form action={del}>
                      <input type="hidden" name="pin" value={p.pin} />
                      <Button variant="danger" size="sm" icon={X} type="submit">
                        Revoca
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}