import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  students: defineTable({
    slug: v.string(),
    name: v.string(),
    grade: v.string(),
    avatar: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  subjects: defineTable({
    subjectId: v.string(),
    title: v.string(),
    enabled: v.boolean(),
    accent: v.string(),
    order: v.number(),
  }).index("by_subject_id", ["subjectId"]),

  missions: defineTable({
    missionId: v.string(),
    subjectId: v.string(),
    title: v.string(),
    detail: v.string(),
    xp: v.number(),
    reward: v.string(),
    stickerId: v.string(),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    active: v.boolean(),
    order: v.number(),
  })
    .index("by_mission_id", ["missionId"])
    .index("by_subject", ["subjectId"]),

  progress: defineTable({
    studentSlug: v.string(),
    missionId: v.string(),
    subjectId: v.string(),
    xp: v.number(),
    completedAt: v.number(),
  })
    .index("by_student", ["studentSlug"])
    .index("by_student_mission", ["studentSlug", "missionId"]),

  stickers: defineTable({
    stickerId: v.string(),
    title: v.string(),
    src: v.string(),
    rarity: v.union(v.literal("comum"), v.literal("rara"), v.literal("especial")),
    order: v.number(),
  }).index("by_sticker_id", ["stickerId"]),

  stickerUnlocks: defineTable({
    studentSlug: v.string(),
    stickerId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_student", ["studentSlug"])
    .index("by_student_sticker", ["studentSlug", "stickerId"]),

  rewardRequests: defineTable({
    studentSlug: v.string(),
    missionId: v.string(),
    reward: v.string(),
    subject: v.string(),
    message: v.string(),
    whatsappUrl: v.string(),
    status: v.union(v.literal("created"), v.literal("sent"), v.literal("approved")),
    createdAt: v.number(),
  }).index("by_student", ["studentSlug"]),

  messages: defineTable({
    studentSlug: v.string(),
    subjectId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    provider: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_student", ["studentSlug"])
    .index("by_student_subject", ["studentSlug", "subjectId"]),
});
