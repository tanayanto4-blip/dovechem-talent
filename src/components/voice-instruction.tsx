import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square, Pause, Play, AlertCircle, RotateCcw } from "lucide-react";

export type VoiceSettings = {
  text: string;
  lang?: string | null;
  rate?: number | null;
};

/** Small wrapper around the browser SpeechSynthesis API. */
export function useSpeech({ text, lang, rate }: VoiceSettings) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || "id-ID";
    u.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) =>
      v.lang?.toLowerCase().startsWith((u.lang || "id").slice(0, 2).toLowerCase()),
    );
    if (match) u.voice = match;
    u.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    u.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterRef.current = u;
    setSpeaking(true);
    setPaused(false);
    window.speechSynthesis.speak(u);
  }, [text, lang, rate]);

  const toggplePause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, []);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );

  return { supported, speaking, paused, speak, stop, togglePause: toggplePause };
}

/** Player controls + transcript for a spoken instruction. */
export function VoiceInstructionPlayer({
  text,
  lang,
  rate,
  autoplay = false,
  title = "Instruksi Suara",
  compact = false,
  replayRef,
}: VoiceSettings & {
  autoplay?: boolean;
  title?: string;
  compact?: boolean;
  replayRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const { supported, speaking, paused, speak, stop, togglePause } = useSpeech({ text, lang, rate });
  const autoTried = useRef(false);

  useEffect(() => {
    if (!autoplay || autoTried.current || !supported || !text.trim()) return;
    autoTried.current = true;
    const t = setTimeout(() => speak(), 400);
    return () => clearTimeout(t);
  }, [autoplay, supported, text, speak]);

  useEffect(() => {
    if (!replayRef) return;
    replayRef.current = speak;
    return () => {
      replayRef.current = null;
    };
  }, [replayRef, speak]);

  if (!text.trim()) return null;

  return (
    <div className={`rounded-lg border bg-accent/40 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Volume2 className="h-4 w-4" /> {title}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={speak} disabled={!supported}>
            <Play className="mr-1.5 h-3.5 w-3.5" /> {speaking ? "Ulangi" : "Putar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={togglePause}
            disabled={!supported || !speaking}
          >
            {paused ? (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Pause className="mr-1.5 h-3.5 w-3.5" />
            )}
            {paused ? "Lanjut" : "Jeda"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={speak} disabled={!supported}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Ulangi instruksi
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={stop}
            disabled={!supported || !speaking}
          >
            <Square className="mr-1.5 h-3.5 w-3.5" /> Berhenti
          </Button>
        </div>
      </div>
      {!supported && (
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          Peramban Anda tidak mendukung pemutaran suara. Silakan baca teks instruksi di bawah ini.
        </p>
      )}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}
