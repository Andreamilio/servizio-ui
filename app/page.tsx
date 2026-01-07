import Link from "next/link";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody } from "@/app/components/ui/Card";
import { KeyRound } from "lucide-react";

export default function LoginPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>> }) {
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";
  const err = typeof searchParams?.err === "string" ? searchParams.err : "";

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="w-full">
          <CardBody className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-[var(--pastel-blue)]">
                  <KeyRound className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Accesso Guest / Cleaner</h1>
              <p className="text-sm text-[var(--text-secondary)]">Inserisci il tuo PIN per accedere</p>
            </div>

            {err === "pin" && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600 font-medium">PIN non valido o scaduto</p>
              </div>
            )}

            <form action="/api/auth/pin" method="post" className="space-y-4">
              <input type="hidden" name="next" value={next} />

              <Input
                name="pin"
                type="text"
                inputMode="numeric"
                placeholder="Inserisci PIN"
                required
                autoFocus
                className="text-center text-2xl tracking-widest font-mono"
              />

              <Button type="submit" variant="primary" size="lg" fullWidth>
                Entra
              </Button>
            </form>

            <div className="pt-4 border-t border-[var(--border-light)]">
              <p className="text-center text-sm text-[var(--text-secondary)]">
                Host/Tech?{" "}
                <Link href="/loginhost-tech" className="text-[var(--accent-primary)] hover:underline font-medium">
                  Accedi qui
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}