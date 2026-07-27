# InvestPro

Platform analisis saham Indonesia modern — Next.js 16 (App Router) + TypeScript + Tailwind v4.

## Stack
- **Next.js 16** (App Router, RSC)
- **TypeScript 5.9** (strict)
- **Tailwind CSS v4**
- **lucide-react** icons

## Fitur
- 📊 Dashboard saham LQ45/IDX30 (BBCA, BMRI, BBRI, ASII, TLKM, dll)
- 🤖 InvestBot AI chat (Gemini 2.0 Flash / Groq / OpenRouter fallback)
- 📈 Chart, technical, backtest, screener
- 🔍 Analisis, bandarology, risk, news
- 💼 Portfolio tracker & alert evaluation
- 🌐 Aset alternatif

## Quick Start
```bash
npm install
cp .env.example .env.local   # isi API keys
npm run dev                  # http://localhost:3000
```

## Build
```bash
npm run build
npm start
```

## Environment Variables
| Key | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ (primary AI) | Google AI Studio key |
| `GROQ_API_KEY` | optional | Groq fallback |
| `OPENROUTER_API_KEY` | optional | OpenRouter fallback |

## Deploy
- **Vercel** (recommended) — auto-detect Next.js
- Push ke GitHub lalu import project di [vercel.com/new](https://vercel.com/new)
- Set env vars di Vercel dashboard (jangan commit `.env.local`)

## Lisensi
Private project.
