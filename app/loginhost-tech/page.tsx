import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Card, CardBody } from "@/app/components/ui/Card";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginHostTechPage({ searchParams }: { searchParams?: { err?: string; next?: string } }) {
  const err = typeof searchParams?.err === "string" ? searchParams.err : "";
  const next = typeof searchParams?.next === "string" ? searchParams.next : "";

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card variant="elevated" className="w-full">
          <CardBody className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-[var(--pastel-purple)]">
                  <User className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Accesso Host / Tech</h1>
              <p className="text-sm text-[var(--text-secondary)]">Inserisci le tue credenziali per accedere</p>
            </div>

            {err === "auth" && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-600 font-medium">Username o password non validi</p>
              </div>
            )}

            <form action="/api/auth/login" method="post" className="space-y-4">
              <input type="hidden" name="next" value={next} />

              <Input
                name="username"
                type="text"
                placeholder="Username"
                autoComplete="username"
                required
                autoFocus
              />

              <Input
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />

              <Button type="submit" variant="primary" size="lg" fullWidth>
                Entra
              </Button>
            </form>

            <div className="pt-4 border-t border-[var(--border-light)]">
              <p className="text-center text-sm text-[var(--text-secondary)]">
                Demo: <span className="font-mono">tech/tech123</span> oppure <span className="font-mono">host/host123</span>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
