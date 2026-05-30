import { NextRequest, NextResponse } from "next/server";
import { buildRewardMessage, buildWhatsappUrl } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    reward?: string;
    missionTitle?: string;
    subject?: string;
    missionId?: string;
  };

  const reward = body.reward || "uma recompensa especial";
  const missionTitle = body.missionTitle || "missão concluída";
  const subject = body.subject || "uma matéria";
  const message = buildRewardMessage({ reward, missionTitle, subject });

  return NextResponse.json({
    ok: true,
    rewardRequest: {
      missionId: body.missionId || "unknown",
      reward,
      missionTitle,
      subject,
      createdAt: new Date().toISOString(),
    },
    whatsappUrl: buildWhatsappUrl(message),
  });
}
