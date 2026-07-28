import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { candidateProctorSnapshot } from "@/lib/candidate.functions";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, Loader2 } from "lucide-react";

type Status = "idle" | "requesting" | "live" | "denied" | "error";

const CAPTURE_INTERVAL_MS = 5_000;
const STREAM_INTERVAL_MS = 500;


/**
 * Candidate webcam proctoring. Requests camera access, shows a small live
 * preview, and uploads a JPEG frame every 5 seconds plus camera/tab events.
 * Frames are only visible to Super Admin in the monitoring dashboard.
 */
export function ProctorCamera({
  code,
  attemptId,
  onStatusChange,
}: {
  code: string;
  attemptId: string;
  onStatusChange?: (s: Status) => void;
}) {
  const send = useServerFn(candidateProctorSnapshot);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [frames, setFrames] = useState(0);

  const setS = useCallback((s: Status) => { setStatus(s); onStatusChange?.(s); }, [onStatusChange]);

  const report = useCallback(
    async (event: "snapshot" | "camera_on" | "camera_off" | "camera_denied" | "tab_hidden", base64?: string) => {
      try {
        await send({ data: { code, attempt_id: attemptId, event, base64 } });
        if (event === "snapshot") setFrames((f) => f + 1);
      } catch {
        /* monitoring must never block the test */
      }
    },
    [send, code, attemptId],
  );

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const w = 480;
    const h = Math.round((video.videoHeight / (video.videoWidth || 1)) * w) || 240;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1];
    if (base64) await report("snapshot", base64);
  }, [report]);

  const start = useCallback(async () => {
    setS("requesting");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setS("live");
      await report("camera_on");
      setTimeout(() => { capture(); }, 800);
    } catch (e: any) {
      const denied = e?.name === "NotAllowedError" || e?.name === "SecurityError";
      setS(denied ? "denied" : "error");
      setMessage(
        denied
          ? "Akses kamera ditolak. Izinkan kamera pada browser Anda lalu klik Aktifkan Kamera."
          : "Kamera tidak terdeteksi. Pastikan perangkat memiliki kamera dan tidak dipakai aplikasi lain.",
      );
      report("camera_denied");
    }
  }, [capture, report, setS]);

  // Auto-request on mount
  useEffect(() => {
    start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic capture (stored history)
  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => { capture(); }, CAPTURE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [status, capture]);

  // Realtime live stream to the Super Admin dashboard (~2 fps, not stored)
  useEffect(() => {
    if (status !== "live") return;
    let cancelled = false;
    const channel: RealtimeChannel = supabase.channel(`proctor-live-${attemptId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();

    const canvas = document.createElement("canvas");
    const t = setInterval(() => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const w = 320;
      const h = Math.round((video.videoHeight / (video.videoWidth || 1)) * w) || 240;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const b64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
      if (!b64) return;
      channel.send({ type: "broadcast", event: "frame", payload: { b64, at: Date.now() } }).catch(() => {});
    }, STREAM_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [status, attemptId]);


  // Detect the candidate leaving the tab and camera being cut off
  useEffect(() => {
    if (status !== "live") return;
    const onVis = () => { if (document.hidden) report("tab_hidden"); };
    document.addEventListener("visibilitychange", onVis);
    const track = streamRef.current?.getVideoTracks()[0];
    const onEnded = () => { setS("error"); setMessage("Kamera terputus. Klik Aktifkan Kamera untuk melanjutkan pengawasan."); report("camera_off"); };
    track?.addEventListener("ended", onEnded);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      track?.removeEventListener("ended", onEnded);
    };
  }, [status, report, setS]);

  if (status !== "live") {
    return (
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          {status === "requesting" ? (
            <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
          ) : (
            <CameraOff className="h-8 w-8 text-amber-700" />
          )}
          <div className="font-medium text-amber-900">
            {status === "requesting" ? "Meminta izin kamera..." : "Kamera wajib aktif selama tes"}
          </div>
          <p className="max-w-md text-sm text-amber-800">
            {message ||
              "Pelaksanaan psikotest diawasi melalui kamera. Aktifkan kamera untuk mulai mengerjakan soal. Rekaman gambar hanya dapat dilihat oleh Super Admin."}
          </p>
          {status !== "requesting" && (
            <Button onClick={start} className="mt-1">
              <Camera className="mr-2 h-4 w-4" /> Aktifkan Kamera
            </Button>
          )}
          <video ref={videoRef} playsInline muted className="hidden" />
        </CardContent>
      </Card>
    );
  }

  return (
    <video ref={videoRef} playsInline muted aria-hidden className="pointer-events-none fixed h-px w-px opacity-0" />

  );
}

export default ProctorCamera;
