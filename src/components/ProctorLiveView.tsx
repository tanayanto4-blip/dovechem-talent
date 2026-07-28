import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VideoOff } from "lucide-react";

/**
 * Live proctoring viewport. Subscribes to the candidate's realtime broadcast
 * channel and renders incoming JPEG frames (~2 fps) as a continuous video-like
 * stream. Falls back to the latest stored snapshot when no live frame arrives.
 */
export function ProctorLiveView({
  attemptId,
  fallbackUrl,
  alt,
  className,
  onLiveChange,
}: {
  attemptId?: string | null;
  fallbackUrl?: string | null;
  alt: string;
  className?: string;
  onLiveChange?: (live: boolean) => void;
}) {
  const [frame, setFrame] = useState<string | null>(null);
  const lastAtRef = useRef<number>(0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    const channel = supabase
      .channel(`proctor-live-${attemptId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "frame" }, (payload) => {
        const b64 = (payload?.payload as any)?.b64;
        if (typeof b64 === "string" && b64.length > 0) {
          lastAtRef.current = Date.now();
          setFrame(`data:image/jpeg;base64,${b64}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setFrame(null);
      lastAtRef.current = 0;
    };
  }, [attemptId]);

  // Mark the stream stale when frames stop arriving
  useEffect(() => {
    const t = setInterval(() => {
      const live = lastAtRef.current > 0 && Date.now() - lastAtRef.current < 6000;
      setIsLive((prev) => (prev === live ? prev : live));
      onLiveChange?.(live);
    }, 1500);
    return () => clearInterval(t);
  }, [onLiveChange]);

  const src = (isLive && frame) || fallbackUrl || null;

  if (!src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-500">
        <VideoOff className="h-8 w-8" />
        <span className="font-mono text-[11px] tracking-widest">NO SIGNAL</span>
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}

export default ProctorLiveView;
