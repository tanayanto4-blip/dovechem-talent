import { createFileRoute } from "@tanstack/react-router";

/**
 * SSE heartbeat sesi kandidat (satu kode = satu perangkat).
 *
 * Publik, tetapi tidak membocorkan data apa pun: hanya mengembalikan status
 * "ok" | "conflict" | "invalid" untuk pasangan (code, device) yang dikirim.
 * Server memeriksa DB tiap 2 detik dan langsung mendorong event ke perangkat
 * lama begitu kode diambil alih perangkat lain, lalu menutup stream.
 */
export const Route = createFileRoute("/api/public/candidate-session-stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = (url.searchParams.get("code") ?? "").trim().toUpperCase().slice(0, 64);
        const device = (url.searchParams.get("device") ?? "").trim().slice(0, 128);
        if (code.length < 3) return new Response("bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function check(): Promise<{ status: string; message: string }> {
          const { data: row } = await supabaseAdmin
            .from("candidate_codes")
            .select("active, expires_at, active_device_token")
            .eq("code", code)
            .maybeSingle();
          if (!row) return { status: "invalid", message: "Kode akses tidak ditemukan." };
          if (!row.active) return { status: "invalid", message: "Kode akses sudah dinonaktifkan." };
          if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
            return { status: "invalid", message: "Kode akses sudah melewati masa berlaku." };
          }
          if (row.active_device_token && row.active_device_token !== device) {
            return {
              status: "conflict",
              message:
                "Kode akses ini sedang digunakan di perangkat lain. Anda otomatis keluar dari sesi ini.",
            };
          }
          return { status: "ok", message: "" };
        }

        const encoder = new TextEncoder();
        let timer: ReturnType<typeof setInterval> | undefined;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (payload: unknown) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };
            const tick = async () => {
              try {
                const res = await check();
                send(res);
                if (res.status !== "ok") {
                  if (timer) clearInterval(timer);
                  controller.close();
                }
              } catch {
                // Kegagalan sementara diabaikan; client punya fallback polling.
              }
            };
            await tick();
            timer = setInterval(tick, 2000);
            // Batasi umur stream (10 menit) agar koneksi tidak menggantung.
            setTimeout(() => {
              if (timer) clearInterval(timer);
              try { controller.close(); } catch { /* already closed */ }
            }, 10 * 60 * 1000);
          },
          cancel() {
            if (timer) clearInterval(timer);
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
