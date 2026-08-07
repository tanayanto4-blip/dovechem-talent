import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVoiceInstructions, saveVoiceInstruction } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Volume2, Save, Loader2, Upload, Trash2, Mic } from "lucide-react";
import { VoiceInstructionPlayer } from "@/components/voice-instruction";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/instruksi")({ head: () => ({ meta: [
    { title: "Instruksi Suara Test — Admin Dover Chemical" },
    { name: "description", content: "Susun dan unggah instruksi suara yang diputar kandidat sebelum memulai setiap psikotest." },
    { property: "og:title", content: "Instruksi Suara Test — Admin Dover Chemical" },
    { property: "og:description", content: "Susun dan unggah instruksi suara yang diputar kandidat sebelum memulai setiap psikotest." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: VoiceAdmin });

type Row = {
  id: string; code: string; name: string; test_type: string;
  voice_instruction: string | null; voice_enabled: boolean;
  voice_lang: string; voice_rate: number; voice_autoplay: boolean;
  voice_mode: "tts" | "audio" | string;
  voice_audio_path: string | null; voice_audio_name: string | null;
  voice_audio_mime: string | null; voice_audio_url: string | null;
};

const AUDIO_MIME = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/mp4", "audio/aac", "audio/m4a", "audio/x-m4a"];
const MAX_AUDIO_MB = 15;

/** Template instruksi khusus per jenis test — tiap test punya teks berbeda. */
const TYPE_TEMPLATES: Record<string, (name: string) => string> = {
  disc: (n) =>
    `Selamat datang di ${n}. Anda akan melihat kelompok pernyataan. Pada setiap kelompok, pilih satu pernyataan yang PALING menggambarkan diri Anda pada kolom Most, dan satu yang PALING TIDAK menggambarkan diri Anda pada kolom Least. Tidak ada jawaban benar atau salah. Tekan tombol Mulai Test bila Anda sudah siap.`,
  eq: (n) =>
    `Selamat datang di ${n}. Terdapat lima puluh pernyataan tentang cara Anda mengenali dan mengelola emosi. Jawablah sejujurnya sesuai kebiasaan Anda sehari-hari, bukan sesuai yang dianggap ideal. Jawaban tersimpan otomatis. Tekan tombol Mulai Test bila Anda sudah siap.`,
  mbti: (n) =>
    `Selamat datang di ${n}. Setiap nomor berisi dua pilihan, A dan B. Pilih satu yang paling mendekati diri Anda yang sebenarnya. Tidak ada jawaban benar atau salah, dan jangan terlalu lama berpikir pada satu nomor. Tekan tombol Mulai Test bila Anda sudah siap.`,
  wpt: (n) =>
    `Selamat datang di ${n}. Waktu pengerjaan sangat singkat, jadi kerjakan secepat mungkin. Soal tersusun makin lama makin sulit. Jika satu soal terasa sulit, lewati dan lanjutkan ke soal berikutnya. Tuliskan jawaban Anda pada kolom yang tersedia. Tekan tombol Mulai Test bila Anda sudah siap.`,
  kraepelin: (n) =>
    `Selamat datang di ${n}. Jumlahkan dua angka yang berdekatan secepat dan seteliti mungkin, lalu tuliskan angka satuannya saja. Kerjakan terus tanpa berhenti sampai ada aba-aba pindah kolom. Kecepatan dan ketelitian sama pentingnya. Tekan tombol Mulai Test bila Anda sudah siap.`,
  mcq: (n) =>
    `Selamat datang di ${n}. Setiap soal memiliki satu jawaban yang paling tepat. Kerjakan soal yang mudah lebih dahulu, lalu kembali ke soal yang sulit. Jawaban terkirim otomatis saat waktu habis. Tekan tombol Mulai Test bila Anda sudah siap.`,
};

const TEMPLATE = (name: string, type: string) =>
  (TYPE_TEMPLATES[type] ??
    ((n: string) =>
      `Selamat datang di ${n}. Bacalah setiap soal dengan teliti. Kerjakan sesuai waktu yang tersedia. Jawaban tersimpan otomatis. Jika waktu habis, jawaban akan terkirim secara otomatis. Tekan tombol Mulai Test bila Anda sudah siap.`))(name);

function VoiceAdmin() {
  const listFn = useServerFn(listVoiceInstructions);
  const saveFn = useServerFn(saveVoiceInstruction);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["voice-instructions"], queryFn: () => listFn({ data: {} as never }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Instruksi Suara Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tulis teks instruksi untuk tiap test. Teks ini akan dibacakan otomatis kepada kandidat sebelum test dimulai.
        </p>
      </div>

      {isLoading && <div className="text-muted-foreground">Memuat...</div>}

      <div className="space-y-5">
        {((data?.tests ?? []) as Row[]).map((t) => (
          <VoiceCard key={t.id} row={t} onSave={async (payload) => {
            await saveFn({ data: payload });
            toast.success(`Instruksi suara "${t.name}" tersimpan.`);
            qc.invalidateQueries({ queryKey: ["voice-instructions"] });
          }} />
        ))}
      </div>
    </div>
  );
}

