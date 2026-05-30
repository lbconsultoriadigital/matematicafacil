import {
  BookOpen,
  Crown,
  Gift,
  Globe2,
  Landmark,
  Medal,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";

export type SubjectId = "history" | "english";

export type Subject = {
  id: SubjectId;
  title: string;
  shortTitle: string;
  accent: string;
  soft: string;
  icon: typeof Landmark;
  agentName: string;
};

export type Mission = {
  id: string;
  subjectId: SubjectId;
  title: string;
  detail: string;
  xp: number;
  reward: string;
  stickerId: string;
};

export type Sticker = {
  id: string;
  title: string;
  src: string;
  rarity: "comum" | "rara" | "especial";
};

export const student = {
  id: "lorena",
  name: "Lorena",
  grade: "5º ano",
  streak: 12,
  avatar: "/stickers/lorena-avatar.png",
};

export const subjects: Subject[] = [
  {
    id: "history",
    title: "História",
    shortTitle: "História",
    accent: "#ec2f86",
    soft: "#fff0f7",
    icon: Landmark,
    agentName: "Agente de História",
  },
  {
    id: "english",
    title: "Inglês",
    shortTitle: "Inglês",
    accent: "#7c43d8",
    soft: "#f4edff",
    icon: MessageCircle,
    agentName: "English Buddy",
  },
];

export const missions: Mission[] = [
  {
    id: "historia-linha-do-tempo",
    subjectId: "history",
    title: "Monte uma linha do tempo",
    detail: "Organize 3 fatos sobre o Brasil Colônia.",
    xp: 40,
    reward: "15 minutos de desenho ou música",
    stickerId: "bom-dia",
  },
  {
    id: "historia-personagem",
    subjectId: "history",
    title: "Quem foi importante?",
    detail: "Explique um personagem histórico em 3 frases.",
    xp: 35,
    reward: "Escolher a sobremesa do dia",
    stickerId: "uau-aprovado",
  },
  {
    id: "ingles-five-words",
    subjectId: "english",
    title: "5 palavras novas",
    detail: "Aprenda e use 5 palavras em inglês numa frase.",
    xp: 40,
    reward: "Pedir uma história antes de dormir",
    stickerId: "ei-voce",
  },
  {
    id: "ingles-dialogo",
    subjectId: "english",
    title: "Mini diálogo",
    detail: "Treine: hello, how are you, I am fine.",
    xp: 35,
    reward: "Escolher uma brincadeira em família",
    stickerId: "fofo-demais",
  },
];

export const stickers: Sticker[] = [
  { id: "bom-dia", title: "Bom dia!", src: "/stickers/bom-dia.png", rarity: "comum" },
  { id: "o-que", title: "O quêêê?", src: "/stickers/o-que.png", rarity: "comum" },
  { id: "ha", title: "Hã?", src: "/stickers/ha.png", rarity: "comum" },
  { id: "to-te-lembrando", title: "Tô te lembrando!", src: "/stickers/to-te-lembrando.png", rarity: "rara" },
  { id: "muito-sono", title: "Muito sono", src: "/stickers/muito-sono.png", rarity: "comum" },
  { id: "uau-aprovado", title: "Uau! Aprovado!", src: "/stickers/uau-aprovado.png", rarity: "especial" },
  { id: "boa", title: "Boa!", src: "/stickers/boa.png", rarity: "comum" },
  { id: "ei-voce", title: "Ei, você!", src: "/stickers/ei-voce.png", rarity: "rara" },
  { id: "atchim", title: "Atchim!", src: "/stickers/atchim.png", rarity: "comum" },
  { id: "bravinho", title: "Bravinho!", src: "/stickers/bravinho.png", rarity: "rara" },
  { id: "fofo-demais", title: "Fofo demaisss", src: "/stickers/fofo-demais.png", rarity: "especial" },
  { id: "boa-noite", title: "Boa noite :3", src: "/stickers/boa-noite.png", rarity: "especial" },
];

export const shortcutTiles = [
  { id: "missions", title: "Missões", icon: Target, tint: "from-pink-50 to-white", border: "border-pink-100" },
  { id: "stickers", title: "Figurinhas", icon: Star, tint: "from-yellow-50 to-white", border: "border-yellow-100" },
  { id: "rewards", title: "Recompensas", icon: Trophy, tint: "from-orange-50 to-white", border: "border-orange-100" },
  { id: "progress", title: "Meu progresso", icon: Medal, tint: "from-violet-50 to-white", border: "border-violet-100" },
];

export const rewardIdeas = [
  "15 minutos de desenho ou música",
  "Escolher a sobremesa do dia",
  "Pedir uma história antes de dormir",
  "Escolher uma brincadeira em família",
];

export const bottomNav = [
  { id: "tutor", title: "Tutor", icon: MessageCircle },
  { id: "missions", title: "Missões", icon: BookOpen },
  { id: "stickers", title: "Figurinhas", icon: Sparkles },
];

export const subjectIcons = {
  history: Landmark,
  english: Globe2,
  reward: Gift,
  crown: Crown,
};
