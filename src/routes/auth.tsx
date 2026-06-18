import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, User2, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — StudyFlow" }, { name: "description", content: "Log in or create your StudyFlow account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || email.split("@")[0] },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to StudyFlow.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero grid lg:grid-cols-2">
      {/* Left visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-accent/30 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2 font-extrabold text-xl">
          <span className="grid place-items-center size-10 rounded-2xl bg-primary-foreground/15 backdrop-blur"><Sparkles className="size-5" /></span>
          StudyFlow
        </Link>
        <div className="relative">
          <h1 className="text-5xl font-black leading-tight">Learn anything,<br />10x faster.</h1>
          <p className="mt-4 text-primary-foreground/85 text-lg max-w-md">AI summaries, quizzes, flashcards and a study plan that adapts to you.</p>
        </div>
        <div className="relative text-sm text-primary-foreground/70">© {new Date().getFullYear()} StudyFlow</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-extrabold text-lg mb-8">
            <span className="grid place-items-center size-9 rounded-xl bg-gradient-primary text-primary-foreground"><Sparkles className="size-5" /></span>
            StudyFlow
          </Link>
          <h2 className="text-3xl font-black">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-2 text-muted-foreground">{mode === "login" ? "Pick up where you left off." : "Free forever. No credit card."}</p>

          <div className="mt-6 inline-flex rounded-full bg-muted p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 text-sm font-bold rounded-full transition ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field icon={<User2 className="size-4" />} placeholder="Your name" value={name} onChange={setName} />
            )}
            <Field icon={<Mail className="size-4" />} type="email" placeholder="you@email.com" value={email} onChange={setEmail} required />
            <Field
              icon={<Lock className="size-4" />}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />
            {mode === "signup" && <PasswordStrength password={password} />}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-primary text-primary-foreground font-bold py-3 shadow-glow hover:scale-[1.01] transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => toast("Coming soon")} className="rounded-full border border-border bg-card font-semibold py-2.5 hover:bg-muted">Google</button>
            <button type="button" onClick={() => toast("Coming soon")} className="rounded-full border border-border bg-card font-semibold py-2.5 hover:bg-muted">Apple</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => {
    return {
      length: password.length >= 8,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const passed = Object.values(checks).filter(Boolean).length;
  const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Great"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];
  const label = strengthLabels[Math.max(0, passed - 1)] || "Too weak";
  const color = strengthColors[Math.max(0, passed - 1)] || "bg-red-500";

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passed ? color : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <div className="flex gap-2 text-muted-foreground/70">
          <span className={checks.length ? "text-emerald-500" : ""}>8+ chars</span>
          <span className={checks.number ? "text-emerald-500" : ""}>Number</span>
          <span className={checks.special ? "text-emerald-500" : ""}>Symbol</span>
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
};
function Field({ icon, value, onChange, ...rest }: FieldProps) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition">
      <span className="text-muted-foreground">{icon}</span>
      <input
        className="flex-1 bg-transparent outline-none text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </label>
  );
}
