import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const listMissions = queryGeneric({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("missions").collect();
    return all
      .filter((mission) => (args.activeOnly ? mission.active : true))
      .sort((a, b) => a.order - b.order);
  },
});

export const completeMission = mutationGeneric({
  args: {
    studentSlug: v.string(),
    missionId: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db
      .query("missions")
      .withIndex("by_mission_id", (q) => q.eq("missionId", args.missionId))
      .first();
    if (!mission) throw new Error("Missão não encontrada");

    const existing = await ctx.db
      .query("progress")
      .withIndex("by_student_mission", (q) =>
        q.eq("studentSlug", args.studentSlug),
      )
      .filter((q) => q.eq(q.field("missionId"), args.missionId))
      .first();

    if (!existing) {
      await ctx.db.insert("progress", {
        studentSlug: args.studentSlug,
        missionId: mission.missionId,
        subjectId: mission.subjectId,
        xp: mission.xp,
        completedAt: Date.now(),
      });
    }

    const unlocked = await ctx.db
      .query("stickerUnlocks")
      .withIndex("by_student_sticker", (q) =>
        q.eq("studentSlug", args.studentSlug),
      )
      .filter((q) => q.eq(q.field("stickerId"), mission.stickerId))
      .first();

    if (!unlocked) {
      await ctx.db.insert("stickerUnlocks", {
        studentSlug: args.studentSlug,
        stickerId: mission.stickerId,
        unlockedAt: Date.now(),
      });
    }

    return {
      missionId: mission.missionId,
      subjectId: mission.subjectId,
      xp: existing ? 0 : mission.xp,
      stickerId: mission.stickerId,
      reward: mission.reward,
    };
  },
});

export const getProgress = queryGeneric({
  args: {
    studentSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_student", (q) => q.eq("studentSlug", args.studentSlug))
      .collect();
    return {
      completedMissionIds: rows.map((row) => row.missionId),
      xp: rows.reduce((sum, row) => sum + row.xp, 0),
    };
  },
});
