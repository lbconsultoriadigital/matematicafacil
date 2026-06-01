import { actionGeneric, anyApi } from "convex/server";
import { v } from "convex/values";

const subjectPrompts: Record<string, string> = {
  history:
    "Voce e uma tutora de Historia para uma aluna brasileira do 5 ano. Explique com narrativa simples, linha do tempo quando ajudar, causa e consequencia, e uma pergunta curta no final.",
  english:
    "You are a friendly English tutor for a Brazilian 5th grade student. Answer in Brazilian Portuguese with simple English examples, pronunciation hints, and one tiny practice challenge.",
};

function fallbackReply(subjectId: string, message: string) {
  if (subjectId === "english") {
    return `Great question, Lorena! Vamos transformar "${message}" em uma frase simples. Use uma palavra nova em inglês e leia devagar.`;
  }
  return `Vamos pensar como historiadoras: qual fato aconteceu, quando aconteceu e por que foi importante? Sobre "${message}", escreva 3 pistas e eu te ajudo a montar a resposta.`;
}

export const sendTutorMessage = actionGeneric({
  args: {
    studentSlug: v.string(),
    subjectId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(anyApi.messages.recordMessage, {
      studentSlug: args.studentSlug,
      subjectId: args.subjectId,
      role: "user",
      text: args.message,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    let answer = fallbackReply(args.subjectId, args.message);
    let provider = "fallback";

    if (apiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: subjectPrompts[args.subjectId] || subjectPrompts.history }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: `A aluna se chama Lorena e esta no 5 ano. Pergunta: ${args.message}` }],
              },
            ],
            generationConfig: { temperature: 0.45, maxOutputTokens: 700 },
          }),
        },
      ).catch(() => null);

      if (response?.ok) {
        const data = await response.json();
        answer =
          data?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text)
            .filter(Boolean)
            .join("\n")
            .trim() || answer;
        provider = "gemini";
      }
    }

    await ctx.runMutation(anyApi.messages.recordMessage, {
      studentSlug: args.studentSlug,
      subjectId: args.subjectId,
      role: "assistant",
      text: answer,
      provider,
    });

    return { answer, provider };
  },
});
