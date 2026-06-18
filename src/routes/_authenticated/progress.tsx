import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Flame, LineChart as LineIcon, Target, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — StudyFlow" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data } = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const [sessions, tasks, quizzes, profile] = await Promise.all([
        supabase.from("study_sessions").select("*").gte("occurred_at", since),
        supabase.from("study_tasks").select("completed"),
        supabase.from("quizzes").select("best_score"),
        supabase.from("profiles").select("*").maybeSingle(),
      ]);
      const sess = sessions.data ?? [];
      // Group last 7 days
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const minutes = sess.filter(s => s.occurred_at.slice(0, 10) === key).reduce((a, b) => a + b.minutes, 0);
        const xp = sess.filter(s => s.occurred_at.slice(0, 10) === key).reduce((a, b) => a + b.xp, 0);
        return { day: d.toLocaleDateString(undefined, { weekday: "short" }), minutes, xp };
      });
      const totalMinutes = sess.reduce((a, b) => a + b.minutes, 0);
      const totalXp = sess.reduce((a, b) => a + b.xp, 0);
      const completed = (tasks.data ?? []).filter(t => t.completed).length;
      const totalTasks = (tasks.data ?? []).length;
      const avgQuiz = (quizzes.data ?? []).filter(q => q.best_score != null).reduce((a, b, _, arr) => a + (b.best_score ?? 0) / arr.length, 0);
      return { days, totalMinutes, totalXp, completed, totalTasks, avgQuiz: Math.round(avgQuiz), profile: profile.data };
    },
  });

  if (!data) return <div className="text-muted-foreground">Loading...</div>;

  const badges = [
    { name: "First Step", earned: data.totalXp > 0, icon: "🌱" },
    { name: "Quiz Master", earned: data.avgQuiz >= 80, icon: "🧠" },
    { name: "Week Warrior", earned: data.days.filter(d => d.minutes > 0).length >= 5, icon: "⚔️" },
    { name: "Centurion", earned: data.totalMinutes >= 100, icon: "💯" },
    { name: "Streak Starter", earned: (data.profile?.streak_days ?? 0) >= 3, icon: "🔥" },
    { name: "Scholar", earned: data.completed >= 10, icon: "🎓" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Your Progress</h1>
        <p className="text-muted-foreground mt-1">Charts, streaks, and achievements.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={LineIcon} color="from-primary to-secondary" label="Minutes (14d)" value={data.totalMinutes} />
        <Stat icon={Trophy} color="from-accent to-secondary" label="Total XP" value={data.totalXp} />
        <Stat icon={Target} color="from-warning to-destructive" label="Avg quiz" value={`${data.avgQuiz}%`} />
        <Stat icon={Flame} color="from-warning to-destructive" label="Streak" value={`${data.profile?.streak_days ?? 0}d`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-extrabold mb-3">Minutes studied · last 7 days</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="minutes" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-extrabold mb-3">XP trend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="xp" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
        <h3 className="font-extrabold mb-4 flex items-center gap-2"><Award className="size-5 text-accent" /> Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {badges.map((b, i) => (
            <motion.div key={b.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 text-center ${b.earned ? "bg-gradient-accent text-accent-foreground border-transparent shadow-soft" : "bg-muted/40 border-border opacity-60"}`}>
              <div className="text-3xl">{b.icon}</div>
              <div className="text-xs font-extrabold mt-1">{b.name}</div>
              <div className="text-[10px] mt-1">{b.earned ? "EARNED" : "Locked"}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: any }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className={`size-10 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-soft ${color}`}>
        <Icon className="size-5" />
      </div>
      <div className="mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
    </div>
  );
}
