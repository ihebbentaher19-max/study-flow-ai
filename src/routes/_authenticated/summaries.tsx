import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateSummary } from "@/lib/ai.functions";
import { toast } from "sonner";
import { BookOpen, Search, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/summaries")({
  head: () => ({ meta: [{ title: "Summaries — StudyFlow" }] }),
  component: SummariesPage,
});

function SummariesPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateSummary);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
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

  async function onGenerate() {
    if (!title.trim() || text.trim().length < 20) {
      toast.error("Add a title and at least 20 characters of notes.");
      return;
    }
    setLoading(true);
    try {
      await generate({ data: { title, text } });
      toast.success("Summary ready!");
      setTitle(""); setText("");
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
          <p className="text-muted-foreground mt-1">Paste notes, get a clean summary in seconds.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card border border-border p-6 shadow-soft">
        <div className="grid lg:grid-cols-[1fr_auto] gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Biology Ch. 4 — Photosynthesis)" className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste your notes, article, or chapter here..." className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-muted-foreground">{text.length} chars</div>
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
