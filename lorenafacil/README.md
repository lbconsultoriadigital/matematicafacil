# Lorena Fácil

App mobile-first para a Lorena, aluna do 5º ano, com tutores de História e Inglês, missões, figurinhas e pedido de recompensa via WhatsApp.

## Links

- Produção: https://lorenafacil.vercel.app
- GitHub: https://github.com/lbconsultoriadigital/lorenafacil

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Convex
- Gemini API server-side
- Vercel
- Capacitor Android

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
- `LORENA_ACCESS_PIN`: senha numérica para abrir o app. Padrão temporário: `2505`.
- `ACCESS_COOKIE_SECRET`: segredo opcional para assinar o cookie de acesso.

## Convex

```bash
npm run convex:once
```

Depois rode `seed:seedInitialData` no painel/CLI do Convex para popular Lorena, matérias, missões e figurinhas.

## APK Android

O APK usa Capacitor com a interface embutida no aplicativo, ícone personalizado da Lorena e permissões de câmera/microfone. As chamadas do tutor e recompensas continuam usando a API segura da Vercel.

```bash
npm run apk:debug
```

Arquivo gerado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para abrir no Android Studio:

```bash
npm run android:open
```
