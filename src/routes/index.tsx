import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Layers,
  LineChart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyFlow — Learn smarter with AI" },
      { name: "description", content: "AI summaries, quizzes, flashcards and personalized study plans. The study companion that actually helps you learn." },
      { property: "og:title", content: "StudyFlow — Learn smarter with AI" },
      { property: "og:description", content: "AI summaries, quizzes, flashcards and personalized study plans." },
    ],
  }),
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="glass rounded-full px-4 py-2 flex items-center justify-between shadow-soft">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="grid place-items-center size-9 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Sparkles className="size-5" /></span>
            StudyFlow
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-foreground/70">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm font-semibold px-3 py-2 hidden sm:inline">Log in</Link>
            <Link to="/auth" className="text-sm font-bold px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground shadow-soft hover:scale-[1.03] transition-transform">
              Start free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-20 lg:pt-20 lg:pb-32 text-center">
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-bold text-primary mb-6">
          <Zap className="size-3.5" /> Powered by AI · No credit card
        </motion.div>
        <motion.h1
          initial="hidden" animate="show" variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.05]"
        >
          Learn anything,<br />
          <span className="gradient-text">10x faster</span> with AI.
        </motion.h1>
        <motion.p
          initial="hidden" animate="show" variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { duration: 0.6, delay: 0.1 } } }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Drop in your notes. Get instant summaries, quizzes, flashcards and a study plan that actually fits your brain.
        </motion.p>
        <motion.div
          initial="hidden" animate="show" variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { duration: 0.6, delay: 0.2 } } }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/auth" className="rounded-full bg-gradient-primary text-primary-foreground font-bold px-7 py-3.5 shadow-glow hover:scale-[1.03] transition-transform inline-flex items-center gap-2">
            Start learning free <ChevronRight className="size-4" />
          </Link>
          <a href="#features" className="rounded-full glass font-bold px-7 py-3.5 hover:bg-card transition">
            See how it works
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 mx-auto max-w-5xl"
        >
          <div className="glass rounded-3xl p-3 shadow-lift">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-warning/80" />
                <span className="size-2.5 rounded-full bg-success/80" />
                <span className="ml-3 text-xs text-muted-foreground">studyflow.app/dashboard</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                {[
                  { icon: Brain, title: "Today's quiz", color: "from-primary to-secondary", value: "92%", sub: "Photosynthesis" },
                  { icon: Layers, title: "Flashcards reviewed", color: "from-accent to-secondary", value: "48", sub: "+12 from yesterday" },
                  { icon: LineChart, title: "Weekly streak", color: "from-warning to-destructive", value: "7 days", sub: "🔥 keep it going!" },
                ].map((c, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-background p-5 text-left">
                    <div className={cn("size-10 rounded-xl bg-gradient-to-br grid place-items-center text-white shadow-soft mb-3", c.color)}>
                      <c.icon className="size-5" />
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.title}</div>
                    <div className="text-3xl font-black mt-1">{c.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: BookOpen, title: "AI Summaries", body: "Paste any notes or article. Get a clear, student-friendly summary in seconds.", color: "from-primary to-secondary" },
  { icon: Brain, title: "Smart Quizzes", body: "Auto-generated multiple-choice questions with explanations, scoring and retries.", color: "from-secondary to-accent" },
  { icon: Layers, title: "Flashcards", body: "Beautiful flip-card decks generated from your material. Built-in study mode.", color: "from-accent to-primary" },
  { icon: Calendar, title: "Study Planner", body: "Build a weekly plan with deadlines, reminders and AI-suggested sessions.", color: "from-primary to-warning" },
  { icon: LineChart, title: "Progress Tracking", body: "Streaks, study hours, completion charts and a weekly insights report.", color: "from-accent to-secondary" },
  { icon: Sparkles, title: "AI Coach", body: "Personalized recommendations based on what you're learning and where you struggle.", color: "from-warning to-destructive" },
] as const;

function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">FEATURES</div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-black tracking-tight">Everything you need to <span className="gradient-text">actually learn</span></h2>
          <p className="mt-4 text-muted-foreground text-lg">One app. Six superpowers. Zero busywork.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group rounded-3xl bg-card border border-border p-6 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all"
            >
              <div className={cn("size-12 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-soft mb-4 group-hover:scale-110 transition-transform", f.color)}>
                <f.icon className="size-6" />
              </div>
              <h3 className="text-xl font-extrabold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Drop your notes", body: "Paste lecture notes, an article, or a chapter." },
    { n: "02", title: "AI does the heavy lifting", body: "Summaries, quizzes and flashcards in seconds." },
    { n: "03", title: "Study with a plan", body: "We schedule, you show up. Streaks and stats keep you honest." },
  ];
  return (
    <section id="how" className="py-20 lg:py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">From notes to mastery in <span className="gradient-text">3 steps</span></h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl bg-card border border-border p-7 shadow-soft"
            >
              <div className="text-5xl font-black gradient-text">{s.n}</div>
              <h3 className="mt-3 text-xl font-extrabold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "Maya, premed", quote: "I went from cramming till 2am to finishing in half the time. Quizzes catch what I missed before exams.", color: "from-primary to-secondary" },
  { name: "Diego, CS student", quote: "The flashcards alone are worth it. Building them used to take an hour — now it's seconds.", color: "from-accent to-secondary" },
  { name: "Sara, law school", quote: "The planner keeps me sane. Streaks make studying feel like a game I'm actually winning.", color: "from-warning to-destructive" },
];

