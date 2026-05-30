# Lorena Fácil

App mobile-first para a Lorena, aluna do 5º ano, com tutores de História e Inglês, missões, figurinhas e pedido de recompensa via WhatsApp.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Convex
- Gemini API server-side
- Vercel

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis

Crie `.env.local` a partir de `.env.example`.

- `GEMINI_API_KEY`: chave server-side para os agentes.
- `NEXT_PUBLIC_CONVEX_URL`: URL pública do Convex.
- `PARENT_WHATSAPP_NUMBER`: número do pai. Padrão: `5511994465011`.

## Convex

```bash
npm run convex:once
```

Depois rode `seed:seedInitialData` no painel/CLI do Convex para popular Lorena, matérias, missões e figurinhas.
