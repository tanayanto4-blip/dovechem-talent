/**
 * Client-side builder for the proctoring evidence bundle.
 *
 * Takes the signed frames of one session and produces a single ZIP containing
 * every captured frame, a manifest CSV of the camera timeline, and a timelapse
 * video (WebM) assembled from those frames so the reviewer can watch the whole
 * session instead of scrolling through stills.
 */

export type EvidenceFrame = { id: string; event: string; captured_at: string; url: string | null };
export type EvidenceSession = {
  candidate_name: string;
  candidate_code: string | null;
  position: string | null;
  test_name: string | null;
  test_type: string | null;
  attempt_status: string | null;
  started_at: string | null;
  finished_at: string | null;
};

const FRAME_MS = 200; // playback pace of the timelapse (~5 fps)
const MAX_VIDEO_FRAMES = 900;

function slug(s: string) {
  return (s || "kandidat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Renders the frames into a WebM timelapse. Returns null when unsupported. */
async function buildTimelapse(
  images: HTMLImageElement[],
  onProgress?: (pct: number) => void,
): Promise<Blob | null> {
  if (typeof MediaRecorder === "undefined" || images.length === 0) return null;
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(
    (m) => MediaRecorder.isTypeSupported?.(m),
  );
  if (!mime) return null;

  const w = 640;
  const h = Math.round((images[0].naturalHeight / (images[0].naturalWidth || 1)) * w) || 480;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const stream = canvas.captureStream(1000 / FRAME_MS);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_200_000 });
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });
  recorder.start();

  for (let i = 0; i < images.length; i++) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(images[i], 0, 0, w, h);
    onProgress?.(Math.round(((i + 1) / images.length) * 100));
    await new Promise((r) => setTimeout(r, FRAME_MS));
  }
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return done;
}

/**
 * Downloads every frame, packages the ZIP (frames + manifest + timelapse) and
 * triggers the browser download. Returns a short summary for the UI.
 */
export async function downloadProctorEvidence(
  session: EvidenceSession,
  frames: EvidenceFrame[],
  onProgress?: (label: string, pct: number) => void,
): Promise<{ frames: number; video: boolean }> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const withUrl = frames.filter((f) => f.url);
  const images: HTMLImageElement[] = [];
  const rows = [["no", "waktu", "peristiwa", "file"].join(",")];

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const no = String(i + 1).padStart(4, "0");
    let name = "";
    if (f.url) {
      try {
        const res = await fetch(f.url);
        if (res.ok) {
          const blob = await res.blob();
          name = `frames/${no}_${new Date(f.captured_at).toISOString().replace(/[:.]/g, "-")}.jpg`;
          zip.file(name, blob);
          if (images.length < MAX_VIDEO_FRAMES) {
            const img = await loadImage(URL.createObjectURL(blob));
            if (img) images.push(img);
          }
        }
      } catch {
        /* keep the manifest row even when one frame fails */
      }
    }
    rows.push([no, new Date(f.captured_at).toLocaleString("id-ID"), f.event, name].map(csvCell).join(","));
    onProgress?.("Mengunduh frame", Math.round(((i + 1) / Math.max(frames.length, 1)) * 100));
  }

  zip.file("manifest.csv", rows.join("\n"));
  zip.file(
    "sesi.txt",
    [
      `Kandidat      : ${session.candidate_name}`,
      `Kode          : ${session.candidate_code ?? "-"}`,
      `Posisi        : ${session.position ?? "-"}`,
      `Tes           : ${session.test_name ?? "-"} (${session.test_type ?? "-"})`,
      `Status        : ${session.attempt_status ?? "-"}`,
      `Mulai         : ${session.started_at ? new Date(session.started_at).toLocaleString("id-ID") : "-"}`,
      `Selesai       : ${session.finished_at ? new Date(session.finished_at).toLocaleString("id-ID") : "-"}`,
      `Total frame   : ${withUrl.length}`,
      `Total catatan : ${frames.length}`,
      `Diunduh       : ${new Date().toLocaleString("id-ID")}`,
    ].join("\n"),
  );

  onProgress?.("Menyusun video rekaman", 0);
  const video = await buildTimelapse(images, (p) => onProgress?.("Menyusun video rekaman", p));
  if (video && video.size > 0) zip.file("rekaman.webm", video);

  onProgress?.("Mengemas ZIP", 100);
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `proctoring-${slug(session.candidate_name)}-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  return { frames: withUrl.length, video: !!video };
}
