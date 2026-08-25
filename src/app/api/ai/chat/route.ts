import { NextResponse } from "next/server";
import { GET as getFundamentals } from "@/app/api/fundamentals/route";
import { STOCK_UNIVERSE } from "@/lib/indices";

export const dynamic = "force-dynamic";

type ChatTurn = { role: string; text: string };

const SYSTEM_PROMPT = `Kamu adalah "InvestBot", asisten investasi saham Indonesia di aplikasi InvestPro.
Kamu menerima perintah atau pertanyaan apa pun: analisis saham, perbandingan dua saham, penjelasan konsep
(DCF, ROE, RSI, dst), hitungan sederhana, ringkasan kondisi emiten, strategi, sampai obrolan biasa.

ATURAN:
1. Jika blok [DATA REAL DARI APLIKASI] disediakan, WAJIB pakai angka dari sana sebagai sumber kebenaran utama. Sebutkan periodenya bila relevan (mis. TTM hingga kuartal tertentu).
2. Jangan mengarang angka. Bila data yang dibutuhkan tidak ada di blok data dan tidak umum diketahui, katakan terus terang datanya belum tersedia di aplikasi.
3. Jawab singkat, padat, nyaman dibaca di layar HP. Maksimal 250 kata. Bullet pendek untuk data.
4. Format Markdown ringan (**tebal**, bullet) diperbolehkan.
5. Bahasa Indonesia santai-profesional; ikuti bahasa user.
6. Tidak memberi rekomendasi beli/jual eksplisit. Disclaimer singkat hanya saat membahas keputusan investasi spesifik.
7. Jika diminta aksi yang tidak didukung aplikasi (mis. eksekusi order), jelaskan batasan dengan ramah dan tawarkan alternatif yang bisa dilakukan.`;

function detectTickers(message: string): string[] {
  const upper = ` ${message.toUpperCase().replace(/[^A-Z0-9.\s]/g, " ")} `;
  const found = new Set<string>();
  for (const stock of STOCK_UNIVERSE) {
    if (upper.includes(` ${stock.ticker} `) || upper.includes(` ${stock.ticker}.JK `)) {
      found.add(stock.ticker);
      continue;
    }
    const nameWords = stock.name.toUpperCase().split(/\s+/).filter((word) => word.length >= 5);
    if (nameWords.length > 0 && nameWords.every((word) => upper.includes(word))) found.add(stock.ticker);
  }
  return [...found].slice(0, 3);
}

async function fetchFundamentalsFor(ticker: string): Promise<Record<string, any> | null> {
  try {
    const response = await getFundamentals(new Request(`http://internal/api/fundamentals?ticker=${encodeURIComponent(ticker)}`));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function pickFields(d: Record<string, any>) {
  return {
    ticker: d.ticker,
    name: d.name,
    sector: d.sector,
    indices: d.indices,
    marketCap: d.marketCap,
    asOf: d.asOf,
    hargaRealtime: d.dataStatus?.price === "real",
    ttm: d.ttm ? { available: d.ttm.available, periodEnd: d.ttm.periodEnd, quarters: d.ttm.quarters } : undefined,
    ratios: d.ratios,
    financials: d.financials,
    cagr: d.cagr,
    consistency: d.consistency,
    dupont: d.dupont,
    dcf: d.dcf,
    warnings: Array.isArray(d.warnings) ? d.warnings.map((w: any) => ({ title: w.title, severity: w.severity })) : [],
    kelengkapanDataPersen: d.dataQuality?.percentage
  };
}

async function buildContext(message: string): Promise<{ tickers: string[]; payloads: Record<string, any>[]; dataBlock: string }> {
  const tickers = detectTickers(message);
  if (!tickers.length) return { tickers: [], payloads: [], dataBlock: "" };
  const settled = await Promise.all(tickers.map(fetchFundamentalsFor));
  const payloads = settled.filter((item): item is Record<string, any> => Boolean(item));
  if (!payloads.length) return { tickers, payloads: [], dataBlock: "" };
  const dataBlock = `\n\n[DATA REAL DARI APLIKASI]\n${payloads.map((p) => JSON.stringify(pickFields(p))).join("\n\n")}`;
  return { tickers, payloads, dataBlock };
}

interface ProviderResult { reply: string; source: string }

function historyToGemini(history: ChatTurn[]) {
  return history.slice(-8).filter((turn) => turn.text?.trim()).map((turn) => ({
    role: turn.role === "user" ? "user" : "model",
    parts: [{ text: turn.text }]
  }));
}

function toOpenAiMessages(systemText: string, history: ChatTurn[], userText: string) {
  return [
    { role: "system", content: systemText },
    ...history.slice(-8).map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", content: turn.text })),
    { role: "user", content: userText }
  ];
}

async function callGemini(userText: string, history: ChatTurn[]): Promise<ProviderResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [...historyToGemini(history), { role: "user", parts: [{ text: userText }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.6, maxOutputTokens: 700, topP: 0.9 }
        })
      }
    );
    if (!res.ok) {
      console.error("Gemini error:", res.status);
      return null;
    }
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? { reply, source: "gemini" } : null;
  } catch (e) {
    console.error("Gemini failed:", e);
    return null;
  }
}

