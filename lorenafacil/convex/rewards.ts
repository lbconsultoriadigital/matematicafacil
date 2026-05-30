import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const DEFAULT_PARENT_NUMBER = "5511994465011";

function buildWhatsappUrl(message: string) {
  const phone = (process.env.PARENT_WHATSAPP_NUMBER || DEFAULT_PARENT_NUMBER).replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export const requestReward = mutationGeneric({
  args: {
    studentSlug: v.string(),
    missionId: v.string(),
    reward: v.string(),
    subject: v.string(),
    missionTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const message = `Oi pai! A Lorena completou a missão de ${args.subject} "${args.missionTitle}" e quer pedir a recompensa: ${args.reward}.`;
    const whatsappUrl = buildWhatsappUrl(message);

    const id = await ctx.db.insert("rewardRequests", {
      studentSlug: args.studentSlug,
      missionId: args.missionId,
      reward: args.reward,
      subject: args.subject,
      message,
      whatsappUrl,
      status: "created",
      createdAt: Date.now(),
    });

    return { id, whatsappUrl, message };
  },
});

export const listRewardRequests = queryGeneric({
  args: {
    studentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("rewardRequests")
      .withIndex("by_student", (q) => q.eq("studentSlug", args.studentSlug))
      .collect();
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});
