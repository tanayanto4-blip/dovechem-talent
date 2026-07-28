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
import { Volume2, Save, Loader2 } from "lucide-react";
import { VoiceInstructionPlayer } from "@/components/voice-instruction";

export const Route = createFileRoute("/admin/instruksi")({ component: VoiceAdmin });

type Row = {
  id: string; code: string; name: string; test_type: string;
  voice_instruction: string | null; voice_enabled: boolean;
  voice_lang: string; voice_rate: number; voice_autoplay: boolean;
};

const TEMPLATE = (name: string) =>
  `Selamat datang di ${name}. Bacalah setiap soal dengan teliti. Kerjakan sesuai waktu yang tersedia. Jawaban tersimpan otomatis. Jika waktu habis, jawaban akan terkirim secara otomatis. Tekan tombol Mulai Test bila Anda sudah siap.`;

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

  useEffect(() => { setText(row.voice_instruction ?? ""); }, [row.voice_instruction]);

  async function save() {
    setSaving(true);
    try {
      await onSave({ test_id: row.id, voice_instruction: text, voice_enabled: enabled, voice_lang: lang, voice_rate: rate, voice_autoplay: autoplay });
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
            <Button type="button" size="sm" variant="ghost" onClick={() => setText(TEMPLATE(row.name))}>Gunakan template</Button>
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

        {text.trim() && <VoiceInstructionPlayer text={text} lang={lang} rate={rate} title="Pratinjau suara" compact />}

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
