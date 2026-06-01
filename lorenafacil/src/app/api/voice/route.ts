import { NextRequest } from "next/server";
import { corsPreflight, getCorsHeaders, jsonWithCors } from "@/lib/api-cors";

export const runtime = "nodejs";
export const maxDuration = 25;

const DEFAULT_TTS_MODEL = "gemini-2.5-pro-preview-tts";
const DEFAULT_TTS_VOICE = "Puck";
const DEFAULT_TTS_INSTRUCTIONS =
  "Leia em portugues do Brasil como uma voz humana, natural, acolhedora e expressiva para uma menina de 9 anos. " +
  "Use ritmo calmo, diccao clara, energia leve, pequenas pausas entre ideias e tom de tutor gentil. " +
  "Nao leia marcadores de markdown. Nao soe como robo, atendimento telefonico ou narracao artificial.";

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
};

export function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  const text = cleanForSpeech(typeof body.text === "string" ? body.text : "");

  if (!text) {
    return jsonWithCors(request, { ok: false, message: "Texto vazio." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return jsonWithCors(
      request,
      { ok: false, message: "GEMINI_API_KEY ausente." },
      { status: 503 },
    );
  }

  const model = process.env.GEMINI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const voice = process.env.GEMINI_TTS_VOICE?.trim() || DEFAULT_TTS_VOICE;
  const instructions = process.env.GEMINI_TTS_INSTRUCTIONS?.trim() || DEFAULT_TTS_INSTRUCTIONS;
  const promptForVoice = `${instructions}\n\nTexto para narrar:\n"${text.slice(0, 4200)}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptForVoice }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return jsonWithCors(
        request,
        { ok: false, message: errorText || `Falha no Gemini TTS: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const inlineAudio = data?.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: GeminiInlineData }) => part.inlineData?.data,
    )?.inlineData as GeminiInlineData | undefined;

    if (!inlineAudio?.data) {
      return jsonWithCors(
        request,
        { ok: false, message: "O Gemini nao retornou audio." },
        { status: 502 },
      );
    }

    const pcmBuffer = Buffer.from(inlineAudio.data, "base64");
    const sampleRate = getSampleRate(inlineAudio.mimeType);
    const wavBuffer = pcmToWavBuffer(pcmBuffer, sampleRate);

    return new Response(wavBuffer, {
      headers: {
        ...getCorsHeaders(request),
        "Cache-Control": "no-store",
        "Content-Length": String(wavBuffer.byteLength),
        "Content-Type": "audio/wav",
      },
    });
  } catch {
    return jsonWithCors(
      request,
      { ok: false, message: "Nao consegui gerar a voz agora." },
      { status: 502 },
    );
  }
}

function cleanForSpeech(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/[#*_`>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSampleRate(mimeType?: string) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
) {
  const headerSize = 44;
  const wavBuffer = Buffer.alloc(headerSize + pcmBuffer.length);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavBuffer.write("WAVE", 8);
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
  pcmBuffer.copy(wavBuffer, headerSize);

  return wavBuffer;
}
