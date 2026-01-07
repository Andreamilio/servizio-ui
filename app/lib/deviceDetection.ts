import type { Platform } from "./a2hsStorage";

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return "android";
  
  const ua = navigator.userAgent;
  // iOS detection: iPhone/iPad/iPod UA oppure MacIntel con maxTouchPoints > 1 (iPad su macOS)
  const isIOS = /iPhone|iPad|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "android"; // default
}

