import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return createLovableAiGatewayProvider(key);
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
    const gateway = getGateway();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({
        schema: z.object({
          summary: z.string(),
          key_points: z.array(z.string()).min(3).max(8),
        }),
      }),
      prompt: `You are StudyFlow's AI tutor. Summarize the following study notes into a concise, student-friendly summary (3-5 short paragraphs) and 5-7 crisp key takeaways. Use plain language a student can quickly review.\n\nTITLE: ${data.title}\n\nNOTES:\n${data.text}`,
    });

    const { data: row, error } = await context.supabase
      .from("summaries")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_text: data.text,
        summary: experimental_output.summary,
        key_points: experimental_output.key_points,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId,
      activity: "summary",
      minutes: 5,
      xp: 15,
    });
    return row;
  });

// ---------- Summarize from uploaded file (image/PDF) ----------
const UploadSummarizeInput = z.object({
  title: z.string().min(1).max(200),
  storage_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(100),
});

export const summarizeFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadSummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    // Download the file with the user's RLS-scoped client
    const dl = await context.supabase.storage.from("study-uploads").download(data.storage_path);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? "Could not read uploaded file");
    const buf = Buffer.from(await dl.data.arrayBuffer());
    const base64 = buf.toString("base64");

    const isImage = data.mime_type.startsWith("image/");
    const isPdf = data.mime_type === "application/pdf";
    const isText = data.mime_type.startsWith("text/");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are StudyFlow's AI tutor. Read the provided study material and return ONLY a JSON object matching this exact shape: {"summary": string (3-5 short paragraphs, student-friendly), "key_points": string[] (5-7 crisp takeaways)}. No prose outside JSON.`;

    let userContent: any[];
    if (isImage) {
      userContent = [
        { type: "text", text: `Title: ${data.title}\nExtract the study content from this image and summarize it as instructed.` },
        { type: "image_url", image_url: { url: `data:${data.mime_type};base64,${base64}` } },
      ];
    } else if (isPdf) {
      userContent = [
        { type: "text", text: `Title: ${data.title}\nRead this PDF and summarize as instructed.` },
        { type: "file", file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${base64}` } },
      ];
    } else if (isText) {
      const textBody = buf.toString("utf-8").slice(0, 20000);
      userContent = [{ type: "text", text: `Title: ${data.title}\n\nNOTES:\n${textBody}` }];
    } else {
      throw new Error("Unsupported file type");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
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
  notes: z.string().min(20).max(20000),
  count: z.number().int().min(3).max(15).default(6),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({
        schema: z.object({
          questions: z
            .array(
              z.object({
                question: z.string(),
                choices: z.array(z.string()).length(4),
                correct_index: z.number().int().min(0).max(3),
                explanation: z.string(),
              }),
            )
            .min(3)
            .max(15),
        }),
      }),
      prompt: `Generate ${data.count} multiple-choice quiz questions about "${data.topic}" based on these notes. Each question has 4 plausible choices, one correct, and a short explanation. Difficulty: mixed.\n\nNOTES:\n${data.notes}`,
    });

    const { data: row, error } = await context.supabase
      .from("quizzes")
      .insert({
        user_id: context.userId,
        title: data.topic,
        topic: data.topic,
        questions: experimental_output.questions,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId,
      activity: "quiz_generated",
      minutes: 3,
      xp: 10,
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
  notes: z.string().min(20).max(20000),
  count: z.number().int().min(4).max(20).default(8),
});

export const generateDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeckInput.parse(d))
  .handler(async ({ data, context }) => {
    const gateway = getGateway();
    const { experimental_output } = await generateText({
      model: gateway(MODEL),
      experimental_output: Output.object({
        schema: z.object({
          cards: z
            .array(z.object({ front: z.string(), back: z.string() }))
            .min(4)
            .max(20),
        }),
      }),
      prompt: `Create ${data.count} concise flashcards for the topic "${data.topic}" from these notes. Front = a question or term, back = a clear short answer or definition.\n\nNOTES:\n${data.notes}`,
    });

    const { data: row, error } = await context.supabase
      .from("flashcard_decks")
      .insert({
        user_id: context.userId,
        title: data.topic,
        topic: data.topic,
        cards: experimental_output.cards,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("study_sessions").insert({
      user_id: context.userId,
      activity: "deck_generated",
      minutes: 3,
      xp: 10,
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
