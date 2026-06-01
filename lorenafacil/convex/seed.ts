import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

const subjects = [
  { subjectId: "history", title: "História", enabled: true, accent: "#ec2f86", order: 1 },
  { subjectId: "english", title: "Inglês", enabled: true, accent: "#7c43d8", order: 2 },
];

const missions = [
  {
    missionId: "historia-linha-do-tempo",
    subjectId: "history",
    title: "Monte uma linha do tempo",
    detail: "Organize 3 fatos sobre o Brasil Colônia.",
    xp: 40,
    reward: "15 minutos de desenho ou música",
    stickerId: "bom-dia",
    cadence: "daily",
    active: true,
    order: 1,
  },
  {
    missionId: "historia-personagem",
    subjectId: "history",
    title: "Quem foi importante?",
    detail: "Explique um personagem histórico em 3 frases.",
    xp: 35,
    reward: "Escolher a sobremesa do dia",
    stickerId: "uau-aprovado",
    cadence: "daily",
    active: true,
    order: 2,
  },
  {
    missionId: "ingles-five-words",
    subjectId: "english",
    title: "5 palavras novas",
    detail: "Aprenda e use 5 palavras em inglês numa frase.",
    xp: 40,
    reward: "Pedir uma história antes de dormir",
    stickerId: "ei-voce",
    cadence: "daily",
    active: true,
    order: 3,
  },
  {
    missionId: "ingles-dialogo",
    subjectId: "english",
    title: "Mini diálogo",
    detail: "Treine: hello, how are you, I am fine.",
    xp: 35,
    reward: "Escolher uma brincadeira em família",
    stickerId: "fofo-demais",
    cadence: "weekly",
    active: true,
    order: 4,
  },
];

const stickers = [
  ["bom-dia", "Bom dia!", "/stickers/bom-dia.png", "comum"],
  ["o-que", "O quêêê?", "/stickers/o-que.png", "comum"],
  ["ha", "Hã?", "/stickers/ha.png", "comum"],
  ["to-te-lembrando", "Tô te lembrando!", "/stickers/to-te-lembrando.png", "rara"],
  ["muito-sono", "Muito sono", "/stickers/muito-sono.png", "comum"],
  ["uau-aprovado", "Uau! Aprovado!", "/stickers/uau-aprovado.png", "especial"],
  ["boa", "Boa!", "/stickers/boa.png", "comum"],
  ["ei-voce", "Ei, você!", "/stickers/ei-voce.png", "rara"],
  ["atchim", "Atchim!", "/stickers/atchim.png", "comum"],
  ["bravinho", "Bravinho!", "/stickers/bravinho.png", "rara"],
  ["fofo-demais", "Fofo demaisss", "/stickers/fofo-demais.png", "especial"],
  ["boa-noite", "Boa noite :3", "/stickers/boa-noite.png", "especial"],
] as const;

export const seedInitialData = mutationGeneric({
  args: {
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const student = await ctx.db
      .query("students")
      .withIndex("by_slug", (q) => q.eq("slug", "lorena"))
      .first();

    if (!student) {
      await ctx.db.insert("students", {
        slug: "lorena",
        name: "Lorena",
        grade: "5º ano",
        avatar: "/stickers/lorena-avatar.png",
        createdAt: now,
      });
    }

    if (args.reset) {
      for (const table of ["subjects", "missions", "stickers"] as const) {
        const rows = await ctx.db.query(table).collect();
        await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
      }
    }

    for (const subject of subjects) {
      const existing = await ctx.db
        .query("subjects")
        .withIndex("by_subject_id", (q) => q.eq("subjectId", subject.subjectId))
        .first();
      if (!existing) await ctx.db.insert("subjects", subject);
    }

    for (const mission of missions) {
      const existing = await ctx.db
        .query("missions")
        .withIndex("by_mission_id", (q) => q.eq("missionId", mission.missionId))
        .first();
      if (!existing) await ctx.db.insert("missions", mission);
    }

    for (const [stickerId, title, src, rarity] of stickers) {
      const existing = await ctx.db
        .query("stickers")
        .withIndex("by_sticker_id", (q) => q.eq("stickerId", stickerId))
        .first();
      if (!existing) {
        await ctx.db.insert("stickers", {
          stickerId,
          title,
          src,
          rarity,
          order: stickers.findIndex(([id]) => id === stickerId) + 1,
        });
      }
    }

    return { ok: true };
  },
});
