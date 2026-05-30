# Convex backend

Backend preparado para a Lorena Fácil.

## Setup local

```bash
npm install
CONVEX_AGENT_MODE=anonymous npx convex dev --once
npm run dev
```

Variáveis:

- `GEMINI_API_KEY`: usada pelos agentes especializados.
- `PARENT_WHATSAPP_NUMBER`: padrão `5511994465011`.
- `NEXT_PUBLIC_CONVEX_URL`: URL pública gerada pelo Convex para o Next.js.

## Funções principais

- `agents:sendTutorMessage`
- `missions:completeMission`
- `rewards:requestReward`
- `stickers:listStickers`
- `seed:seedInitialData`
