import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrackTabs } from "@/components/track-tabs";
import { BiodataBank } from "@/components/biodata-bank";
import type { CandidateType } from "@/lib/candidate-type";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentsBank,
  head: () => ({
    meta: [
      { title: "Bank Data Kandidat — Dover Chemical HR" },
      { name: "description", content: "Pusat data seluruh kandidat magang dan karyawan." },
      { property: "og:title", content: "Bank Data Kandidat — Dover Chemical HR" },
      { property: "og:description", content: "Pusat data seluruh kandidat magang dan karyawan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function DocumentsBank() {
  const [track, setTrack] = useState<CandidateType>("magang");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Bank Data Kandidat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bank data dipisah per jalur kandidat. Pilih jalur untuk melihat biodata kandidat.
        </p>
        <TrackTabs value={track} onChange={setTrack} className="mt-4" />
      </div>

      <BiodataBank track={track} />
    </div>
  );
}
