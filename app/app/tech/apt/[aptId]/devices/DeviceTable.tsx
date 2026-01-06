"use client";

export type DeviceType =
  | "smart_lock"
  | "relay_gate"
  | "smoke_sensor"
  | "thermostat"
  | "alarm_sensors"
  | "lights"
  | "ring_cam"
  | "scenes"
  | "ups";

export type DeviceController = "api" | "home_assistant";

export type DevicePackageItem = {
  enabled: boolean;
  controllable: boolean;
  controller: DeviceController;
};

function getDeviceLabel(deviceType: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    smart_lock: "Smart Lock (porta appartamento)",
    relay_gate: "Relay cancello/portone (Shelly)",
    smoke_sensor: "Sensore fumo",
    thermostat: "Termostato",
    alarm_sensors: "Allarme + sensori porta/finestra",
    lights: "Luci (Shelly)",
    ring_cam: "Ring / cam",
    scenes: "Scene (preset)",
    ups: "UPS presente",
  };
  return labels[deviceType] ?? deviceType;
}

type DeviceTableProps = {
  deviceTypes: DeviceType[];
  allDevices: Array<{ deviceType: DeviceType } & DevicePackageItem>;
};

function getControllerOptions(deviceType: DeviceType): Array<{ value: DeviceController; label: string }> {
  // UPS non ha controller
  if (deviceType === "ups") {
    return [];
  }
  
  // Tutti gli altri device possono essere "API" o "Home Assistant"
  return [
    { value: "api", label: "API" },
    { value: "home_assistant", label: "Home Assistant" },
  ];
}

export function DeviceTable({ deviceTypes, allDevices }: DeviceTableProps) {
  return (
    <div className="relative">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border-light)] scrollbar-track-transparent">
        <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-[var(--border-light)]">
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">Device</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">Presente</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">Controllabile</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--text-primary)]">Controller</th>
          </tr>
        </thead>
        <tbody>
          {deviceTypes.map((deviceType) => {
            const item = allDevices.find((d) => d.deviceType === deviceType);
            const enabled = item?.enabled ?? false;
            const controllable = item?.controllable ?? false;
            const controller = item?.controller ?? "home_assistant";
            const enabledId = `device_${deviceType}_enabled`;
            const controllableId = `device_${deviceType}_controllable`;
            const controllerId = `device_${deviceType}_controller`;
            const controllerOptions = getControllerOptions(deviceType);
            const isUps = deviceType === "ups";

            return (
              <tr key={deviceType} className="border-b border-[var(--border-light)] hover:bg-[var(--bg-card)]">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium">{getDeviceLabel(deviceType)}</div>
                  <div className="text-xs opacity-60 mt-0.5">{deviceType}</div>
                </td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    id={enabledId}
                    name={enabledId}
                    defaultChecked={enabled}
                    className="w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-secondary)] text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                    onChange={(e) => {
                      if (!isUps) {
                        const controllableCheckbox = document.getElementById(controllableId) as HTMLInputElement;
                        const controllerSelect = document.getElementById(controllerId) as HTMLSelectElement;
                        if (controllableCheckbox) {
                          controllableCheckbox.disabled = !e.target.checked;
                          if (!e.target.checked) {
                            controllableCheckbox.checked = false;
                          }
                        }
                        if (controllerSelect) {
                          controllerSelect.disabled = !e.target.checked;
                          if (!e.target.checked) {
                            controllerSelect.value = "home_assistant";
                          }
                        }
                      }
                    }}
                  />
                </td>
                {!isUps && (
                  <>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        id={controllableId}
                        name={`device_${deviceType}_controllable`}
                        defaultChecked={controllable}
                        disabled={!enabled}
                        className={`w-4 h-4 rounded border-[var(--border-light)] bg-[var(--bg-secondary)] text-cyan-500 focus:ring-cyan-500 focus:ring-2 ${
                          !enabled ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        id={controllerId}
                        name={controllerId}
                        defaultValue={controller}
                        disabled={!enabled}
                        className={`text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all cursor-pointer hover:border-cyan-400/50 hover:bg-[var(--bg-tertiary)] ${
                          !enabled ? "opacity-50 cursor-not-allowed hover:border-[var(--border-light)] hover:bg-[var(--bg-secondary)]" : ""
                        }`}
                      >
                        {controllerOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </>
                )}
                {isUps && <td colSpan={2} className="py-3 px-4 text-center text-xs opacity-60">Solo presenza fisica</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {/* Indicatore scroll su mobile */}
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-[var(--bg-card)] via-[var(--bg-card)]/80 to-transparent lg:hidden flex items-center justify-end pr-2">
        <div className="text-xs text-[var(--text-secondary)] opacity-60">→</div>
      </div>
    </div>
  );
}

