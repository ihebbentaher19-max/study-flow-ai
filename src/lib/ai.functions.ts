import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// Provider resolution:
// 1. If LOVABLE_API_KEY is set (auto-provisioned on Lovable hosting), use Lovable AI Gateway.
// 2. Else if GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) is set (typical local dev),
//    fall back to Google's OpenAI-compatible endpoint directly.
// This lets the same code work on Lovable preview/prod AND on the user's localhost.
const LOVABLE_MODEL = "google/gemini-3-flash-preview";
const GOOGLE_MODEL = "gemini-2.5-flash";

type ProviderInfo = {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
};

function getProvider(): ProviderInfo {
  const lovable = process.env.LOVABLE_API_KEY;
  if (lovable) {
    return {
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovable, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      model: LOVABLE_MODEL,
    };
  }
  const google = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (google) {
    return {
      endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${google}` },
      model: GOOGLE_MODEL,
    };
  }
  throw new Error(
    "No AI key configured. On Lovable this is automatic. Locally, add GEMINI_API_KEY=<your key> to .env.local (get one free at https://aistudio.google.com/apikey) and restart the dev server."
  );
}

function getGateway() {
  const lovable = process.env.LOVABLE_API_KEY;
  if (lovable) {
    return { provider: createLovableAiGatewayProvider(lovable), model: LOVABLE_MODEL };
  }
  const google = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (google) {
    const provider = createOpenAICompatible({
      name: "google",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      headers: { Authorization: `Bearer ${google}` },
    });
    return { provider, model: GOOGLE_MODEL };
  }
  throw new Error("No AI key configured. Set LOVABLE_API_KEY or GEMINI_API_KEY.");
}

// ---------- Robust JSON extraction ----------
function extractJson(raw: string): any {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  let start = -1;
  let endChar = "}";
  if (startObj === -1 && startArr === -1) throw new Error("No JSON in response");
  if (startObj === -1 || (startArr !== -1 && startArr < startObj)) { start = startArr; endChar = "]"; }
  else { start = startObj; endChar = "}"; }
  const end = s.lastIndexOf(endChar);
  if (end === -1 || end < start) throw new Error("Malformed JSON in response");
  s = s.substring(start, end + 1);
  try { return JSON.parse(s); } catch {
    const cleaned = s
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

// ---------- Multimodal user-content builder ----------
async function buildUserContent(opts: {
  title: string;
  instructionPrefix: string;
  text?: string;
  storage_path?: string;
  mime_type?: string;
  supabase: any;
}) {
  if (opts.storage_path && opts.mime_type) {
    const dl = await opts.supabase.storage.from("study-uploads").download(opts.storage_path);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? "Could not read uploaded file");
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const base64 = buf.toString("base64");
    const mt = opts.mime_type;
    if (mt.startsWith("image/")) {
      return [
        { type: "text", text: `Title: ${opts.title}\n${opts.instructionPrefix} Extract content from this image.` },
        { type: "image_url", image_url: { url: `data:${mt};base64,${base64}` } },
      ];
    }
    if (mt === "application/pdf") {
      return [
        { type: "text", text: `Title: ${opts.title}\n${opts.instructionPrefix} Read this PDF.` },
        { type: "file", file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${base64}` } },
      ];
    }
    if (mt.startsWith("text/")) {
      const body = buf.toString("utf-8").slice(0, 20000);
      return [{ type: "text", text: `Title: ${opts.title}\n${opts.instructionPrefix}\n\nNOTES:\n${body}` }];
    }
    throw new Error("Unsupported file type");
  }
  if (!opts.text || opts.text.length < 20) throw new Error("Provide notes or attach a file");
  return [{ type: "text", text: `Title: ${opts.title}\n${opts.instructionPrefix}\n\nNOTES:\n${opts.text.slice(0, 20000)}` }];
}

