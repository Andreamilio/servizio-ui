import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, validateSessionUser } from "@/app/lib/session";
import { listJobsByApt, listJobsByStay, type CleaningJob } from "@/app/lib/cleaningstore";
import { listPinsByApt } from "@/app/lib/store";
import { Card, CardBody, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import { Sparkles } from "lucide-react";

export default async function CleanerHome() {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;

  const me = validateSessionUser(readSession(sess));

  if (!me || me.role !== "cleaner") {
    redirect("/?err=session_expired");
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  // Trova tutti i PIN del cleaner per questo aptId
  const cleanerPins = listPinsByApt(me.aptId).filter((p) => p.role === "cleaner");
  
  // Trova tutti gli stay associati ai PIN del cleaner
  const stayIds = new Set<string>();
  for (const pin of cleanerPins) {
    if (pin.stayId) {
      stayIds.add(pin.stayId);
    }
  }

  // Raccogli tutti i job associati agli stay del cleaner
  const jobs: CleaningJob[] = [];
  for (const stayId of stayIds) {
    const stayJobs = listJobsByStay(stayId);
    jobs.push(...stayJobs);
  }

  // Aggiungi anche i job diretti per questo aptId (per retrocompatibilità)
  const aptJobs = listJobsByApt(me.aptId);
  for (const job of aptJobs) {
    if (!jobs.find((j) => j.id === job.id)) {
      jobs.push(job);
    }
  }

  // Ordina per stato
  const rank: Record<string, number> = {
    todo: 0,
    in_progress: 1,
    problem: 2,
    done: 3,
  };
  jobs.sort((a, b) => rank[a.status] - rank[b.status]);

  const getStatusVariant = (status: string) => {
    if (status === "todo") return "default";
    if (status === "in_progress") return "warning";
    if (status === "problem") return "error";
    if (status === "done") return "success";
    return "default";
  };

  const getStatusLabel = (status: string) => {
    if (status === "todo") return "Da fare";
    if (status === "in_progress") return "In corso";
    if (status === "done") return "Completato";
    if (status === "problem") return "Problema";
    return status;
  };

  return (
    <AppLayout role="cleaner">
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Pulizie</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Appartamento {me.aptId}</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--text-primary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pulizie assegnate</h2>
            </div>
          </CardHeader>
          <CardBody>
            {jobs.length === 0 ? (
              <div className="text-sm text-[var(--text-secondary)] text-center py-8">
                Nessuna pulizia assegnata disponibile
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/app/cleaner/${j.id}`}
                    className="block p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] hover:border-[var(--border-medium)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="font-semibold text-[var(--text-primary)]">{j.aptName}</div>
                      <Badge variant={getStatusVariant(j.status)} size="sm">
                        {getStatusLabel(j.status)}
                      </Badge>
                    </div>
                    {j.windowLabel && (
                      <div className="text-xs text-[var(--text-secondary)]">{j.windowLabel}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}