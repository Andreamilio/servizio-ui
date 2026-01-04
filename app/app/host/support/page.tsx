import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string) {
    const v = sp[key];
    return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function HostSupportPage({ 
    searchParams 
}: { 
    searchParams?: SP | Promise<SP> 
}) {
    const sp = ((await Promise.resolve(searchParams as any)) ?? {}) as SP;
    const clientId = pick(sp, 'client')?.trim() || '';
    const aptId = pick(sp, 'apt')?.trim() || '';

    const cookieStore = await cookies();
    const sess = cookieStore.get("sess")?.value;
    const me = validateSessionUser(readSession(sess));

    if (!me || me.role !== "host") {
        redirect("/?err=session_expired");
        return <div className="p-6 text-white">Non autorizzato</div>;
    }

    // Costruisce il link indietro preservando i parametri query
    const backHref = aptId 
        ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
        : clientId
        ? `/app/host?client=${encodeURIComponent(clientId)}`
        : '/app/host';

    return (
        <main className="min-h-screen bg-[#0a0d12] text-white">
            <div className="mx-auto w-full max-w-md p-5 space-y-4">
                <Link className="text-sm opacity-70 hover:opacity-100" href={backHref}>
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

