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

// The wasm runtime MUST match the installed @mediapipe/tasks-vision build, so
// we bundle it locally instead of pulling a mismatched version from a CDN.
import wasmLoaderUrl from "@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url";
import wasmBinaryUrl from "@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url";
import wasmNoSimdLoaderUrl from "@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js?url";
import wasmNoSimdBinaryUrl from "@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm?url";

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
  const lastSegmentAtRef = useRef(0);
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
    segRef.current?.close?.();
    segRef.current = null;
    lastSegmentAtRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
    setSegReady(false);
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
          outputConfidenceMasks: true,
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

    const sourceCanvas = document.createElement("canvas");
    const personCanvas = document.createElement("canvas");
    const maskCanvas = document.createElement("canvas");
    let hasPersonMask = false;

    function updateMask(result: any) {
      const labels: string[] = segRef.current?.getLabels?.() ?? [];
      const personIndex = Math.max(
        0,
        labels.findIndex((label) => /person|selfie|foreground|hair|body/i.test(label)),
      );
      const confidenceMask =
        result.confidenceMasks?.[personIndex] ??
        (result.confidenceMasks?.length === 1 ? result.confidenceMasks[0] : undefined);
      const categoryMask = result.categoryMask;
      const selectedMask = confidenceMask ?? categoryMask;
      if (!selectedMask) return;

      const maskWidth = selectedMask.width;
      const maskHeight = selectedMask.height;
      if (!maskWidth || !maskHeight) return;

      const floatData = confidenceMask?.getAsFloat32Array?.();
      const categoryData = categoryMask?.getAsUint8Array?.();
      if (!floatData && !categoryData) return;

      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const maskContext = maskCanvas.getContext("2d");
      if (!maskContext) return;

      const alphaImage = maskContext.createImageData(maskWidth, maskHeight);
      for (let index = 0; index < maskWidth * maskHeight; index += 1) {
        const confidence = floatData
          ? floatData[index] ?? 0
          : categoryData?.[index] === personIndex
            ? 1
            : 0;
        // A soft threshold protects facial features and hair while feathering edges.
        const normalized = Math.min(1, Math.max(0, (confidence - 0.18) / 0.62));
        const alpha = normalized * normalized * (3 - 2 * normalized);
        const pixel = index * 4;
        alphaImage.data[pixel] = 255;
        alphaImage.data[pixel + 1] = 255;
        alphaImage.data[pixel + 2] = 255;
        alphaImage.data[pixel + 3] = Math.round(alpha * 255);
      }
      maskContext.putImageData(alphaImage, 0, 0);
      hasPersonMask = true;
    }

    function loop(timestamp = performance.now()) {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;
      const ctx = c.getContext("2d");
      if (ctx && v.videoWidth) {
        if (c.width !== v.videoWidth) {
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          sourceCanvas.width = c.width;
          sourceCanvas.height = c.height;
          personCanvas.width = c.width;
          personCanvas.height = c.height;
        }

        const sourceContext = sourceCanvas.getContext("2d");
        if (!sourceContext) return;
        sourceContext.save();
        sourceContext.clearRect(0, 0, c.width, c.height);
        sourceContext.translate(c.width, 0);
        sourceContext.scale(-1, 1);
        sourceContext.drawImage(v, 0, 0, c.width, c.height);
        sourceContext.restore();

        const color = bgRef.current;
        const seg = segRef.current;
        if (color && seg) {
          if (timestamp - lastSegmentAtRef.current >= 70) {
            try {
              const result = seg.segmentForVideo(v, timestamp);
              updateMask(result);
              result.close?.();
              lastSegmentAtRef.current = timestamp;
            } catch {
              hasPersonMask = false;
            }
          }

          if (hasPersonMask) {
            const personContext = personCanvas.getContext("2d");
            if (personContext) {
              personContext.clearRect(0, 0, c.width, c.height);
              personContext.globalCompositeOperation = "source-over";
              personContext.drawImage(sourceCanvas, 0, 0);
              personContext.globalCompositeOperation = "destination-in";
              personContext.save();
              personContext.filter = "blur(1.5px)";
              personContext.translate(c.width, 0);
              personContext.scale(-1, 1);
              personContext.drawImage(maskCanvas, -2, -2, c.width + 4, c.height + 4);
              personContext.restore();
              personContext.globalCompositeOperation = "source-over";

              ctx.fillStyle = color;
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.drawImage(personCanvas, 0, 0);
            }
          } else {
            ctx.drawImage(sourceCanvas, 0, 0);
          }
        } else {
          ctx.drawImage(sourceCanvas, 0, 0);
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
