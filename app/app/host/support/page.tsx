import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ArrowLeft, MessageCircle, Ticket, AlertCircle } from "lucide-react";

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
        return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
    }

    // Costruisce il link indietro preservando i parametri query
    const backHref = aptId 
        ? `/app/host?client=${encodeURIComponent(clientId)}&apt=${encodeURIComponent(aptId)}`
        : clientId
        ? `/app/host?client=${encodeURIComponent(clientId)}`
        : '/app/host';

    return (
        <main className="min-h-screen bg-[var(--bg-primary)]">
            <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <Link href={backHref}>
                        <Button variant="ghost" size="sm" icon={ArrowLeft} iconPosition="left">
                            Indietro
                        </Button>
                    </Link>
                </div>

                <Card variant="elevated">
                    <CardHeader>
                        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Supporto</h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Questa è una versione mock: nel prodotto reale qui apri un ticket o chatti con supporto.
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        <div className="space-y-3">
                            <Button variant="secondary" size="lg" fullWidth icon={MessageCircle} iconPosition="left">
                                Apri chat (mock)
                            </Button>
                            <Button variant="secondary" size="lg" fullWidth icon={Ticket} iconPosition="left">
                                Apri ticket (mock)
                            </Button>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                    <div className="font-medium mb-1">Emergenza</div>
                                    <div>Nel prototipo non chiami nessuno. Nel reale: numeri/istruzioni.</div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </main>
    );
}

