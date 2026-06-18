import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateQuiz, recordQuizAttempt } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Brain, Check, Sparkles, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Q = { question: string; choices: string[]; correct_index: number; explanation: string };

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — StudyFlow" }] }),
  component: QuizzesPage,
});

function QuizzesPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateQuiz);
  const record = useServerFn(recordQuizAttempt);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: quizzes = [] } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function onGenerate() {
    if (!topic.trim() || notes.trim().length < 20) { toast.error("Add a topic and notes."); return; }
    setLoading(true);
    try {
      await generate({ data: { topic, notes, count } });
      toast.success("Quiz ready!");
      setTopic(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["quizzes"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setLoading(false); }
  }

  async function submitQuiz() {
    if (!active) return;
    const qs = active.questions as Q[];
    const correct = qs.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);
    const score = Math.round((correct / qs.length) * 100);
    setSubmitted(true);
    try {
      await record({ data: { quiz_id: active.id, score } });
      toast.success(`Scored ${score}%`);
      qc.invalidateQueries({ queryKey: ["quizzes"] });
    } catch {}
  }

  function openQuiz(q: any) { setActive(q); setAnswers({}); setSubmitted(false); }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Quiz Generator</h1>
        <p className="text-muted-foreground mt-1">Turn notes into multiple-choice quizzes.</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
        <div className="grid lg:grid-cols-3 gap-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Cell Biology)" className="lg:col-span-2 rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring">
            {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Paste study notes..." className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-3 flex justify-end">
          <button onClick={onGenerate} disabled={loading} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-3 shadow-glow inline-flex items-center gap-2 disabled:opacity-60">
            <Sparkles className="size-4" /> {loading ? "Generating..." : "Generate quiz"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12"><Brain className="mx-auto size-10 opacity-50" /><div className="mt-2">No quizzes yet.</div></div>}
        {quizzes.map(q => (
          <motion.button layout key={q.id} onClick={() => openQuiz(q)} className="text-left rounded-3xl bg-card border border-border p-5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition">
            <div className="flex justify-between">
              <h3 className="font-extrabold">{q.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); supabase.from("quizzes").delete().eq("id", q.id).then(() => qc.invalidateQueries({ queryKey: ["quizzes"] })); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{(q.questions as any[]).length} questions · {q.attempts} attempts</div>
            {q.best_score != null && <div className="mt-3 inline-flex rounded-full bg-accent/15 text-accent font-bold text-xs px-3 py-1">Best {q.best_score}%</div>}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4" onClick={() => setActive(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-lift">
              <div className="sticky top-0 bg-card/95 backdrop-blur p-5 border-b border-border flex items-center justify-between">
                <h2 className="font-extrabold">{active.title}</h2>
                <button onClick={() => setActive(null)} className="p-1 rounded-full hover:bg-muted"><X className="size-5" /></button>
              </div>
              <div className="p-5 space-y-5">
                {(active.questions as Q[]).map((q, i) => {
                  const picked = answers[i];
                  return (
                    <div key={i}>
                      <div className="font-bold">{i + 1}. {q.question}</div>
                      <div className="mt-2 grid gap-2">
                        {q.choices.map((c, ci) => {
                          const isPicked = picked === ci;
                          const isCorrect = q.correct_index === ci;
                          let style = "border-border bg-background hover:bg-muted";
                          if (submitted) {
                            if (isCorrect) style = "border-success bg-success/10 text-success-foreground";
                            else if (isPicked) style = "border-destructive bg-destructive/10";
                          } else if (isPicked) style = "border-primary bg-primary/10";
                          return (
                            <button key={ci} disabled={submitted} onClick={() => setAnswers(a => ({ ...a, [i]: ci }))}
                              className={cn("text-left rounded-2xl border-2 px-4 py-2.5 text-sm font-medium transition flex items-center justify-between", style)}>
                              <span>{c}</span>
                              {submitted && isCorrect && <Check className="size-4 text-success" />}
                              {submitted && isPicked && !isCorrect && <X className="size-4 text-destructive" />}
                            </button>
                          );
                        })}
                      </div>
                      {submitted && <div className="mt-2 text-xs text-muted-foreground italic">{q.explanation}</div>}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 bg-card/95 backdrop-blur p-5 border-t border-border flex justify-end gap-2">
                {!submitted ? (
                  <button onClick={submitQuiz} disabled={Object.keys(answers).length !== (active.questions as any[]).length}
                    className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-2.5 disabled:opacity-50 shadow-glow">Submit</button>
                ) : (
                  <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-2.5">Retry</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
