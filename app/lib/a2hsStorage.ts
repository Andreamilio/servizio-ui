export const A2HS_OPEN_EVENT = "easyStay:a2hs-open";

export type Platform = "ios" | "android";

export function hasSeenA2HS(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem("easyStay_a2hs_seen") === "1";
}

export function markA2HSSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem("easyStay_a2hs_seen", "1");
}

export function getSavedPlatform(): Platform | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem("easyStay_a2hs_platform");
  return (saved === "ios" || saved === "android") ? saved : null;
}

export function savePlatform(platform: Platform): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem("easyStay_a2hs_platform", platform);
}

