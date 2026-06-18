import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateSummary, summarizeFromUpload } from "@/lib/ai.functions";
import { toast } from "sonner";
import { BookOpen, Search, Sparkles, Trash2, Upload, FileText, Image as ImageIcon, X } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/summaries")({
  head: () => ({ meta: [{ title: "Summaries — StudyFlow" }] }),
  component: SummariesPage,
});

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown";
const MAX_BYTES = 20 * 1024 * 1024;

function SummariesPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateSummary);
  const summarizeUpload = useServerFn(summarizeFromUpload);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["summaries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("summaries").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function pickFile(f: File | null) {
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) { toast.error("File too large (max 20 MB)"); return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onGenerate() {
    if (!title.trim()) { toast.error("Add a title."); return; }
    setLoading(true);
    try {
      if (file) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const up = await supabase.storage.from("study-uploads").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        await summarizeUpload({ data: { title, storage_path: path, mime_type: file.type } });
      } else {
        if (text.trim().length < 20) { toast.error("Paste at least 20 chars or attach a file."); setLoading(false); return; }
        await generate({ data: { title, text } });
      }
      toast.success("Summary ready!");
      setTitle(""); setText(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      qc.invalidateQueries({ queryKey: ["summaries"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    await supabase.from("summaries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["summaries"] });
  }

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">AI Summaries</h1>
          <p className="text-muted-foreground mt-1">Paste notes or snap a photo of your textbook — we'll do the rest.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-card border border-border p-6 shadow-soft"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
      >
        <div className="grid lg:grid-cols-[1fr_auto] gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Biology Ch. 4 — Photosynthesis)" className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {file ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
            {file.type.startsWith("image/") ? <ImageIcon className="size-5 text-primary" /> : <FileText className="size-5 text-primary" />}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size/1024).toFixed(0)} KB · {file.type || "file"}</div>
            </div>
            <button onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ""; }} className="p-1 text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste your notes here, or drag & drop a photo/PDF below..." className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-3 w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition px-4 py-6 flex flex-col items-center gap-2 text-muted-foreground"
            >
              <Upload className="size-6" />
              <div className="font-semibold">Upload a photo or PDF of your notes</div>
              <div className="text-xs">PNG, JPG, WebP, PDF, TXT · up to 20 MB</div>
            </button>
          </>
        )}
        <input
          ref={fileInput} type="file" accept={ACCEPTED} className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-muted-foreground">{file ? "1 file attached" : `${text.length} chars`}</div>
          <button onClick={onGenerate} disabled={loading} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-3 shadow-glow inline-flex items-center gap-2 disabled:opacity-60">
            <Sparkles className="size-4" /> {loading ? "Summarizing..." : "Generate summary"}
          </button>
        </div>
      </motion.div>


      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search summaries..." className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12"><BookOpen className="mx-auto size-10 opacity-50" /><div className="mt-2">No summaries yet.</div></div>}
        {filtered.map(s => (
          <motion.div key={s.id} layout className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="text-left flex-1">
                <h3 className="font-extrabold text-lg">{s.title}</h3>
                <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              </button>
              <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
            </div>
            <p className={`mt-3 text-sm ${open === s.id ? "" : "line-clamp-3"}`}>{s.summary}</p>
            {open === s.id && Array.isArray(s.key_points) && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {(s.key_points as string[]).map((k, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent">✦</span>{k}</li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
