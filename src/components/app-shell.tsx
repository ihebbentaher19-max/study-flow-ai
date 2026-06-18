import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  BookOpen,
  Brain,
  Calendar,
  Flame,
  Home,
  LineChart,
  Layers,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/summaries", label: "Summaries", icon: BookOpen },
  { to: "/quizzes", label: "Quizzes", icon: Brain },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/planner", label: "Planner", icon: Calendar },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/profile", label: "Profile", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [path]);

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { user: u.user, profile: p, roles: (roles ?? []).map((r) => r.role) };
    },
  });

  const isAdmin = profile?.roles?.includes("admin");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-hero">
      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-40 glass flex items-center justify-between px-4 h-14">
        <Link to="/dashboard" className="flex items-center gap-2 font-extrabold">
          <span className="grid place-items-center size-8 rounded-xl bg-gradient-primary text-primary-foreground"><Sparkles className="size-4" /></span>
          StudyFlow
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg hover:bg-muted">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside
          className={cn(
            "lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col glass border-r border-border/50 p-4",
            open ? "block" : "hidden lg:flex",
          )}
        >
          <Link to="/dashboard" className="hidden lg:flex items-center gap-2 font-extrabold text-lg px-2 py-2">
            <span className="grid place-items-center size-9 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Sparkles className="size-5" /></span>
            StudyFlow
          </Link>

          <nav className="mt-4 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "hover:bg-muted text-foreground/80",
                  )}
                >
                  <Icon className="size-4" /> {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                  path.startsWith("/admin")
                    ? "bg-gradient-accent text-accent-foreground shadow-soft"
                    : "hover:bg-muted text-foreground/80",
                )}
              >
                <ShieldCheck className="size-4" /> Admin
              </Link>
            )}
          </nav>

          <div className="mt-auto pt-4 border-t border-border/50 space-y-2">
            {profile?.profile && (
              <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-card/50">
                <div className="grid place-items-center size-9 rounded-full bg-gradient-accent font-extrabold text-accent-foreground">
                  {(profile.profile.full_name ?? "S").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{profile.profile.full_name ?? "Student"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flame className="size-3 text-orange-500" /> {profile.profile.streak_days ?? 0} day streak
                  </div>
                </div>
              </div>
            )}
            <button onClick={toggle} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button onClick={signOut} className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold hover:bg-muted text-destructive">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-h-screen p-4 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
