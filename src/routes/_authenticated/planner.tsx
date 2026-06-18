import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planner — StudyFlow" }] }),
  component: PlannerPage,
});

function PlannerPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", subject: "", due_date: "", duration_minutes: 30 });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("study_tasks").insert({
      user_id: u.user!.id,
      title: form.title,
      subject: form.subject || null,
      due_date: form.due_date || null,
      duration_minutes: form.duration_minutes,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task added");
    setForm({ title: "", subject: "", due_date: "", duration_minutes: 30 });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function toggle(t: any) {
    const completed = !t.completed;
    await supabase.from("study_tasks").update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", t.id);
    if (completed) {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("study_sessions").insert({ user_id: u.user!.id, activity: "task_complete", minutes: t.duration_minutes ?? 30, xp: 20 });
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function remove(id: string) {
    await supabase.from("study_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  const byDay = tasks.reduce<Record<string, any[]>>((acc, t) => {
    const key = t.due_date ? new Date(t.due_date).toDateString() : "No deadline";
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Study Planner</h1>
        <p className="text-muted-foreground mt-1">Plan sessions, hit deadlines, build streaks.</p>
      </div>

      <form onSubmit={addTask} className="rounded-3xl bg-card border border-border p-6 shadow-soft grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className="lg:col-span-2 rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" required />
        <input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <input type="datetime-local" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} className="rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <button className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-5 py-3 shadow-glow inline-flex items-center justify-center gap-2"><Plus className="size-4" /> Add</button>
      </form>

      <div className="grid lg:grid-cols-2 gap-5">
        {Object.entries(byDay).length === 0 && <div className="col-span-full text-center text-muted-foreground py-12"><Calendar className="mx-auto size-10 opacity-50" /><div className="mt-2">No tasks yet.</div></div>}
        {Object.entries(byDay).map(([day, list]) => (
          <motion.div layout key={day} className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{day}</div>
            <ul className="mt-3 divide-y divide-border">
              {list.map(t => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <button onClick={() => toggle(t)}>
                    {t.completed ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground hover:text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.subject ?? "General"} · {t.duration_minutes}m</div>
                  </div>
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
