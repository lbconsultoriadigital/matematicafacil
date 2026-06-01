import { defineApp } from "convex/server";
import { v } from "convex/values";

export default defineApp({
  env: {
    GEMINI_API_KEY: v.optional(v.string()),
    PARENT_WHATSAPP_NUMBER: v.optional(v.string()),
  },
});
