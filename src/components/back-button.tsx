import { useRouter, useCanGoBack, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tombol kembali yang mengikuti riwayat navigasi (mis. dari Bank Data Hasil
 * balik ke Bank Data Hasil, bukan lompat ke daftar Kandidat).
 * Kalau tidak ada riwayat (buka link langsung), pakai `fallbackTo`.
 */
export function BackButton({
  fallbackTo,
  params,
  label = "Kembali",
}: {
  fallbackTo: string;
  params?: Record<string, string>;
  label?: string;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  if (canGoBack) {
    return (
      <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {label}
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={fallbackTo} params={params as never}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}
