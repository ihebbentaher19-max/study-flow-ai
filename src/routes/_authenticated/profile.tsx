import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — StudyFlow" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const [form, setForm] = useState({ full_name: "", bio: "" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
      return { user: u.user, profile: p };
    },
  });

  useEffect(() => {
    if (!data?.profile) return;
    setForm({ full_name: data.profile.full_name ?? "", bio: data.profile.bio ?? "" });
    if (data.profile.avatar_url) {
      supabase.storage.from("avatars").createSignedUrl(data.profile.avatar_url, 3600).then(({ data: s }) => {
        if (s?.signedUrl) setAvatarUrl(s.signedUrl);
      });
    } else setAvatarUrl(null);
  }, [data]);

  async function onAvatar(file: File | null) {
    if (!file || !data?.user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${data.user.id}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (up.error) throw up.error;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", data.user.id);
      if (error) throw error;
      toast.success("Photo updated!");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
    finally { setUploading(false); }
  }

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
          <button
            onClick={() => fileInput.current?.click()}
            className="relative group size-16 rounded-2xl overflow-hidden shadow-glow"
            title="Change photo"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="size-full object-cover" />
            ) : (
              <div className="grid place-items-center size-full bg-gradient-primary text-primary-foreground text-2xl font-black">
                {(form.full_name || "S").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
              <Camera className="size-5 text-white" />
            </div>
          </button>
          <input
            ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
          />
          <div>
            <div className="font-extrabold text-lg">{form.full_name || "Student"}</div>
            <div className="text-sm text-muted-foreground">{data?.user?.email}</div>
            <button onClick={() => fileInput.current?.click()} disabled={uploading} className="mt-1 text-xs font-semibold text-primary hover:underline disabled:opacity-60">
              {uploading ? "Uploading..." : "Change photo"}
            </button>
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