function VoiceCard({ row, onSave }: { row: Row; onSave: (p: any) => Promise<void> }) {
  const [text, setText] = useState(row.voice_instruction ?? "");
  const [enabled, setEnabled] = useState(row.voice_enabled);
  const [autoplay, setAutoplay] = useState(row.voice_autoplay);
  const [lang, setLang] = useState(row.voice_lang || "id-ID");
  const [rate, setRate] = useState(Number(row.voice_rate) || 1);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"tts" | "audio">(row.voice_mode === "audio" ? "audio" : "tts");
  const [audio, setAudio] = useState<{ path: string | null; name: string | null; mime: string | null; url: string | null }>({
    path: row.voice_audio_path, name: row.voice_audio_name, mime: row.voice_audio_mime, url: row.voice_audio_url,
  });
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    if (!AUDIO_MIME.includes(file.type)) { toast.error("Format audio tidak didukung (gunakan MP3, WAV, M4A, OGG, atau WEBM)."); return; }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) { toast.error(`Ukuran file maksimal ${MAX_AUDIO_MB} MB.`); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
      const path = `${row.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("voice-instructions").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("voice-instructions").createSignedUrl(path, 3600);
      setAudio({ path, name: file.name, mime: file.type, url: signed?.signedUrl ?? null });
      setMode("audio");
      toast.success("Rekaman terunggah. Jangan lupa tekan Simpan.");
    } catch (e: any) { toast.error(e?.message || "Gagal mengunggah audio."); }
    finally { setUploading(false); }
  }

  useEffect(() => { setText(row.voice_instruction ?? ""); }, [row.voice_instruction]);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        test_id: row.id, voice_instruction: text, voice_enabled: enabled, voice_lang: lang,
        voice_rate: rate, voice_autoplay: autoplay, voice_mode: mode,
        voice_audio_path: audio.path, voice_audio_name: audio.name, voice_audio_mime: audio.mime,
      });
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan."); }
    finally { setSaving(false); }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Volume2 className="h-4 w-4" /> {row.name}
          </CardTitle>
          <Badge variant="outline" className="uppercase">{row.test_type}</Badge>
          {row.voice_instruction ? <Badge className="bg-success">Terisi</Badge> : <Badge variant="secondary">Belum diisi</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`t-${row.id}`}>Teks instruksi (dibacakan ke kandidat)</Label>
            <Button type="button" size="sm" variant="ghost" onClick={() => setText(TEMPLATE(row.name, row.test_type))}>
              Template {row.test_type.toUpperCase()}
            </Button>
          </div>
          <Textarea id={`t-${row.id}`} rows={5} value={text} maxLength={4000}
            placeholder="Contoh: Selamat datang di test ini. Bacalah setiap soal dengan teliti..."
            onChange={(e) => setText(e.target.value)} />
          <p className="text-xs text-muted-foreground">{text.length}/4000 karakter</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor={`e-${row.id}`} className="text-sm">Aktifkan suara</Label>
            <Switch id={`e-${row.id}`} checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor={`a-${row.id}`} className="text-sm">Putar otomatis</Label>
            <Switch id={`a-${row.id}`} checked={autoplay} onCheckedChange={setAutoplay} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`l-${row.id}`} className="text-xs">Bahasa suara</Label>
            <Input id={`l-${row.id}`} value={lang} onChange={(e) => setLang(e.target.value)} placeholder="id-ID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`r-${row.id}`} className="text-xs">Kecepatan ({rate.toFixed(2)}x)</Label>
            <Input id={`r-${row.id}`} type="range" min={0.5} max={2} step={0.05} value={rate}
              onChange={(e) => setRate(Number(e.target.value))} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Sumber suara instruksi</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" size="sm" variant={mode === "tts" ? "default" : "outline"} onClick={() => setMode("tts")}>
                Suara otomatis (teks)
              </Button>
              <Button type="button" size="sm" variant={mode === "audio" ? "default" : "outline"} onClick={() => setMode("audio")} disabled={!audio.path}>
                Rekaman sendiri
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor={`f-${row.id}`} className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Mengunggah..." : "Unggah file audio"}
              </span>
            </Label>
            <input id={`f-${row.id}`} type="file" accept="audio/*" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }} />
            <span className="text-xs text-muted-foreground">MP3, WAV, M4A, OGG, atau WEBM · maks {MAX_AUDIO_MB} MB</span>
            {audio.path && (
              <Button type="button" size="sm" variant="ghost" className="text-destructive"
                onClick={() => { setAudio({ path: null, name: null, mime: null, url: null }); setMode("tts"); }}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus rekaman
              </Button>
            )}
          </div>

          {audio.url ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{audio.name}</p>
              <audio controls src={audio.url} className="w-full" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Belum ada rekaman. Kandidat akan mendengar suara otomatis dari teks di atas.</p>
          )}
        </div>

        {mode === "tts" && text.trim() && <VoiceInstructionPlayer text={text} lang={lang} rate={rate} title="Pratinjau suara" compact />}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
