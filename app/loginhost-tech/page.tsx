export const dynamic = "force-dynamic";

export default function LoginHostTechPage({ searchParams }: { searchParams?: { err?: string; next?: string } }) {
  const err = typeof searchParams?.err === "string" ? searchParams.err : "";
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white p-6">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Accesso Host / Tech</h1>

        {err === "auth" && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/20 p-3 text-sm">
            Username o password non validi
          </div>
        )}

        <form action="/api/auth/login" method="post" className="space-y-3">
          <input type="hidden" name="next" value={next} />

          <div>
            <input
              name="username"
              type="text"
              placeholder="Username"
              autoComplete="username"
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
              required
            />
          </div>

          <div>
            <input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-xl bg-black/40 border border-white/10 p-3"
              required
            />
          </div>

          <button type="submit" className="w-full rounded-xl bg-cyan-500/30 border border-cyan-400/30 p-3 font-semibold">
            Entra
          </button>
        </form>

        <div className="text-xs opacity-60 text-center pt-4 border-t border-white/10">
          <div>Demo: tech/tech123 oppure host/host123</div>
        </div>
      </div>
    </main>
  );
}
