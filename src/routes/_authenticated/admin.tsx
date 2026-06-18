import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, BookOpen, Brain, Layers, ShieldCheck, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — StudyFlow" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some(r => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, summaries, quizzes, decks, sessions] = await Promise.all([
        supabase.from("profiles").select("id,full_name,created_at,streak_days").order("created_at", { ascending: false }).limit(50),
        supabase.from("summaries").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("flashcard_decks").select("id", { count: "exact", head: true }),
        supabase.from("study_sessions").select("activity,minutes,occurred_at").order("occurred_at", { ascending: false }).limit(30),
      ]);
      return {
        users: profiles.data ?? [],
        summaries: summaries.count ?? 0,
        quizzes: quizzes.count ?? 0,
        decks: decks.count ?? 0,
        sessions: sessions.data ?? [],
      };
    },
  });

  if (!data) return <div className="text-muted-foreground">Loading admin...</div>;

  const stats = [
    { label: "Users", value: data.users.length, icon: Users, color: "from-primary to-secondary" },
    { label: "Summaries", value: data.summaries, icon: BookOpen, color: "from-accent to-secondary" },
    { label: "Quizzes", value: data.quizzes, icon: Brain, color: "from-warning to-destructive" },
    { label: "Decks", value: data.decks, icon: Layers, color: "from-primary to-accent" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-gradient-accent grid place-items-center text-accent-foreground shadow-glow"><ShieldCheck className="size-5" /></div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black">Admin Console</h1>
          <p className="text-muted-foreground">System overview & user management.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className={`size-10 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-soft ${s.color}`}><s.icon className="size-5" /></div>
            <div className="mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</div>
            <div className="text-3xl font-black mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-extrabold mb-3">Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="text-left py-2">Name</th><th className="text-left">Joined</th><th className="text-left">Streak</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.users.map(u => (
                  <tr key={u.id}>
                    <td className="py-2 font-semibold">{u.full_name ?? "Student"}</td>
                    <td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.streak_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
          <h3 className="font-extrabold mb-3 flex items-center gap-2"><Activity className="size-4" /> Activity log</h3>
          <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
            {data.sessions.map((s, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-border pb-2">
                <span className="font-semibold capitalize">{s.activity.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.occurred_at).toLocaleTimeString()} · {s.minutes}m</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
