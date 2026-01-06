import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { ArrowLeft, MessageCircle, Ticket, AlertCircle } from "lucide-react";

export default async function GuestSupportPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "guest") {
    redirect("/?err=session_expired");
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  return (
    <AppLayout role="guest">
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/app/guest">
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

            <div className="p-4 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold mb-1 text-yellow-900">Emergenza</div>
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
