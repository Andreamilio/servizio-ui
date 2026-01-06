import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { getApt } from "@/app/lib/techstore";
import { getUser } from "@/app/lib/userStore";
import { AppLayout } from "@/app/components/layouts/AppLayout";
import {
  getDevicePackage,
  getAllDeviceTypes,
  getDeviceLabel,
  getAllEnabledDevices,
  isDeviceControllable,
  getDeviceState,
  setDeviceEnabled,
  setDeviceControllable,
  setDeviceController,
  getAllDevices,
  type DeviceController,
} from "@/app/lib/devicePackageStore";
import { DeviceTable } from "./DeviceTable";

export const dynamic = "force-dynamic";

export default async function TechDevicesPage({
  params,
  searchParams,
}: {
  params: { aptId: string } | Promise<{ aptId: string }>;
  searchParams?: { edit?: string } | Promise<{ edit?: string }>;
}) {
  const cookieStore = await cookies();
  const sess = cookieStore.get("sess")?.value;
  const me = readSession(sess);

  if (!me || me.role !== "tech") {
    return <div className="p-6 text-[var(--text-primary)]">Non autorizzato</div>;
  }

  const techUser = me.userId ? getUser(me.userId) : null;
  const p = await Promise.resolve(params);
  const aptId = String(p?.aptId ?? "");

  if (!aptId) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <div className="p-4 lg:p-6">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Back
          </Link>
          <div className="mt-3 text-lg font-semibold">AptId mancante</div>
        </div>
      </AppLayout>
    );
  }

  const apt = getApt(aptId);
  if (!apt) {
    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <div className="p-4 lg:p-6">
          <Link className="text-sm opacity-70 hover:opacity-100" href="/app/tech">
            ← Back
          </Link>
          <div className="mt-3 text-lg font-semibold">Appartamento non trovato</div>
          <div className="text-sm opacity-60">AptId: {aptId}</div>
        </div>
      </AppLayout>
    );
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const isEditMode = sp.edit === "1";

  const devicePackage = getDevicePackage(aptId);
  const allDevicesMap = getAllDevices(aptId);
  const deviceTypes = getAllDeviceTypes();
  
  // Convert Map to array for client component (Maps are not serializable)
  const allDevices = Array.from(allDevicesMap.entries()).map(([deviceType, item]) => ({
    deviceType,
    ...item,
  }));

  async function updateDevicePackage(formData: FormData) {
    "use server";

    deviceTypes.forEach((deviceType) => {
      const enabledKey = `device_${deviceType}_enabled`;
      const controllableKey = `device_${deviceType}_controllable`;
      const controllerKey = `device_${deviceType}_controller`;

      const enabled = formData.get(enabledKey) === "on";
      const controllable = formData.get(controllableKey) === "on";
      const controllerValue = formData.get(controllerKey) as string;
      const controller: DeviceController = (controllerValue && controllerValue !== "") 
        ? (controllerValue as DeviceController)
        : "home_assistant"; // Default

      setDeviceEnabled(aptId, deviceType, enabled);
      if (enabled) {
        if (deviceType !== "ups") {
          setDeviceControllable(aptId, deviceType, controllable);
          // Controller può essere impostato anche se non controllabile (per leggere stato)
          setDeviceController(aptId, deviceType, controller);
        }
      }
    });

    revalidatePath(`/app/tech/apt/${aptId}/devices`);
    revalidatePath(`/app/tech/apt/${aptId}`);
    revalidatePath(`/app/tech/apt/${aptId}/settings`);
    redirect(`/app/tech/apt/${aptId}/devices`);
  }

  // Vista di sola lettura (default)
  if (!isEditMode) {
    const enabledDevices = getAllEnabledDevices(aptId);

    return (
      <AppLayout 
        role="tech"
        userInfo={techUser ? {
          userId: techUser.userId,
          username: techUser.username,
          profileImageUrl: techUser.profileImageUrl,
        } : undefined}
      >
        <div className="max-w-4xl mx-auto space-y-4 p-4 lg:p-6">
          <div className="lg:hidden">
            <Link className="text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
              ← Torna a {apt.aptName}
            </Link>
          </div>

          <Link className="hidden lg:inline-block text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
            ← Torna a {apt.aptName}
          </Link>

          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-[var(--text-primary)]">Device Package</div>
                <div className="text-sm opacity-70">{apt.aptName}</div>
              </div>
              <Link
                href={`/app/tech/apt/${aptId}/devices?edit=1`}
                className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-4 py-2 font-semibold text-sm"
              >
                Modifica
              </Link>
            </div>

            {enabledDevices.length === 0 ? (
              <div className="text-sm opacity-60 py-8 text-center">
                Nessun device configurato. Clicca "Modifica" per aggiungere device.
              </div>
            ) : (
              <div className="space-y-2">
                {enabledDevices.map((deviceType) => {
                  const controllable = isDeviceControllable(aptId, deviceType);
                  const state = getDeviceState(aptId, deviceType);
                  const label = getDeviceLabel(deviceType);
                  const isOnline = state === "online";

                  return (
                    <div
                      key={deviceType}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="text-xs opacity-60 mt-0.5">{deviceType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-xs px-3 py-1 rounded-lg border ${
                            isOnline
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          {state.toUpperCase()}
                        </div>
                        <div className="text-xs px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)]">
                          {controllable ? "Controllabile" : "Solo lettura"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Modalità edit: form completo
  return (
    <AppLayout 
      role="tech"
      userInfo={techUser ? {
        userId: techUser.userId,
        username: techUser.username,
        profileImageUrl: techUser.profileImageUrl,
      } : undefined}
    >
      <div className="max-w-4xl mx-auto space-y-4 p-4 lg:p-6">
        <div className="lg:hidden">
          <Link className="text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
            ← Torna a {apt.aptName}
          </Link>
        </div>

        <Link className="hidden lg:inline-block text-sm opacity-70 hover:opacity-100" href={`/app/tech/apt/${aptId}`}>
          ← Torna a {apt.aptName}
        </Link>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold text-[var(--text-primary)]">Device Package</div>
            <div className="text-sm opacity-70 text-[var(--text-secondary)]">{apt.aptName}</div>
          </div>

          <form action={updateDevicePackage} className="space-y-4">
            <DeviceTable deviceTypes={deviceTypes} allDevices={allDevices} />

            <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
              <button
                type="submit"
                className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 px-6 py-3 font-semibold"
              >
                Salva configurazione
              </button>
              <Link
                href={`/app/tech/apt/${aptId}/devices`}
                className="rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] px-6 py-3 font-semibold"
              >
                Annulla
              </Link>
            </div>
          </form>

          <div className="mt-4 text-xs opacity-60">
            Nota: La checkbox "Controllabile" è disponibile solo se "Presente" è selezionata. Se un device non è presente, non verrà mostrato nelle viste Tech/Host/Guest.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

