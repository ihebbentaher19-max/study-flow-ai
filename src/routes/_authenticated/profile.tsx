import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, User2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — StudyFlow" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const [form, setForm] = useState({ full_name: "", bio: "" });

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      return { user: u.user, profile: p };
    },
  });

  useEffect(() => {
    if (data?.profile) setForm({ full_name: data.profile.full_name ?? "", bio: data.profile.bio ?? "" });
  }, [data]);

  async function save() {
    if (!data?.user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", data.user.id);
    if (error) toast.error(error.message);
    else { toast.success("Saved!"); qc.invalidateQueries({ queryKey: ["profile"] }); qc.invalidateQueries({ queryKey: ["me"] }); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center size-16 rounded-2xl bg-gradient-primary text-primary-foreground text-2xl font-black shadow-glow">
            {(form.full_name || "S").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-extrabold text-lg">{form.full_name || "Student"}</div>
            <div className="text-sm text-muted-foreground">{data?.user?.email}</div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Full name</label>
          <input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={save} className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-6 py-3 shadow-glow">Save changes</button>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 shadow-soft">
        <h3 className="font-extrabold mb-3">Preferences</h3>
        <button onClick={toggle} className="w-full flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 font-semibold">
          <span className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>
          <span className="text-xs text-muted-foreground">Tap to toggle</span>
        </button>
      </div>
    </div>
  );
}