async function callJsonAI(systemPrompt: string, userContent: any[]) {
  const p = getProvider();
  const res = await fetch(p.endpoint, {
    method: "POST",
    headers: p.headers,
    body: JSON.stringify({
      model: p.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace billing.");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  return extractJson(raw);
}

// ---------- Summarize ----------
const SummarizeInput = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(20).max(20000),
});

export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const systemPrompt = `You are StudyFlow's AI tutor. Return ONLY a JSON object: {"summary": string (3-5 short paragraphs), "key_points": string[] (5-7 takeaways)}. No prose outside JSON.`;
    const userContent = [{ type: "text", text: `Title: ${data.title}\n\nNOTES:\n${data.text}` }];
    const parsed = await callJsonAI(systemPrompt, userContent);
    const out = z.object({
      summary: z.string(),
      key_points: z.array(z.string()).min(1).max(12),
    }).parse(parsed);

    const { data: row, error } = await context.supabase
      .from("summaries")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_text: data.text,
        summary: out.summary,
        key_points: out.key_points,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId, activity: "summary", minutes: 5, xp: 15,
    });
    return row;
  });

// ---------- Summarize from uploaded file ----------
const UploadSummarizeInput = z.object({
  title: z.string().min(1).max(200),
  storage_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(100),
});

export const summarizeFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadSummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const systemPrompt = `You are StudyFlow's AI tutor. Read the provided study material and return ONLY a JSON object: {"summary": string (3-5 short paragraphs), "key_points": string[] (5-7 takeaways)}. No prose outside JSON.`;
    const userContent = await buildUserContent({
      title: data.title,
      instructionPrefix: "Summarize this study material.",
      storage_path: data.storage_path,
      mime_type: data.mime_type,
      supabase: context.supabase,
    });
    const parsed = await callJsonAI(systemPrompt, userContent);
    const out = z.object({
      summary: z.string(),
      key_points: z.array(z.string()).min(1).max(12),
    }).parse(parsed);

    const { data: row, error } = await context.supabase
      .from("summaries")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_text: `[uploaded:${data.mime_type}] ${data.storage_path}`,
        summary: out.summary,
        key_points: out.key_points,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId, activity: "summary_upload", minutes: 5, xp: 20,
    });
    return row;
  });

// ---------- Quiz ----------
const QuizInput = z.object({
  topic: z.string().min(1).max(200),
  notes: z.string().max(20000).optional(),
  storage_path: z.string().max(500).optional(),
  mime_type: z.string().max(100).optional(),
  count: z.number().int().min(3).max(15).default(6),
});

const QuizSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    choices: z.array(z.string()).min(2).max(6),
    correct_index: z.number().int().min(0),
    explanation: z.string().optional().default(""),
  })).min(1).max(20),
});

function normalizeQuiz(parsed: any) {
  // Allow {questions:[...]} or a bare array
  const arr = Array.isArray(parsed) ? parsed : (parsed.questions ?? parsed.quiz ?? parsed.items ?? []);
  const cleaned = arr.map((q: any) => {
    const choices = q.choices ?? q.options ?? q.answers ?? [];
    let correct = q.correct_index ?? q.correctIndex ?? q.answer_index ?? q.correct;
    if (typeof correct === "string") {
      // try letter "A"/"B"/...
      const letter = correct.trim().toUpperCase();
      if (/^[A-Z]$/.test(letter)) correct = letter.charCodeAt(0) - 65;
      else correct = choices.findIndex((c: string) => String(c).trim() === correct);
    }
    if (typeof correct !== "number" || correct < 0 || correct >= choices.length) correct = 0;
    // pad to 4 if fewer than 4
    while (choices.length < 4) choices.push("None of the above");
    return {
      question: String(q.question ?? q.q ?? "").trim(),
      choices: choices.slice(0, 4).map((c: any) => String(c)),
      correct_index: Math.min(correct, 3),
      explanation: String(q.explanation ?? q.rationale ?? ""),
    };
  }).filter((q: any) => q.question);
  return QuizSchema.parse({ questions: cleaned });
}

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data, context }) => {
    const systemPrompt = `You are StudyFlow's quiz generator. Return ONLY JSON: {"questions":[{"question":string,"choices":[string,string,string,string],"correct_index":0-3,"explanation":string}]}. Exactly 4 choices, mixed difficulty. No prose outside JSON.`;
    const instr = `Generate ${data.count} multiple-choice quiz questions about "${data.topic}".`;
    const userContent = await buildUserContent({
      title: data.topic,
      instructionPrefix: instr,
      text: data.notes,
      storage_path: data.storage_path,
      mime_type: data.mime_type,
      supabase: context.supabase,
    });
    const parsed = await callJsonAI(systemPrompt, userContent);
    const out = normalizeQuiz(parsed);

    const { data: row, error } = await context.supabase
      .from("quizzes")
      .insert({
        user_id: context.userId,
        title: data.topic,
        topic: data.topic,
        questions: out.questions,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId, activity: "quiz_generated", minutes: 3, xp: 10,
    });
    return row;
  });