async function callOpenAiCompatible(name: string, url: string, model: string, apiKey: string, userText: string, history: ChatTurn[]): Promise<ProviderResult | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: toOpenAiMessages(SYSTEM_PROMPT, history, userText),
        temperature: 0.6,
        max_tokens: 700
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${name} error:`, res.status, body.slice(0, 400));
      // Simpan detail untuk diteruskan ke client bila semua provider gagal
      (globalThis as any).__lastAiError = `${name} ${res.status} ${body.slice(0, 300)}`;
      return null;
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    return reply ? { reply, source: name.toLowerCase().split("-")[0] } : null;
  } catch (e) {
    console.error(`${name} failed:`, e);
    (globalThis as any).__lastAiError = `${name} exception ${(e as Error).message}`;
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message: string = body?.message;
    const history: ChatTurn[] = Array.isArray(body?.history)
      ? body.history.filter((t: any) => t && typeof t.text === "string" && typeof t.role === "string").slice(-10)
      : [];

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { tickers, payloads, dataBlock } = await buildContext(message);
    const userText = `${message}${dataBlock}`;

    const providers: { name: string; fn: () => Promise<ProviderResult | null> }[] = [];
    if (process.env.GROQ_API_KEY) {
      // Model Groq terbaru gratis (Llama lama sudah di-retire 16 Aug 2026)
      providers.push({
        name: "groq/gpt-oss-20b",
        fn: () => callOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", "openai/gpt-oss-20b", process.env.GROQ_API_KEY!, userText, history)
      });
      providers.push({
        name: "groq/gpt-oss-120b",
        fn: () => callOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", "openai/gpt-oss-120b", process.env.GROQ_API_KEY!, userText, history)
      });
    }
    if (process.env.GEMINI_API_KEY) {
      providers.push({ name: "gemini", fn: () => callGemini(userText, history) });
    }
    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: "openrouter",
        fn: () => callOpenAiCompatible("openrouter", "https://openrouter.ai/api/v1/chat/completions", "google/gemma-4-31b-it:free", process.env.OPENROUTER_API_KEY!, userText, history)
      });
    }

    if (providers.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada API key AI yang dikonfigurasi.",
          details: "Setidaknya satu dari GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY harus diisi di .env.local dan di Vercel Environment Variables.",
          contextTickers: tickers
        },
        { status: 500 }
      );
    }

    for (const provider of providers) {
      const result = await provider.fn();
      if (result) {
        return NextResponse.json({ ...result, contextTickers: tickers });
      }
    }

    // Semua provider gagal — jangan fallback offline, tampilkan error jelas
    const lastError = (globalThis as any).__lastAiError ?? "tidak ada detail";
    const tried = providers.map((p) => p.name).join(", ");
    return NextResponse.json(
      {
        error: "Semua provider AI gagal merespons.",
        details: `Mencoba: ${tried}. Error terakhir: ${lastError}`,
        hint: "Jika Groq 401 = API key salah/expired (buat baru di console.groq.com/keys). Jika 404 = nama model salah. Jika Gemini 404 = model di-retire. Update .env.local + Vercel env lalu redeploy.",
        contextTickers: tickers,
        // Sertakan ringkasan data mentah agar tetap bisa debug tanpa menyamarkan kegagalan AI
        rawDataCount: payloads.length
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ reply: "Terjadi error. Coba refresh atau cek koneksi.", source: "error" });
  }
}
