import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateDeck } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Layers, Sparkles, Trash2, X, ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Card = { front: string; back: string };

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — StudyFlow" }] }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateDeck);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
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

  async function onGenerate() {
    if (!topic.trim() || notes.trim().length < 20) { toast.error("Add a topic and notes."); return; }
    setLoading(true);
    try {
      await generate({ data: { topic, notes, count } });
      toast.success("Deck ready!");
      setTopic(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["decks"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Flashcards</h1>
        <p className="text-muted-foreground mt-1">Auto-generated decks with flip-card study mode.</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
        <div className="grid lg:grid-cols-3 gap-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" className="lg:col-span-2 rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring">
            {[6, 8, 10, 12, 16, 20].map(n => <option key={n} value={n}>{n} cards</option>)}
          </select>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Paste notes..." className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
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
