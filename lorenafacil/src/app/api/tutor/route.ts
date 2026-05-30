import { NextRequest, NextResponse } from "next/server";
import { fallbackAgentReply, getAgentPrompt } from "@/lib/agents";
import type { SubjectId } from "@/lib/lorena-data";

const GEMINI_MODEL = "gemini-2.5-flash";

function isSubjectId(value: unknown): value is SubjectId {
  return value === "history" || value === "english";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    subjectId?: unknown;
    message?: unknown;
  };
  const subjectId = isSubjectId(body.subjectId) ? body.subjectId : "history";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ answer: "Me mande uma pergunta para eu te ajudar." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: fallbackAgentReply(subjectId, message),
      provider: "fallback",
    });
  }

  try {
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
              parts: [
                {
                  text: `A aluna se chama Lorena e esta no 5 ano. Pergunta: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 700,
          },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({
        answer: fallbackAgentReply(subjectId, message),
        provider: "fallback",
      });
    }

    const data = await response.json();
    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text)
        .filter(Boolean)
        .join("\n")
        .trim() || fallbackAgentReply(subjectId, message);

    return NextResponse.json({ answer, provider: "gemini", model: GEMINI_MODEL });
  } catch {
    return NextResponse.json({
      answer: fallbackAgentReply(subjectId, message),
      provider: "fallback",
    });
  }
}
