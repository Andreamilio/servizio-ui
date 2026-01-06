import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { MessageCircle, Ticket, AlertCircle } from "lucide-react";

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

    const hostUser = me.userId ? getUser(me.userId) : null;

    return (
        <AppLayout 
            role="host"
            userInfo={hostUser ? {
                userId: hostUser.userId,
                username: hostUser.username,
                profileImageUrl: hostUser.profileImageUrl,
            } : undefined}
        >
            <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">

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

                        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-500/30">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <div className="font-semibold mb-1 text-amber-900">Emergenza</div>
                                    <div className="text-gray-900">Nel prototipo non chiami nessuno. Nel reale: numeri/istruzioni.</div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}

