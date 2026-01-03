import Link from "next/link";
import { cookies } from "next/headers";
import { readSession } from "@/app/lib/session";
import { getGuestState } from "@/app/lib/gueststore";

export default async function GuestApartmentPage() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "guest") return <div className="p-6 text-white">Non autorizzato</div>;

  const aptId = me.aptId;
  if (!aptId) return <div className="p-6 text-white">AptId non disponibile</div>;
  
  const s = getGuestState(aptId);

  return (
    <main className="min-h-screen bg-[#0a0d12] text-white">
      <div className="mx-auto w-full max-w-md p-5 space-y-4">
        <Link className="text-sm opacity-70 hover:opacity-100" href="/app/guest">
          ← Indietro
        </Link>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-semibold">{s.apt.aptName}</div>
          <div className="text-xs opacity-60">{s.apt.addressShort}</div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="text-xs opacity-60">Wi-Fi</div>
              <div className="font-semibold">{s.apt.wifiSsid}</div>
              <div className="text-xs opacity-70">Pass: {s.apt.wifiPass}</div>
            </div>

            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="text-xs opacity-60">Orari</div>
              <div className="text-xs opacity-80">Check-in: <span className="font-semibold">{s.apt.checkIn}</span></div>
              <div className="text-xs opacity-80">Check-out: <span className="font-semibold">{s.apt.checkOut}</span></div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm opacity-70 mb-2">Regole principali</div>
            <ul className="space-y-2 text-sm">
              {s.apt.rules.map((r, idx) => (
                <li key={idx} className="rounded-xl bg-black/20 border border-white/10 px-3 py-2">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm opacity-70 mb-2">Contatti</div>
          <div className="text-sm">Supporto: <span className="opacity-80">chat in-app (mock)</span></div>
          <div className="text-xs opacity-50 mt-2">
            (Nel prodotto reale qui avrai chat/ticket e numeri emergenza in base al piano.)
          </div>
        </div>
      </div>
    </main>
  );
}
