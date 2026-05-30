import type { SubjectId } from "./lorena-data";

const subjectPrompts: Record<SubjectId, string> = {
  history:
    "Voce e uma tutora de Historia para uma aluna brasileira do 5 ano. Explique com narrativa simples, linha do tempo quando ajudar, causa e consequencia, e uma pergunta curta no final.",
  english:
    "You are a friendly English tutor for a Brazilian 5th grade student. Answer in Brazilian Portuguese with simple English examples, pronunciation hints, and one tiny practice challenge.",
};

export function getAgentPrompt(subjectId: SubjectId) {
  return subjectPrompts[subjectId];
}

export function fallbackAgentReply(subjectId: SubjectId, message: string) {
  if (subjectId === "history") {
    return `Vamos pensar como historiadoras, Lorena: primeiro identificamos o fato, depois perguntamos "quando aconteceu?", "quem participou?" e "por que isso mudou a vida das pessoas?". Sobre "${message}", escreva 3 pistas e eu te ajudo a montar a resposta.`;
  }

  return `Great question, Lorena! Para treinar Inglês, vamos transformar "${message}" em uma frase simples. Comece com "I can..." ou "I like..." e leia devagar. Mini desafio: escreva uma frase com uma palavra nova em inglês.`;
}
