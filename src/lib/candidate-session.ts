import { useSyncExternalStore } from "react";

const KEY = "dover_candidate_session";

/** Message the server returns when the same code was claimed by another device. */
export const DEVICE_CONFLICT_MESSAGE =
  "Kode akses ini sedang digunakan di perangkat lain. Anda otomatis keluar dari sesi ini.";

export type CandidateSession = {
  code: string;
  candidate_id: string;
  candidate_name: string;
  /** Single-device token minted at login; invalidated when the code is used elsewhere. */
  device?: string;
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

let cachedRaw: string | null = null;
let cachedValue: CandidateSession | null = null;

export function getCandidateSession(): CandidateSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    cachedValue = raw ? (JSON.parse(raw) as CandidateSession) : null;
    return cachedValue;
  } catch { return null; }
}

export function setCandidateSession(s: CandidateSession | null) {
  if (typeof window === "undefined") return;
  if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
  else window.sessionStorage.removeItem(KEY);
  cachedRaw = null; // force refresh on next read
  emit();
}

export function useCandidateSession() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => getCandidateSession(),
    () => null,
  );
}
