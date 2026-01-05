import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { getGuestState } from "@/app/lib/gueststore";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { ArrowLeft, Wifi, Clock, FileText, Phone } from "lucide-react";

export default async function GuestApartmentPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "guest") {
    redirect("/?err=session_expired");
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const aptId = me.aptId;
  if (!aptId) return <div className="p-6 text-[var(--text-primary)]">AptId non disponibile</div>;
  
  const s = getGuestState(aptId);

  return (
    <AppLayout role="guest">
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/app/guest">
            <Button variant="ghost" size="sm" icon={ArrowLeft} iconPosition="left">
              Indietro
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Apartment Info */}
          <Card variant="elevated">
            <CardHeader>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{s.apt.aptName}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{s.apt.addressShort}</p>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="w-4 h-4 text-[var(--text-secondary)]" />
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Wi-Fi</div>
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">{s.apt.wifiSsid}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Password: {s.apt.wifiPass}</div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
                    <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Orari</div>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">
                    <div>Check-in: <span className="font-semibold">{s.apt.checkIn}</span></div>
                    <div className="mt-1">Check-out: <span className="font-semibold">{s.apt.checkOut}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[var(--text-primary)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Regole principali</h2>
                </div>
                <ul className="space-y-2">
                  {s.apt.rules.map((r, idx) => (
                    <li key={idx} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-[var(--text-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contatti</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Supporto:</span>{" "}
                  <span className="text-[var(--text-secondary)]">chat in-app (mock)</span>
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">
                  (Nel prodotto reale qui avrai chat/ticket e numeri emergenza in base al piano.)
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
