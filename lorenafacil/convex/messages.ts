import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const listMessages = queryGeneric({
  args: {
    studentSlug: v.string(),
    subjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = args.subjectId
      ? await ctx.db
          .query("messages")
          .withIndex("by_student_subject", (q) =>
            q.eq("studentSlug", args.studentSlug),
          )
          .filter((q) => q.eq(q.field("subjectId"), args.subjectId!))
          .collect()
      : await ctx.db
          .query("messages")
          .withIndex("by_student", (q) => q.eq("studentSlug", args.studentSlug))
          .collect();

    return rows.sort((a, b) => a.createdAt - b.createdAt).slice(-50);
  },
});

export const recordMessage = mutationGeneric({
  args: {
    studentSlug: v.string(),
    subjectId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
