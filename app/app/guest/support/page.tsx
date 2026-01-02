import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";

export default async function GuestSupportPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "guest") return <div className="p-6 text-white">Non autorizzato</div>;

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      <div className="mx-auto w-full max-w-md p-5 space-y-4">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/guest">
          ← Indietro
        </Link>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-semibold">Supporto</div>
          <div className="text-sm opacity-70 mt-1">
            Questa è una versione mock: nel prodotto reale qui apri un ticket o chatti con supporto.
          </div>

          <div className="mt-4 space-y-3">
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
              Apri chat (mock)
            </button>
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
              Apri ticket (mock)
            </button>
          </div>

          <div className="mt-4 text-xs opacity-50">
            Emergenza: nel prototipo non chiami nessuno. Nel reale: numeri/istruzioni.
          </div>
        </div>
      </div>
    </main>
  );
}
