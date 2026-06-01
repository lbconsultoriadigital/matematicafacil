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
  streak: 0,
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
    id: "historia-foto-caderno",
    subjectId: "history",
    title: "Ler uma atividade",
    detail: "Envie uma foto de História e conte o que você entendeu.",
    xp: 40,
    reward: "15 minutos de desenho ou música",
    stickerId: "bom-dia",
  },
  {
    id: "ingles-audio-curto",
    subjectId: "english",
    title: "Falar em Inglês",
    detail: "Grave uma frase simples: hello, my name is Lorena.",
    xp: 35,
    reward: "Escolher uma brincadeira em família",
    stickerId: "o-que",
  },
  {
    id: "historia-personagem",
    subjectId: "history",
    title: "Personagem histórico",
    detail: "Explique um personagem histórico em 3 frases.",
    xp: 35,
    reward: "Escolher a sobremesa do dia",
    stickerId: "ha",
  },
  {
    id: "ingles-five-words",
    subjectId: "english",
    title: "5 palavras novas",
    detail: "Aprenda e use 5 palavras em inglês numa frase.",
    xp: 40,
    reward: "Pedir uma história antes de dormir",
    stickerId: "to-te-lembrando",
  },
  {
    id: "historia-linha-do-tempo",
    subjectId: "history",
    title: "Linha do tempo",
    detail: "Organize 3 fatos em ordem: começo, meio e fim.",
    xp: 40,
    reward: "Escolher uma música no carro",
    stickerId: "muito-sono",
  },
  {
    id: "ingles-dialogo",
    subjectId: "english",
    title: "Mini diálogo",
    detail: "Treine: hello, how are you, I am fine.",
    xp: 35,
    reward: "Escolher uma brincadeira em família",
    stickerId: "uau-aprovado",
  },
  {
    id: "historia-causa-consequencia",
    subjectId: "history",
    title: "Causa e consequência",
    detail: "Conte por que um fato aconteceu e o que mudou depois.",
    xp: 45,
    reward: "10 minutos a mais de desenho",
    stickerId: "boa",
  },
  {
    id: "ingles-traducao-contexto",
    subjectId: "english",
    title: "Traduzir sem decorar",
    detail: "Pegue uma frase em inglês e explique com suas palavras.",
    xp: 45,
    reward: "Escolher o lanche do dia",
    stickerId: "ei-voce",
  },
  {
    id: "historia-resumo-pequeno",
    subjectId: "history",
    title: "Resumo pequeno",
    detail: "Faça um resumo de 4 linhas sobre uma aula de História.",
    xp: 50,
    reward: "Pedir uma história antes de dormir",
    stickerId: "atchim",
  },
  {
    id: "ingles-vocabulario-casa",
    subjectId: "english",
    title: "Palavras da casa",
    detail: "Liste 6 objetos da casa em inglês.",
    xp: 40,
    reward: "Escolher um jogo rápido",
    stickerId: "bravinho",
  },
  {
    id: "historia-quiz-rapido",
    subjectId: "history",
    title: "Quiz de História",
    detail: "Responda 3 perguntinhas sobre o tema estudado.",
    xp: 45,
    reward: "Escolher a sobremesa do dia",
    stickerId: "fofo-demais",
  },
  {
    id: "ingles-leitura-curta",
    subjectId: "english",
    title: "Leitura curta",
    detail: "Leia uma frase em inglês e diga o que ela quer dizer.",
    xp: 45,
    reward: "15 minutos de desenho ou música",
    stickerId: "boa-noite",
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
