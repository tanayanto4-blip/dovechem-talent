import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type CapturedPhoto = { base64: string; mimeType: string; size: number; fileName: string };

const BACKGROUNDS: { label: string; value: string | null }[] = [
  { label: "Asli", value: null },
  { label: "Merah", value: "#c62828" },
  { label: "Biru", value: "#1565c0" },
  { label: "Putih", value: "#ffffff" },
  { label: "Abu", value: "#9e9e9e" },
];

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

export function PhotoCapture({
  open,
  onOpenChange,
  onCapture,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (photo: CapturedPhoto) => Promise<void> | void;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const segRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const bgRef = useRef<string | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [segReady, setSegReady] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    bgRef.current = bg;
  }, [bg]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      setShot(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 720 }, height: { ideal: 960 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        setReady(true);
        loop();
      } catch {
        toast.error("Tidak dapat mengakses kamera. Izinkan akses kamera pada browser Anda.");
        onOpenChange(false);
      }
    })();

    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const seg = await vision.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
        if (cancelled) {
          seg.close();
          return;
        }
        segRef.current = seg;
        setSegReady(true);
      } catch {
        setSegReady(false);
      }
    })();

    function loop() {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (ctx && v.videoWidth) {
        if (c.width !== v.videoWidth) {
          c.width = v.videoWidth;
          c.height = v.videoHeight;
        }
        ctx.save();
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.restore();

        const color = bgRef.current;
        const seg = segRef.current;
        if (color && seg) {
          try {
            const res = seg.segmentForVideo(v, performance.now());
            const mask = res.categoryMask?.getAsUint8Array();
            if (mask) {
              const img = ctx.getImageData(0, 0, c.width, c.height);
              const d = img.data;
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              const w = c.width;
              for (let y = 0; y < c.height; y++) {
                for (let x = 0; x < w; x++) {
                  // mask is not mirrored — flip x lookup
                  const m = mask[y * w + (w - 1 - x)];
                  if (m === 0) {
                    const i = (y * w + x) * 4;
                    d[i] = r;
                    d[i + 1] = g;
                    d[i + 2] = b;
                  }
                }
              }
              ctx.putImageData(img, 0, 0);
            }
            res.close?.();
          } catch {
            /* keep raw frame */
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function take() {
    const c = canvasRef.current;
    if (!c) return;
    setShot(c.toDataURL("image/jpeg", 0.92));
  }

  async function confirm() {
    if (!shot) return;
    const base64 = shot.split(",")[1] ?? "";
    const size = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    await onCapture({
      base64,
      mimeType: "image/jpeg",
      size,
      fileName: `foto-formal-${Date.now()}.jpg`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ambil Foto Formal</DialogTitle>
          <DialogDescription>
            Duduk tegak menghadap kamera, wajah terlihat jelas, pencahayaan cukup.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg border bg-muted">
          <video ref={videoRef} playsInline muted className="hidden" />
          {shot ? (
            <img src={shot} alt="Pratinjau foto formal" className="w-full" />
          ) : (
            <canvas ref={canvasRef} className="w-full" />
          )}
          {!ready && !shot && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Menyalakan kamera…
            </div>
          )}
        </div>

        {!shot && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Warna latar {segReady ? "" : "(memuat…)"}
            </p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  disabled={b.value !== null && !segReady}
                  onClick={() => setBg(b.value)}
                  className={`rounded-md border px-3 py-2 text-xs transition disabled:opacity-40 ${
                    bg === b.value ? "border-primary ring-2 ring-primary/40" : "border-input"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ background: b.value ?? "transparent" }}
                    />
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {shot ? (
            <>
              <Button type="button" size="lg" onClick={confirm} disabled={busy}>
                {busy ? "Menyimpan…" : "Gunakan & Simpan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShot(null)}
                disabled={busy}
              >
                Ambil Ulang
              </Button>
            </>
          ) : (
            <Button type="button" size="lg" onClick={take} disabled={!ready}>
              Ambil Foto
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
