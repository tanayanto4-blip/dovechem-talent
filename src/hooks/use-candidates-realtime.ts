import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Live-sync candidate biodata into the staff (Super Admin / HR) dashboards.
 *
 * Candidates edit their biodata through a server function that writes to
 * `public.candidates`. Postgres streams that change over Supabase Realtime,
 * and every staff query that renders candidate data is invalidated here so
 * the Admin/HR screens refresh on their own — no manual reload needed.
 *
 * RLS still applies to the realtime stream: only signed-in admin/HR users
 * receive these rows.
 */
const CANDIDATE_QUERY_KEYS = [
  ["candidates"],
  ["biodata-bank-candidates"],
  ["admin-stats"],
  ["admin-all-attempts"],
  ["all-candidate-files"],
] as const;

export function useCandidatesRealtime(options?: { notify?: boolean }) {
  const qc = useQueryClient();
  const notify = options?.notify ?? true;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingName: string | null = null;

    const flush = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      // Only refetch queries that are currently active on screen. Inactive
      // pages do not need a background fetch, which keeps navigation snappy.
      for (const key of CANDIDATE_QUERY_KEYS) {
        qc.invalidateQueries({ queryKey: key as unknown as string[], refetchType: "active" });
      }
      if (pendingName && notifyRef.current) {
        toast.info(
          pendingName ? `Biodata diperbarui: ${pendingName}` : "Biodata kandidat diperbarui",
          { description: "Data di dashboard sudah disegarkan otomatis." },
        );
      }
      pendingName = null;
    };

    const channel = supabase
      .channel("staff-candidates-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { id?: string; full_name?: string } | null;
          if (row?.id) {
            qc.invalidateQueries({ queryKey: ["candidate", row.id], refetchType: "active" });
          }
          if (payload.eventType === "UPDATE") {
            const name = (payload.new as { full_name?: string } | null)?.full_name;
            if (name) pendingName = name;
          }
          // Batch rapid updates (e.g. autosave typing) into one refetch.
          if (!debounceTimer) {
            debounceTimer = setTimeout(flush, 800);
          }
        },
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
