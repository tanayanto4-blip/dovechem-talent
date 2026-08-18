import { toast } from "sonner";
import { reportClientError } from "@/lib/monitoring.functions";

type Area = "admin" | "hr" | "candidate" | "public";

function areaFromPath(pathname: string): Area {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/candidate")) return "candidate";
  return "public";
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Response) {
    return { message: `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` };
  }
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error).slice(0, 500) };
  } catch {
    return { message: String(error) };
  }
}

/** Dedupe identical failures inside the same session so users see one toast. */
const seen = new Map<string, number>();
function shouldEmit(key: string) {
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < 30_000) return false;
  seen.set(key, now);
  return true;
}

/** Label shown to staff in the monitor list ("HR — Bank Soal", etc.). */
function actorLabel(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem("dover_candidate_session");
    if (raw) {
      const s = JSON.parse(raw) as { candidate_name?: string; code?: string };
      return s.code ? `Kandidat ${s.code}` : "Kandidat";
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Kegagalan jaringan sesaat (tab ditutup, pindah halaman, sinyal hilang)
 * bukan bug aplikasi — jangan dicatat sebagai error test.
 */
const TRANSIENT_NETWORK = [
  "failed to fetch",
  "load failed",
  "networkerror",
  "network request failed",
  "the operation was aborted",
  "aborterror",
  "signal is aborted",
  "err_network",
  "err_internet_disconnected",
];

let pageUnloading = false;

function isTransientNetwork(message: string) {
  const m = message.toLowerCase();
  return TRANSIENT_NETWORK.some((p) => m.includes(p));
}

export function captureAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const { message, stack } = describe(error);
  if (!message) return;
  // Halaman sedang ditutup / perangkat offline: request yang batal tidak dicatat.
  if (isTransientNetwork(message) && (pageUnloading || navigator.onLine === false)) return;
  const route = window.location.pathname;
  if (!shouldEmit(`${route}|${message}`)) return;

  const area = areaFromPath(route);
  const notify = (context["silent"] as boolean) !== true;
  if (notify) {

    toast.error("Terjadi kesalahan pada halaman ini", {
      description: message.slice(0, 160),
      duration: 8000,
    });
  }

  void reportClientError({
    data: {
      area,
      route: route.slice(0, 300),
      source: String(context["source"] ?? "runtime"),
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 6000),
      actor_label: actorLabel(),
      context: { ...context, ua_route: route },
    },
  }).catch(() => {
    /* never let monitoring break the page */
  });
}

/**
 * Insiden non-teknis yang perlu diketahui tim HC / Super Admin:
 * sinyal putus, kandidat terlogout otomatis, test selesai sendiri, dll.
 * Selalu tercatat (tanpa dedupe agresif) dan bisa disertai toast ke kandidat.
 */
export type IncidentKind =
  | "koneksi-terputus"
  | "koneksi-pulih"
  | "autosave-gagal"
  | "logout-perangkat-lain"
  | "sesi-tidak-valid"
  | "test-auto-submit"
  | "kirim-jawaban-gagal";

export function reportIncident(
  kind: IncidentKind,
  message: string,
  detail: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  const route = window.location.pathname;
  void reportClientError({
    data: {
      area: areaFromPath(route),
      route: route.slice(0, 300),
      source: `insiden:${kind}`,
      message: message.slice(0, 1000),
      actor_label: actorLabel(),
      context: { ...detail, kind, online: navigator.onLine, ua: navigator.userAgent.slice(0, 200) },
    },
  }).catch(() => {
    /* monitoring tidak boleh mengganggu kandidat */
  });
}

let installed = false;

/** Install global browser error listeners once (client only). */
export function installErrorMonitor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Tandai halaman sedang ditutup agar request yang batal tidak dilaporkan.
  window.addEventListener("pagehide", () => {
    pageUnloading = true;
  });
  window.addEventListener("beforeunload", () => {
    pageUnloading = true;
  });
  window.addEventListener("pageshow", () => {
    pageUnloading = false;
  });



  window.addEventListener("error", (e) => {
    captureAppError(e.error ?? e.message, { source: "window.onerror", filename: e.filename });
  });
  window.addEventListener("unhandledrejection", (e) => {
    captureAppError(e.reason, { source: "unhandledrejection" });
  });
}
