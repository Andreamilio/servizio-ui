import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import {
  listUsers,
  createUser,
  updateUser,
  updateUserPassword,
  disableUser,
  enableUser,
  deleteUser,
  type User,
  type UserRole,
} from "@/app/lib/userStore";
import { listClients } from "@/app/lib/clientStore";

export const dynamic = "force-dynamic";

export default async function TechUsersPage({
  searchParams,
}: {
  searchParams?: { action?: string; userId?: string; err?: string } | Promise<{ action?: string; userId?: string; err?: string }>;
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
    return <div className="p-6 text-white">Non autorizzato</div>;
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const action = sp.action;
  const userId = sp.userId;

  const users = listUsers();
  const clients = listClients();

  // Server Actions
  async function handleCreate(formData: FormData) {
    "use server";
    const username = (formData.get("username")?.toString() ?? "").trim();
    const password = (formData.get("password")?.toString() ?? "").trim();
    const role = (formData.get("role")?.toString() ?? "tech") as UserRole;
    const clientId = (formData.get("clientId")?.toString() ?? "").trim() || undefined;

    if (!username || !password) {
      redirect("/app/tech/users?err=missing");
      return;
    }

    try {
      createUser({ username, password, role, clientId });
      redirect("/app/tech/users");
    } catch (error) {
      redirect("/app/tech/users?err=exists");
    }
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    const id = (formData.get("userId")?.toString() ?? "").trim();
    if (!id) return;

    const username = (formData.get("username")?.toString() ?? "").trim();
    const role = (formData.get("role")?.toString() ?? "tech") as UserRole;
    const clientId = (formData.get("clientId")?.toString() ?? "").trim() || undefined;

    try {
      updateUser(id, { username, role, clientId });
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("già esistente")) {
        redirect(`/app/tech/users?action=edit&userId=${id}&err=exists`);
      }
      throw error; // Rilancia altri errori
    }
    redirect("/app/tech/users");
  }

  async function handleUpdatePassword(formData: FormData) {
    "use server";
    const id = (formData.get("userId")?.toString() ?? "").trim();
    const newPassword = (formData.get("newPassword")?.toString() ?? "").trim();

    if (!id || !newPassword) return;

    updateUserPassword(id, newPassword);
    redirect("/app/tech/users");
  }

  async function handleToggleEnabled(formData: FormData) {
    "use server";
    const userId = formData.get("userId")?.toString() ?? "";
    const enabled = formData.get("enabled") === "true";
    if (!userId) return;
    if (enabled) {
      enableUser(userId);
    } else {
      disableUser(userId);
    }
    redirect("/app/tech/users");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const userId = formData.get("userId")?.toString() ?? "";
    if (!userId) return;
    deleteUser(userId);
    redirect("/app/tech/users");
  }

  const err = sp.err;
  const selectedUser = userId ? users.find((u) => u.userId === userId) : null;
  const isEditMode = action === "edit" && selectedUser;
  const isCreateMode = action === "create";

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Torna a Tech
          </Link>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Gestione Utenti</div>
              <div className="text-sm opacity-70">Tech e Host users</div>
            </div>
            {!isCreateMode && !isEditMode && (
              <Link
                href="/app/tech/users?action=create"
                className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
              >
                + Nuovo Utente
              </Link>
            )}
          </div>

          {err === "missing" && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-sm">
              Username e password sono obbligatori
            </div>
          )}

          {err === "exists" && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-sm">
              Username già esistente
            </div>
          )}

          {/* Form Create/Edit */}
          {(isCreateMode || isEditMode) && (
            <div className="mb-6 p-4 rounded-xl bg-black/20 border border-white/10">
              <div className="text-sm font-semibold mb-4">
                {isCreateMode ? "Crea Nuovo Utente" : `Modifica: ${selectedUser?.username}`}
              </div>

              {isCreateMode ? (
                <form action={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      required
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ruolo</label>
                    <select
                      name="role"
                      defaultValue="tech"
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="tech">Tech</option>
                      <option value="host">Host</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Client (solo per Host, opzionale)</label>
                    <select
                      name="clientId"
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Nessuno (accesso a tutti i client)</option>
                      {clients.map((c) => (
                        <option key={c.clientId} value={c.clientId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/10">
                    <button
                      type="submit"
                      className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                    >
                      Crea Utente
                    </button>
                    <Link
                      href="/app/tech/users"
                      className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 font-semibold"
                    >
                      Annulla
                    </Link>
                  </div>
                </form>
              ) : (
                <>
                  <form action={handleUpdate} className="space-y-4 mb-6">
                    <input type="hidden" name="userId" value={selectedUser!.userId} />

                    <div>
                      <label className="block text-sm font-medium mb-2">Username</label>
                      <input
                        type="text"
                        name="username"
                        defaultValue={selectedUser!.username}
                        required
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Ruolo</label>
                      <select
                        name="role"
                        defaultValue={selectedUser!.role}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="tech">Tech</option>
                        <option value="host">Host</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Client (solo per Host, opzionale)</label>
                      <select
                        name="clientId"
                        defaultValue={selectedUser!.clientId || ""}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">Nessuno (accesso a tutti i client)</option>
                        {clients.map((c) => (
                          <option key={c.clientId} value={c.clientId}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10">
                      <button
                        type="submit"
                        className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
                      >
                        Salva Modifiche
                      </button>
                      <Link
                        href="/app/tech/users"
                        className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 font-semibold"
                      >
                        Annulla
                      </Link>
                    </div>
                  </form>

                  <form action={handleUpdatePassword} className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-400/10">
                    <div className="text-sm font-semibold mb-2">Cambia Password</div>
                    <input type="hidden" name="userId" value={selectedUser!.userId} />

                    <div>
                      <label className="block text-sm font-medium mb-2">Nuova Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-4 py-2 font-semibold text-sm"
                    >
                      Aggiorna Password
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Lista Utenti */}
          {!isCreateMode && !isEditMode && (
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="text-sm opacity-60 py-8 text-center">Nessun utente configurato</div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 border border-white/10 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{user.username}</div>
                        <div
                          className={`text-xs px-2 py-0.5 rounded border ${
                            user.role === "tech"
                              ? "bg-blue-500/10 border-blue-400/20 text-blue-200"
                              : "bg-purple-500/10 border-purple-400/20 text-purple-200"
                          }`}
                        >
                          {user.role.toUpperCase()}
                        </div>
                        {!user.enabled && (
                          <div className="text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-400/20 text-red-200">
                            DISABILITATO
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {user.clientId && `Client: ${clients.find((c) => c.clientId === user.clientId)?.name || user.clientId}`}
                        {user.lastLoginAt && ` • Ultimo accesso: ${new Date(user.lastLoginAt).toLocaleString()}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/tech/users?action=edit&userId=${user.userId}`}
                        className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 font-semibold text-xs"
                      >
                        Modifica
                      </Link>
                      {user.enabled ? (
                        <form action={handleToggleEnabled}>
                          <input type="hidden" name="userId" value={user.userId} />
                          <input type="hidden" name="enabled" value="false" />
                          <button
                            type="submit"
                            className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-3 py-1.5 font-semibold text-xs"
                          >
                            Disabilita
                          </button>
                        </form>
                      ) : (
                        <form action={handleToggleEnabled}>
                          <input type="hidden" name="userId" value={user.userId} />
                          <input type="hidden" name="enabled" value="true" />
                          <button
                            type="submit"
                            className="rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 font-semibold text-xs"
                          >
                            Abilita
                          </button>
                        </form>
                      )}
                      <form action={handleDelete}>
                        <input type="hidden" name="userId" value={user.userId} />
                        <button
                          type="submit"
                          className="rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-3 py-1.5 font-semibold text-xs"
                        >
                          Elimina
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
