import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const getLorena = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("students")
      .withIndex("by_slug", (q) => q.eq("slug", "lorena"))
      .first();
  },
});

export const upsertStudent = mutationGeneric({
  args: {
    slug: v.string(),
    name: v.string(),
    grade: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("students")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        grade: args.grade,
        avatar: args.avatar,
      });
      return existing._id;
    }

    return await ctx.db.insert("students", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
