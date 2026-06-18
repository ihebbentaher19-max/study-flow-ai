import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getRecommendations } from "@/lib/ai.functions";
import { BookOpen, Brain, Calendar, Flame, Layers, LineChart, Sparkles, Trophy, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — StudyFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const [profile, summaries, quizzes, decks, tasks, sessions] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("summaries").select("id,title,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("quizzes").select("id,title,best_score,attempts").order("created_at", { ascending: false }).limit(5),
        supabase.from("flashcard_decks").select("id,title,cards").order("created_at", { ascending: false }).limit(5),
        supabase.from("study_tasks").select("*").eq("completed", false).order("due_date", { ascending: true }).limit(6),
        supabase.from("study_sessions").select("minutes,xp,occurred_at").gte("occurred_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      const totalMinutes = (sessions.data ?? []).reduce((s, r) => s + (r.minutes ?? 0), 0);
      const totalXp = (sessions.data ?? []).reduce((s, r) => s + (r.xp ?? 0), 0);
      return {
        profile: profile.data,
        summaries: summaries.data ?? [],
        quizzes: quizzes.data ?? [],
        decks: decks.data ?? [],
        tasks: tasks.data ?? [],
        totalMinutes,
        totalXp,
      };
    },
  });

  const getRecs = useServerFn(getRecommendations);
  const [recs, setRecs] = useState<string>("");
  useEffect(() => { getRecs({}).then((r) => setRecs(r.text)).catch(() => {}); }, [getRecs]);

  if (isLoading || !data) return <div className="animate-pulse text-muted-foreground">Loading your study space...</div>;

  const stats = [
    { label: "Study streak", value: `${data.profile?.streak_days ?? 0} days`, icon: Flame, color: "from-warning to-destructive" },
    { label: "Minutes this week", value: data.totalMinutes, icon: LineChart, color: "from-primary to-secondary" },
    { label: "XP earned", value: data.totalXp, icon: Trophy, color: "from-accent to-secondary" },
    { label: "Open tasks", value: data.tasks.length, icon: Calendar, color: "from-primary to-accent" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black">Hey {data.profile?.full_name?.split(" ")[0] ?? "there"} 👋</h1>
            <p className="text-muted-foreground mt-1">Let's keep that streak alive.</p>
          </div>
          <div className="flex gap-2">
            <QuickLink to="/summaries" icon={BookOpen} label="New Summary" />
            <QuickLink to="/quizzes" icon={Brain} label="New Quiz" />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className={cn("size-10 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-soft", s.color)}>
              <s.icon className="size-5" />
            </div>
            <div className="mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</div>
            <div className="text-3xl font-black mt-1">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold">Upcoming tasks</h2>
            <Link to="/planner" className="text-sm font-bold text-primary inline-flex items-center gap-1">Open planner <ArrowRight className="size-4" /></Link>
          </div>
          {data.tasks.length === 0 ? (
            <EmptyState icon={Calendar} title="No tasks yet" body="Plan your week to start a streak." cta={<Link to="/planner" className="text-primary font-bold">Create task</Link>} />
          ) : (
            <ul className="divide-y divide-border">
              {data.tasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.subject ?? "General"} · {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No deadline"}</div>
                  </div>
                  <div className="text-xs font-bold rounded-full bg-muted px-2.5 py-1">{t.duration_minutes ?? 30}m</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-6 shadow-glow relative overflow-hidden">
          <Sparkles className="absolute top-4 right-4 size-6 opacity-80" />
          <div className="text-xs font-bold uppercase tracking-wide opacity-80">AI Coach</div>
          <h3 className="text-xl font-extrabold mt-1">Today's recommendations</h3>
          <div className="mt-3 text-sm whitespace-pre-line opacity-95 min-h-[6rem]">
            {recs || "Analyzing your study patterns..."}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <RecentCard title="Recent summaries" icon={BookOpen} to="/summaries" items={data.summaries.map(s => ({ id: s.id, label: s.title, sub: new Date(s.created_at).toLocaleDateString() }))} />
        <RecentCard title="Recent quizzes" icon={Brain} to="/quizzes" items={data.quizzes.map(q => ({ id: q.id, label: q.title, sub: q.best_score ? `Best ${q.best_score}%` : `${q.attempts} attempts` }))} />
        <RecentCard title="Recent decks" icon={Layers} to="/flashcards" items={data.decks.map(d => ({ id: d.id, label: d.title, sub: `${(d.cards as any[])?.length ?? 0} cards` }))} />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: any; icon: any; label: string }) {
  return (
    <Link to={to} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-4 py-2 text-sm shadow-soft hover:scale-[1.03] transition inline-flex items-center gap-2">
      <Icon className="size-4" /> {label}
    </Link>
  );
}

function RecentCard({ title, icon: Icon, to, items }: { title: string; icon: any; to: any; items: { id: string; label: string; sub: string }[] }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold flex items-center gap-2"><Icon className="size-4" /> {title}</h3>
        <Link to={to} className="text-xs font-bold text-primary">View all</Link>
      </div>
      {items.length === 0 ? <div className="text-sm text-muted-foreground">Nothing yet.</div> : (
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-muted/60">
              <span className="font-semibold truncate text-sm">{i.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{i.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, cta }: { icon: any; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center text-muted-foreground"><Icon className="size-6" /></div>
      <div className="mt-3 font-bold">{title}</div>
      <div className="text-sm text-muted-foreground">{body}</div>
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
