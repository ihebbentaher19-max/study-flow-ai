import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateDeck } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Layers, Sparkles, Trash2, X, ChevronLeft, ChevronRight, Shuffle, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Card = { front: string; back: string };

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — StudyFlow" }] }),
  component: FlashcardsPage,
});

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown";
const MAX_BYTES = 20 * 1024 * 1024;

function FlashcardsPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateDeck);
  const fileInput = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<any | null>(null);

  const { data: decks = [] } = useQuery({
    queryKey: ["decks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcard_decks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function pickFile(f: File | null) {
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) { toast.error("File too large (max 20 MB)"); return; }
    setFile(f);
    if (!topic.trim()) setTopic(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onGenerate() {
    if (!topic.trim()) { toast.error("Add a topic."); return; }
    if (!file && notes.trim().length < 20) { toast.error("Add notes or attach a file."); return; }
    setLoading(true);
    try {
      if (file) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Not signed in");
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const up = await supabase.storage.from("study-uploads").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        await generate({ data: { topic, count, storage_path: path, mime_type: file.type } });
      } else {
        await generate({ data: { topic, notes, count } });
      }
      toast.success("Deck ready!");
      setTopic(""); setNotes(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      qc.invalidateQueries({ queryKey: ["decks"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Flashcards</h1>
        <p className="text-muted-foreground mt-1">Generate decks from notes, photos, or PDFs.</p>
      </div>

      <div
        className="rounded-3xl bg-card border border-border p-6 shadow-soft"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
      >
        <div className="grid lg:grid-cols-3 gap-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" className="lg:col-span-2 rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring">
            {[6, 8, 10, 12, 16, 20].map(n => <option key={n} value={n}>{n} cards</option>)}
          </select>
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Paste notes, or attach a photo/PDF below..." className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-3 w-full rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition px-4 py-6 flex flex-col items-center gap-2 text-muted-foreground"
            >
              <Upload className="size-6" />
              <div className="font-semibold">Upload a photo or PDF</div>
              <div className="text-xs">PNG, JPG, WebP, PDF, TXT · up to 20 MB</div>
            </button>
          </>
        )}
        <input
          ref={fileInput} type="file" accept={ACCEPTED} className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-3 flex justify-end">
          <button onClick={onGenerate} disabled={loading} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-3 shadow-glow inline-flex items-center gap-2 disabled:opacity-60">
            <Sparkles className="size-4" /> {loading ? "Generating..." : "Generate deck"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12"><Layers className="mx-auto size-10 opacity-50" /><div className="mt-2">No decks yet.</div></div>}
        {decks.map(d => (
          <motion.button layout key={d.id} onClick={() => setActive(d)} className="text-left rounded-3xl bg-card border border-border p-5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition">
            <div className="flex justify-between">
              <h3 className="font-extrabold">{d.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); supabase.from("flashcard_decks").delete().eq("id", d.id).then(() => qc.invalidateQueries({ queryKey: ["decks"] })); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{(d.cards as any[]).length} cards</div>
            <div className="mt-3 inline-flex rounded-full bg-gradient-accent text-accent-foreground font-bold text-xs px-3 py-1">Study deck</div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>{active && <StudyMode deck={active} onClose={() => setActive(null)} />}</AnimatePresence>
    </div>
  );
}

function StudyMode({ deck, onClose }: { deck: any; onClose: () => void }) {
  const [cards] = useState<Card[]>(deck.cards as Card[]);
  const [order, setOrder] = useState<number[]>(cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const idx = order[pos];
  const card = cards[idx];
  const next = () => { setFlipped(false); setPos((p) => Math.min(p + 1, cards.length - 1)); };
  const prev = () => { setFlipped(false); setPos((p) => Math.max(p - 1, 0)); };
  const shuffle = () => { setOrder([...order].sort(() => Math.random() - 0.5)); setPos(0); setFlipped(false); };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-lift p-6">
        <div className="flex items-center justify-between">
          <div className="font-extrabold">{deck.title}</div>
          <div className="flex items-center gap-2">
            <button onClick={shuffle} className="p-2 rounded-full hover:bg-muted"><Shuffle className="size-4" /></button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted"><X className="size-5" /></button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Card {pos + 1} of {cards.length}</div>

        <div className="mt-5 [perspective:1200px] h-72">
          <motion.button
            onClick={() => setFlipped(f => !f)}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full rounded-3xl [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-primary text-primary-foreground grid place-items-center p-6 text-center [backface-visibility:hidden] shadow-glow">
              <div className="text-xs uppercase tracking-wider opacity-70 absolute top-4 left-1/2 -translate-x-1/2">Question</div>
              <div className="text-2xl font-extrabold">{card.front}</div>
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-accent text-accent-foreground grid place-items-center p-6 text-center [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-glow">
              <div className="text-xs uppercase tracking-wider opacity-70 absolute top-4 left-1/2 -translate-x-1/2">Answer</div>
              <div className="text-xl font-bold">{card.back}</div>
            </div>
          </motion.button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={prev} disabled={pos === 0} className="rounded-full border border-border px-4 py-2 font-bold disabled:opacity-40 inline-flex items-center gap-1"><ChevronLeft className="size-4" /> Prev</button>
          <button onClick={() => setFlipped(f => !f)} className="rounded-full bg-foreground text-background px-5 py-2 font-bold">Flip</button>
          <button onClick={next} disabled={pos === cards.length - 1} className="rounded-full bg-gradient-primary text-primary-foreground px-4 py-2 font-bold disabled:opacity-40 inline-flex items-center gap-1">Next <ChevronRight className="size-4" /></button>
        </div>
      </motion.div>
    </motion.div>
  );
}
