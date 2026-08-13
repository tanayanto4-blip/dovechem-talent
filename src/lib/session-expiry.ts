import { toast } from "sonner";

/**
 * Sesi login staf (Super Admin / HR) memakai token Supabase yang bisa habis.
 * Ketika itu terjadi, semua server function menjawab "Unauthorized" dan
 * dashboard terlihat "tidak terhubung": data kosong + toast error teknis.
 *
 * Helper ini mengenali error tersebut, lalu mengeluarkan user dengan pesan
 * yang jelas dan mengarahkan kembali ke halaman login.
 */
export function isAuthExpiredError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error instanceof Response
          ? `status ${error.status}`
          : "";
  if (!msg) return false;
  return (
    /no authorization header/i.test(msg) ||
    /unauthorized/i.test(msg) ||
    /jwt (expired|invalid)/i.test(msg) ||
    /status 401/i.test(msg)
  );
}

let handling = false;

/** Keluarkan sesi staf yang sudah kedaluwarsa (sekali saja per halaman). */
export async function handleExpiredStaffSession() {
  if (typeof window === "undefined" || handling) return;
  if (window.location.pathname.startsWith("/auth")) return;
  handling = true;
  toast.error("Sesi login berakhir", {
    description: "Silakan masuk kembali untuk melanjutkan.",
  });
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
  } catch {
    /* tetap arahkan ke login walau sign-out gagal */
  }
  window.location.replace("/auth");
}
