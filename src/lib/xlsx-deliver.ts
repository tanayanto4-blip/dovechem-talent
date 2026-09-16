/**
 * Pengiriman file Excel hasil skoring.
 *
 * Secara default file langsung diunduh oleh browser. Saat dijalankan di dalam
 * `withXlsxCapture`, file TIDAK diunduh satu per satu melainkan dikumpulkan
 * supaya bisa digabung (mis. menjadi satu arsip rangkuman per kandidat).
 */
export interface CapturedXlsx {
  blob: Blob;
  filename: string;
}

let capture: CapturedXlsx[] | null = null;

/** Unduh file Excel, atau tampung bila sedang dalam mode capture. */
export function deliverXlsx(blob: Blob, filename: string) {
  if (capture) {
    capture.push({ blob, filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Jalankan beberapa exporter Excel dan kumpulkan file-nya tanpa mengunduh. */
export async function withXlsxCapture(run: () => Promise<void>): Promise<CapturedXlsx[]> {
  const prev = capture;
  const bucket: CapturedXlsx[] = [];
  capture = bucket;
  try {
    await run();
  } finally {
    capture = prev;
  }
  return bucket;
}
