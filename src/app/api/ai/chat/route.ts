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
      console.error(`${name} error:`, res.status);
      return null;
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    return reply ? { reply, source: name.toLowerCase() } : null;
  } catch (e) {
    console.error(`${name} failed:`, e);
    return null;
  }
}

function renderDataSummary(payloads: Record<string, any>[]): string {
  const lines: string[] = [];
  for (const d of payloads) {
    const r = d.ratios ?? {};
    const f = d.financials ?? {};
    lines.push(`**${d.ticker}${d.name ? ` - ${d.name}` : ""}**`);
    lines.push(`Data per ${d.asOf ?? "-"}${d.ttm?.available ? ` (TTM s/d ${d.ttm.periodEnd})` : ""} | Kapitalisasi Rp${d.marketCap ?? "-"}`);
    lines.push(`- P/E ${r.pe ?? 0} | P/BV ${r.pbv ?? 0} | ROE ${r.roe ?? 0}% | DER ${r.der ?? 0} | Div yield ${r.dividendYield ?? 0}%`);
    lines.push(`- Pendapatan Rp${f.revenue ?? 0} B | Laba Rp${f.netIncome ?? 0} B | EPS Rp${f.eps ?? 0} | FCF Rp${f.freeCashFlow ?? 0} B`);
    if (d.dcf?.fairPrice) lines.push(`- DCF fair value Rp${d.dcf.fairPrice} (${d.dcf.upside >= 0 ? "+" : ""}${d.dcf.upside}% vs harga kini)`);
    if (d.consistency?.totalYears >= 3) lines.push(`- Konsistensi: laba positif ${d.consistency.profitableYears}/${d.consistency.totalYears} tahun terakhir`);
    if (Array.isArray(d.warnings) && d.warnings.length) lines.push(`- Peringatan: ${d.warnings.map((w: any) => w.title).join(", ")}`);
    lines.push("");
  }
  lines.push("_Ringkasan langsung dari data aplikasi (mode offline)._");
  return lines.join("\n");
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
    const contextNote = tickers.length ? ` (${tickers.join(", ")})` : "";

    const providers: { name: string; fn: () => Promise<ProviderResult | null> }[] = [];
    if (process.env.GROQ_API_KEY) {
      // Utama: Groq Llama 3.3 70B - cepat dan gratis
      providers.push({
        name: "groq",
        fn: () => callOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", process.env.GROQ_API_KEY!, userText, history)
      });
      // Cadangan bila model utama Groq bermasalah
      providers.push({
        name: "groq-fallback",
        fn: () => callOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", "llama-3.1-8b-instant", process.env.GROQ_API_KEY!, userText, history)
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

    for (const provider of providers) {
      const result = await provider.fn();
      if (result) {
        return NextResponse.json({ ...result, contextTickers: tickers });
      }
    }

    if (payloads.length) {
      return NextResponse.json({ reply: renderDataSummary(payloads), source: "offline-data", contextTickers: tickers });
    }

    return NextResponse.json({
      reply: `Saya InvestBot! Saat ini layanan AI sedang tidak terhubung${contextNote ? ` dan saya tidak menemukan data lengkap untuk ${contextNote.trim()}` : ""}.\n\nYang tetap bisa kamu lakukan:\n- Buka tab **Analisis** untuk metrik fundamental lengkap per emiten\n- Sebutkan ticker saham di chat (mis. "analisis BBCA") agar saya bisa rangkum datanya langsung\n\n_Catatan: ini bukan saran investasi._`,
      source: "offline",
      contextTickers: tickers
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ reply: "Terjadi error. Coba refresh atau cek koneksi.", source: "error" });
  }
}
