const DEFAULT_PARENT_NUMBER = "5511994465011";

export function buildRewardMessage({
  reward,
  missionTitle,
  subject,
}: {
  reward: string;
  missionTitle: string;
  subject: string;
}) {
  return `Oi pai! A Lorena completou a missão de ${subject} "${missionTitle}" e quer pedir a recompensa: ${reward}.`;
}

export function buildWhatsappUrl(message: string, phone = process.env.PARENT_WHATSAPP_NUMBER) {
  const normalizedPhone = (phone || DEFAULT_PARENT_NUMBER).replace(/\D/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
