import { NextRequest, NextResponse } from "next/server";
import { fallbackAgentReply, getAgentPrompt } from "@/lib/agents";
import type { SubjectId } from "@/lib/lorena-data";

const GEMINI_MODEL = "gemini-2.5-flash";
type TutorMode = "text" | "photo" | "voice";
type InlineMedia = { mimeType: string; data: string };

function isSubjectId(value: unknown): value is SubjectId {
  return value === "history" || value === "english";
}

function isMode(value: unknown): value is TutorMode {
  return value === "text" || value === "photo" || value === "voice";
}

function sanitizeInlineMedia(value: unknown): InlineMedia | null {
  if (!value || typeof value !== "object") return null;
  const media = value as { mimeType?: unknown; data?: unknown };
  if (typeof media.mimeType !== "string" || typeof media.data !== "string") return null;
  if (!media.mimeType.includes("/") || media.data.length < 12) return null;

  return {
    mimeType: media.mimeType.slice(0, 80),
    data: media.data,
  };
}

function buildPrompt({
  hasAudio,
  hasImage,
  message,
  mode,
  subjectId,
}: {
  hasAudio: boolean;
  hasImage: boolean;
  message: string;
  mode: TutorMode;
  subjectId: SubjectId;
}) {
  const subjectName = subjectId === "history" ? "Historia" : "Ingles";
  const base =
    `A aluna se chama Lorena, tem 9 anos e esta no 5 ano. Materia: ${subjectName}. ` +
    "Responda em portugues do Brasil, com frases curtas, tom acolhedor e linguagem de crianca. " +
    "Use no maximo 5 passos. Nao de a resposta final inteira de tarefa escolar; guie a Lorena a pensar.";

  if (mode === "photo" || hasImage) {
    return `${base}\n\nA Lorena enviou uma foto da atividade. Leia o enunciado, identifique o que ela precisa estudar e crie um plano simples com: "Eu entendi", "Vamos estudar", "Sua vez". Pergunta ou contexto digitado: ${message || "sem texto extra"}`;
  }

  if (mode === "voice" || hasAudio) {
    return `${base}\n\nA Lorena gravou uma pergunta de voz. Entenda o audio ou o texto transcrito e responda como tutor de voz: curto, claro e facil de ouvir. Pergunta transcrita/contexto: ${message || "sem transcricao"}`;
  }

  return `${base}\n\nPergunta da Lorena: ${message}`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    audio?: unknown;
    image?: unknown;
    subjectId?: unknown;
    message?: unknown;
    mode?: unknown;
  };
  const subjectId = isSubjectId(body.subjectId) ? body.subjectId : "history";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const mode = isMode(body.mode) ? body.mode : "text";
  const image = sanitizeInlineMedia(body.image);
  const audio = sanitizeInlineMedia(body.audio);

  if (!message && !image && !audio) {
    return NextResponse.json({ answer: "Me mande uma pergunta, uma foto ou uma gravação para eu te ajudar." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: fallbackAgentReply(subjectId, message, mode),
      provider: "fallback",
    });
  }

  try {
    const parts: Array<{ text: string } | { inlineData: InlineMedia }> = [
      {
        text: buildPrompt({
          hasAudio: Boolean(audio),
          hasImage: Boolean(image),
          message,
          mode,
          subjectId,
        }),
      },
    ];

    if (image) {
      parts.push({ inlineData: image });
    }

    if (audio) {
      parts.push({ inlineData: audio });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: getAgentPrompt(subjectId) }],
          },
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 1400,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({
        answer: fallbackAgentReply(subjectId, message, mode),
        provider: "fallback",
      });
    }

    const data = await response.json();
    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim() || fallbackAgentReply(subjectId, message, mode);

    return NextResponse.json({ answer, provider: "gemini", model: GEMINI_MODEL });
  } catch {
    return NextResponse.json({
      answer: fallbackAgentReply(subjectId, message, mode),
      provider: "fallback",
    });
  }
}
