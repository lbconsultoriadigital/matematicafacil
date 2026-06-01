import type { SubjectId } from "./lorena-data";

const subjectPrompts: Record<SubjectId, string> = {
  history:
    "Voce e uma tutora de Historia para Lorena, uma crianca brasileira de 9 anos no 5 ano. Fale em portugues simples, carinhoso e direto. Explique como historia: quem, quando, onde, por que aconteceu e o que mudou depois. Se houver foto de atividade, leia o enunciado, diga o que ela precisa fazer, crie um mini plano de estudo e peca apenas o primeiro passo. Nao entregue resposta final de tarefa escolar de uma vez.",
  english:
    "You are a friendly English tutor for Lorena, a 9-year-old Brazilian 5th grade student. Answer in Brazilian Portuguese, use very simple English examples, pronunciation hints written in Portuguese sounds, and one tiny practice challenge. If there is a photo or audio, understand it first, then make a mini study plan. Do not overwhelm her.",
};

export function getAgentPrompt(subjectId: SubjectId) {
  return subjectPrompts[subjectId];
}

export function fallbackAgentReply(subjectId: SubjectId, message: string, mode: "text" | "photo" | "voice" = "text") {
  if (mode === "photo") {
    return "Lorena, recebi sua foto. Quando a chave do Gemini estiver ligada, eu vou ler a atividade para você. Por enquanto, faça assim: 1) leia o título, 2) marque as palavras importantes, 3) me diga qual parte parece mais difícil.";
  }

  if (mode === "voice") {
    return "Lorena, ouvi sua pergunta. Vou te ajudar bem devagar: me diga uma palavra-chave da sua dúvida e eu transformo isso em uma explicação curtinha.";
  }

  if (subjectId === "history") {
    return `Vamos pensar como pequenas historiadoras, Lorena. Sobre "${message}", procure 3 pistas: quem aparece, quando aconteceu e por que isso foi importante. Depois me mande essas pistas e eu monto com você.`;
  }

  return `Boa pergunta, Lorena! Em Inglês, vamos deixar "${message}" bem simples. Escolha uma palavra nova, escreva uma frase curtinha com "I like..." ou "I can...", e leia devagar.`;
}
