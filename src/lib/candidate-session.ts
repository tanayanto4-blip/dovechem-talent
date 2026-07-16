import { useSyncExternalStore } from "react";

const KEY = "dover_candidate_session";

export type CandidateSession = {
  code: string;
  candidate_id: string;
  candidate_name: string;
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function getCandidateSession(): CandidateSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCandidateSession(s: CandidateSession | null) {
  if (typeof window === "undefined") return;
  if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
  else window.sessionStorage.removeItem(KEY);
  emit();
}

export function useCandidateSession() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => getCandidateSession(),
    () => null,
  );
}
