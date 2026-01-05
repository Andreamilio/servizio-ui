import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession, validateSessionUser } from "@/app/lib/session";
import {
  listClients,
  getClient,
  listApartmentsByClient,
  getApartment,
  createClient,
  updateClient,
  deleteClient,
  createApartment,
  updateApartment,
  deleteApartment,
  type Client,
  type Apartment,
  type ApartmentStatus,
} from "@/app/lib/clientStore";

export const dynamic = "force-dynamic";

export default async function TechClientsPage({
  searchParams,
}: {
  searchParams?:
    | { action?: string; clientId?: string; aptId?: string; err?: string }
    | Promise<{ action?: string; clientId?: string; aptId?: string; err?: string }>;
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

  const sp = await Promise.resolve(searchParams ?? {});
  const action = sp.action;
  const clientId = sp.clientId;
  const aptId = sp.aptId;
  const err = sp.err;

  const clients = listClients();
  const selectedClient = clientId ? getClient(clientId) : null;
  const selectedApartment = aptId ? getApartment(aptId) : null;

  // Server Actions - Client
  async function handleCreateClient(formData: FormData) {
    "use server";
    const id = (formData.get("clientId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();

    if (!id || !name) {
      redirect("/app/tech/clients?action=create&err=missing");
    }

    try {
      createClient(id, name);
    } catch (error: any) {
      redirect(`/app/tech/clients?action=create&err=${encodeURIComponent(error.message)}`);
    }
    
    redirect("/app/tech/clients");
  }

  async function handleUpdateClient(formData: FormData) {
    "use server";
    const id = (formData.get("clientId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();

    if (!id || !name) {
      redirect(`/app/tech/clients?action=edit&clientId=${id}&err=missing`);
    }

    const updated = updateClient(id, name);
    if (!updated) {
      redirect("/app/tech/clients?err=notfound");
    }

    redirect(`/app/tech/clients?clientId=${id}`);
  }

  async function handleDeleteClient(formData: FormData) {
    "use server";
    const id = formData.get("clientId")?.toString() ?? "";
    if (!id) return;

    deleteClient(id);
    redirect("/app/tech/clients");
  }

  // Server Actions - Apartment
  async function handleCreateApartment(formData: FormData) {
    "use server";
    const cId = (formData.get("clientId")?.toString() ?? "").trim();
    const id = (formData.get("aptId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();
    const status = (formData.get("status")?.toString() ?? "ok") as ApartmentStatus;
    const addressShort = (formData.get("addressShort")?.toString() ?? "").trim() || undefined;

    if (!cId || !id || !name) {
      redirect(`/app/tech/clients?action=createApt&clientId=${cId}&err=missing`);
    }

    try {
      createApartment(cId, id, {
        name,
        status,
        addressShort,
        // I dettagli (WiFi, Check-in/out, Rules, Contatti) vengono aggiunti successivamente dall'host
      });
    } catch (error: any) {
      redirect(`/app/tech/clients?action=createApt&clientId=${cId}&err=${encodeURIComponent(error.message)}`);
    }
    
    redirect(`/app/tech/clients?clientId=${cId}`);
  }

  async function handleUpdateApartment(formData: FormData) {
    "use server";
    const id = (formData.get("aptId")?.toString() ?? "").trim();
    const name = (formData.get("name")?.toString() ?? "").trim();
    const status = (formData.get("status")?.toString() ?? "ok") as ApartmentStatus;
    const addressShort = (formData.get("addressShort")?.toString() ?? "").trim() || undefined;

    if (!id || !name) {
      redirect(`/app/tech/clients?action=editApt&aptId=${id}&err=missing`);
    }

    const apt = getApartment(id);
    if (!apt) {
      redirect("/app/tech/clients?err=aptnotfound");
    }

    // Aggiorna solo i campi base, i dettagli vengono gestiti dall'host
    updateApartment(id, {
      name,
      status,
      addressShort,
    });

    redirect(`/app/tech/clients?clientId=${apt.clientId}`);
  }

  async function handleDeleteApartment(formData: FormData) {
    "use server";
    const id = formData.get("aptId")?.toString() ?? "";
    const cId = formData.get("clientId")?.toString() ?? "";
    if (!id) return;

    deleteApartment(id);
    redirect(`/app/tech/clients?clientId=${cId}`);
  }

  // Determine view mode
  const isCreateClient = action === "create";
  const isEditClient = action === "edit" && selectedClient;
  const isCreateApt = action === "createApt" && selectedClient;
  const isEditApt = action === "editApt" && selectedApartment;
  const isClientDetail = clientId && selectedClient && !action;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Torna a Tech
          </Link>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Gestione Clienti e Appartamenti</div>
              <div className="text-sm opacity-70">Crea e gestisci clienti e appartamenti</div>
            </div>
            {!isCreateClient && !isEditClient && !isCreateApt && !isEditApt && !isClientDetail && (
              <Link
                href="/app/tech/clients?action=create"
                className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
              >
                + Nuovo Cliente
              </Link>
            )}
          </div>

          {/* Error Messages */}
          {err === "missing" && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
              Compila tutti i campi obbligatori
            </div>
          )}
          {err === "notfound" && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
              Cliente non trovato
            </div>
          )}
          {err === "aptnotfound" && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
              Appartamento non trovato
            </div>
          )}
          {err && err !== "missing" && err !== "notfound" && err !== "aptnotfound" && err !== "NEXT_REDIRECT" && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm">
              {decodeURIComponent(err)}
            </div>
          )}

          {/* Form Create Client */}
          {isCreateClient && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="text-sm font-semibold mb-4">Crea Nuovo Cliente</div>
              <form action={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Client ID</label>
                  <input
                    type="text"
                    name="clientId"
                    required
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="es: company-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                  >
                    Crea Cliente
                  </button>
                  <Link
                    href="/app/tech/clients"
                    className="rounded-xl bg-[var(--bg-card)] hover:bg-white/10 border border-[var(--border-light)] px-6 py-3 font-semibold"
                  >
                    Annulla
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* Form Edit Client */}
          {isEditClient && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="text-sm font-semibold mb-4">Modifica Cliente: {selectedClient!.name}</div>
              <form action={handleUpdateClient} className="space-y-4">
                <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                <div>
                  <label className="block text-sm font-medium mb-2">Client ID (non modificabile)</label>
                  <input
                    type="text"
                    value={selectedClient!.clientId}
                    disabled
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-white/60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedClient!.name}
                    required
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                  >
                    Salva Modifiche
                  </button>
                  <Link
                    href={`/app/tech/clients?clientId=${selectedClient!.clientId}`}
                    className="rounded-xl bg-[var(--bg-card)] hover:bg-white/10 border border-[var(--border-light)] px-6 py-3 font-semibold"
                  >
                    Annulla
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* Form Create Apartment */}
          {isCreateApt && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="text-sm font-semibold mb-4">Crea Nuovo Appartamento per {selectedClient!.name}</div>
              <form action={handleCreateApartment} className="space-y-4">
                <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Apartment ID *</label>
                    <input
                      type="text"
                      name="aptId"
                      required
                      className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="es: 101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      name="status"
                      defaultValue="ok"
                      className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="ok">OK</option>
                      <option value="warn">Warn</option>
                      <option value="crit">Crit</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Indirizzo breve</label>
                  <input
                    type="text"
                    name="addressShort"
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="es: Via Demo 12, Milano"
                  />
                </div>
                <div className="text-xs opacity-60 mt-2">
                  I dettagli (Wi-Fi, Check-in/out, House Rules, Contatti) possono essere aggiunti successivamente dall'host nella vista appartamento.
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                  >
                    Crea Appartamento
                  </button>
                  <Link
                    href={`/app/tech/clients?clientId=${selectedClient!.clientId}`}
                    className="rounded-xl bg-[var(--bg-card)] hover:bg-white/10 border border-[var(--border-light)] px-6 py-3 font-semibold"
                  >
                    Annulla
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* Form Edit Apartment */}
          {isEditApt && (
            <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
              <div className="text-sm font-semibold mb-4">Modifica Appartamento: {selectedApartment!.name}</div>
              <form action={handleUpdateApartment} className="space-y-4">
                <input type="hidden" name="aptId" value={selectedApartment!.aptId} />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Apartment ID (non modificabile)</label>
                    <input
                      type="text"
                      value={selectedApartment!.aptId}
                      disabled
                      className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-white/60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      name="status"
                      defaultValue={selectedApartment!.status}
                      className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="ok">OK</option>
                      <option value="warn">Warn</option>
                      <option value="crit">Crit</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedApartment!.name}
                    required
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Indirizzo breve</label>
                  <input
                    type="text"
                    name="addressShort"
                    defaultValue={selectedApartment!.addressShort ?? ""}
                    className="w-full rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] px-4 py-2 text-[var(--text-primary)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="text-xs opacity-60 mt-2">
                  I dettagli (Wi-Fi, Check-in/out, House Rules, Contatti) possono essere modificati dall'host nella vista appartamento.
                </div>
                <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                  >
                    Salva Modifiche
                  </button>
                  <Link
                    href={`/app/tech/clients?clientId=${selectedApartment!.clientId}`}
                    className="rounded-xl bg-[var(--bg-card)] hover:bg-white/10 border border-[var(--border-light)] px-6 py-3 font-semibold"
                  >
                    Annulla
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* Client Detail View */}
          {isClientDetail && (
            <>
              <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-lg font-semibold">{selectedClient!.name}</div>
                    <div className="text-sm opacity-70">Client ID: {selectedClient!.clientId}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/app/tech/clients?action=edit&clientId=${selectedClient!.clientId}`}
                      className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
                    >
                      Modifica Cliente
                    </Link>
                    <form action={handleDeleteClient}>
                      <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                      <button
                        type="submit"
                        className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-4 py-2 font-semibold text-sm"
                      >
                        Elimina Cliente
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold">Appartamenti ({listApartmentsByClient(selectedClient!.clientId).length})</div>
                <Link
                  href={`/app/tech/clients?action=createApt&clientId=${selectedClient!.clientId}`}
                  className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
                >
                  + Nuovo Appartamento
                </Link>
              </div>

              <div className="space-y-2">
                {listApartmentsByClient(selectedClient!.clientId).length === 0 ? (
                  <div className="text-sm opacity-60 py-8 text-center">Nessun appartamento configurato</div>
                ) : (
                  listApartmentsByClient(selectedClient!.clientId).map((apt) => {
                    const statusColors = {
                      ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
                      warn: "bg-amber-50 border-amber-200 text-amber-700",
                      crit: "bg-red-50 border-red-200 text-red-700",
                    };
                    return (
                      <div key={apt.aptId} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">{apt.name}</div>
                            <div className={`text-xs px-2 py-0.5 rounded border ${statusColors[apt.status]}`}>
                              {apt.status.toUpperCase()}
                            </div>
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {apt.aptId} {apt.addressShort && `• ${apt.addressShort}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/tech/clients?action=editApt&aptId=${apt.aptId}`}
                            className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-3 py-1.5 font-semibold text-xs"
                          >
                            Modifica
                          </Link>
                          <form action={handleDeleteApartment}>
                            <input type="hidden" name="aptId" value={apt.aptId} />
                            <input type="hidden" name="clientId" value={selectedClient!.clientId} />
                            <button
                              type="submit"
                              className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-3 py-1.5 font-semibold text-xs"
                            >
                              Elimina
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Client List View (default) */}
          {!isCreateClient && !isEditClient && !isCreateApt && !isEditApt && !isClientDetail && (
            <div className="space-y-2">
              {clients.length === 0 ? (
                <div className="text-sm opacity-60 py-8 text-center">Nessun cliente configurato. Clicca "Nuovo Cliente" per iniziare.</div>
              ) : (
                clients.map((client) => (
                  <Link
                    key={client.clientId}
                    href={`/app/tech/clients?clientId=${client.clientId}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-4 hover:bg-[var(--bg-secondary)] transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{client.name}</div>
                      <div className="text-xs opacity-60 mt-1">
                        {client.clientId} • {client.apartments.length} appartamenti
                      </div>
                    </div>
                    <div className="text-xs opacity-60">→</div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