function Testimonials() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Loved by <span className="gradient-text">100,000+ students</span></h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-3xl bg-card border border-border p-7 shadow-soft"
            >
              <div className="flex gap-0.5 text-warning">{[...Array(5)].map((_, j) => <Star key={j} className="size-4 fill-current" />)}</div>
              <p className="mt-4 text-lg">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className={cn("size-10 rounded-full bg-gradient-to-br", t.color)} />
                <div className="font-bold">{t.name}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TIERS = [
  { name: "Free", price: "$0", period: "forever", features: ["10 AI summaries / mo", "5 quizzes / mo", "Unlimited flashcards", "Basic planner"], cta: "Start free", highlight: false },
  { name: "Pro", price: "$9", period: "/month", features: ["Unlimited everything", "AI study coach", "Advanced analytics", "Priority AI speed", "Custom study plans"], cta: "Go Pro", highlight: true },
  { name: "Team", price: "$29", period: "/month", features: ["Everything in Pro", "Up to 10 seats", "Shared decks & summaries", "Admin dashboard"], cta: "Contact us", highlight: false },
];

function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Simple, student-friendly <span className="gradient-text">pricing</span></h2>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <div key={t.name} className={cn(
              "rounded-3xl border p-7 shadow-soft relative",
              t.highlight ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow scale-[1.02]" : "bg-card border-border",
            )}>
              {t.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-warning text-warning-foreground text-xs font-extrabold px-3 py-1">MOST POPULAR</div>}
              <div className="font-extrabold text-lg">{t.name}</div>
              <div className="mt-3 flex items-end gap-1">
                <div className="text-5xl font-black">{t.price}</div>
                <div className={cn("pb-2 text-sm", t.highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>{t.period}</div>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className={cn("size-4", t.highlight ? "text-primary-foreground" : "text-success")} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className={cn(
                "mt-6 block text-center font-bold py-3 rounded-full transition-transform hover:scale-[1.02]",
                t.highlight ? "bg-primary-foreground text-primary" : "bg-foreground text-background",
              )}>{t.cta}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Do I need to upload files?", a: "Nope. Just paste your notes or text and StudyFlow does the rest." },
  { q: "Is the free plan really free?", a: "Yes, forever. No credit card. Pro is optional if you want unlimited AI." },
  { q: "Will my notes be private?", a: "Your content is stored securely and never used to train external models." },
  { q: "What subjects does it work for?", a: "Any text-based subject — biology, history, law, programming, languages, you name it." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-center">Frequently asked <span className="gradient-text">questions</span></h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 font-bold text-left">
                {f.q}
                <ChevronRight className={cn("size-5 transition-transform", open === i && "rotate-90")} />
              </button>
              {open === i && <div className="px-5 pb-5 text-muted-foreground">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-[2.5rem] bg-gradient-primary text-primary-foreground p-10 lg:p-16 text-center shadow-lift relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-accent/30 blur-3xl" />
          <h2 className="relative text-4xl lg:text-5xl font-black">Ready to learn smarter?</h2>
          <p className="relative mt-4 text-lg text-primary-foreground/85">Join thousands of students using StudyFlow to study less and learn more.</p>
          <Link to="/auth" className="relative mt-7 inline-flex items-center gap-2 bg-primary-foreground text-primary font-extrabold px-8 py-4 rounded-full shadow-glow hover:scale-105 transition-transform">
            Get started free <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-extrabold">
          <span className="grid place-items-center size-8 rounded-xl bg-gradient-primary text-primary-foreground"><Sparkles className="size-4" /></span>
          StudyFlow
        </div>
        <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} StudyFlow. Learn smarter.</div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="bg-hero">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