const QuizAttempt = z.object({
  quiz_id: z.string().uuid(),
  score: z.number().int().min(0).max(100),
});
export const recordQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizAttempt.parse(d))
  .handler(async ({ data, context }) => {
    const { data: q } = await context.supabase
      .from("quizzes")
      .select("attempts,best_score")
      .eq("id", data.quiz_id)
      .single();
    const best = Math.max(q?.best_score ?? 0, data.score);
    await context.supabase
      .from("quizzes")
      .update({ attempts: (q?.attempts ?? 0) + 1, best_score: best })
      .eq("id", data.quiz_id);
    await context.supabase.from("study_sessions").insert({
      user_id: context.userId,
      activity: "quiz_attempt",
      minutes: 8,
      xp: Math.round(data.score / 2),
    });
    return { best };
  });

// ---------- Flashcards ----------
const DeckInput = z.object({
  topic: z.string().min(1).max(200),
  notes: z.string().max(20000).optional(),
  storage_path: z.string().max(500).optional(),
  mime_type: z.string().max(100).optional(),
  count: z.number().int().min(4).max(20).default(8),
});

const DeckSchema = z.object({
  cards: z.array(z.object({
    front: z.string(),
    back: z.string(),
  })).min(1).max(40),
});

function normalizeDeck(parsed: any) {
  const arr = Array.isArray(parsed) ? parsed : (parsed.cards ?? parsed.flashcards ?? parsed.items ?? []);
  const cleaned = arr.map((c: any) => ({
    front: String(c.front ?? c.question ?? c.term ?? c.q ?? "").trim(),
    back: String(c.back ?? c.answer ?? c.definition ?? c.a ?? "").trim(),
  })).filter((c: any) => c.front && c.back);
  return DeckSchema.parse({ cards: cleaned });
}

export const generateDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeckInput.parse(d))
  .handler(async ({ data, context }) => {
    const systemPrompt = `You are StudyFlow's flashcard generator. Return ONLY JSON: {"cards":[{"front":string,"back":string}]}. Front = question/term, back = clear short answer. No prose outside JSON.`;
    const instr = `Create ${data.count} concise flashcards for "${data.topic}".`;
    const userContent = await buildUserContent({
      title: data.topic,
      instructionPrefix: instr,
      text: data.notes,
      storage_path: data.storage_path,
      mime_type: data.mime_type,
      supabase: context.supabase,
    });
    const parsed = await callJsonAI(systemPrompt, userContent);
    const out = normalizeDeck(parsed);

    const { data: row, error } = await context.supabase
      .from("flashcard_decks")
      .insert({
        user_id: context.userId,
        title: data.topic,
        topic: data.topic,
        cards: out.cards,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId, activity: "deck_generated", minutes: 3, xp: 10,
    });
    return row;
  });

// ---------- AI Recommendations ----------
export const getRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: tasks }, { data: sessions }, { data: quizzes }] = await Promise.all([
      context.supabase.from("study_tasks").select("title,subject,completed").limit(20),
      context.supabase.from("study_sessions").select("activity,minutes,occurred_at").limit(20).order("occurred_at", { ascending: false }),
      context.supabase.from("quizzes").select("topic,best_score").limit(10),
    ]);

    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `You are a study coach. Based on this learner's recent activity, give 3 short, encouraging, specific recommendations (1 sentence each). Return as a plain numbered list.\n\nTASKS: ${JSON.stringify(tasks)}\nSESSIONS: ${JSON.stringify(sessions)}\nQUIZZES: ${JSON.stringify(quizzes)}`,
    });
    return { text };
  });
