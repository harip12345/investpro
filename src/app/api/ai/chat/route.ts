import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Kamu adalah asisten investasi saham Indonesia yang ahli, ramah, dan membantu.
Nama kamu "InvestBot". Tugas kamu membantu analisis saham, menjelaskan konsep investasi,
memberi wawasan pasar, dan diskusi strategi. Gunakan Bahasa Indonesia yang santai tapi profesional.

Kamu punya akses data saham Indonesia (BBCA, BMRI, BBRI, ASII, TLKM, ADRO, UNVR, GGRM, HMSP, UNTR, EXCL, JSMR, PTBA, PGAS, INDY, AKRA, ICBP, BBNI).

Jawab dengan singkat, padat, informatif. Maksimal 3 paragraf.
Jika ditanya tentang prediksi harga, beri disclaimer bahwa ini bukan saran investasi.
Jangan memberi rekomendasi beli/jual secara eksplisit.`;

const userMessages = [
  { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
  { role: "model", parts: [{ text: "Siap! Saya InvestBot, asisten saham Indonesia. Ada yang bisa dibantu?" }] }
];

interface ProviderResult { reply: string; source: string; }

async function callGemini(message: string): Promise<ProviderResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...userMessages,
            { role: "user", parts: [{ text: message }] }
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512, topP: 0.9 }
        })
      }
    );

    if (!res.ok) {
      console.error("Gemini error:", res.status);
      return null;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return null;
    return { reply, source: "gemini" };
  } catch (e) {
    console.error("Gemini failed:", e);
    return null;
  }
}

async function callGroq(message: string): Promise<ProviderResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });

    if (!res.ok) {
      console.error("Groq error:", res.status);
      return null;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return null;
    return { reply, source: "groq" };
  } catch (e) {
    console.error("Groq failed:", e);
    return null;
  }
}

async function callOpenRouter(message: string): Promise<ProviderResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });

    if (!res.ok) {
      console.error("OpenRouter error:", res.status);
      return null;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return null;
    return { reply, source: "openrouter" };
  } catch (e) {
    console.error("OpenRouter failed:", e);
    return null;
  }
}

async function getOfflineReply(message: string): Promise<ProviderResult> {
  const lower = message.toLowerCase();

  if (lower.includes("bbca") || lower.includes("bank central asia")) {
    return { reply: "BBCA (PT Bank Central Asia Tbk) adalah bank swasta terbesar di Indonesia.\n\n• **Harga**: Rp 6.175\n• **P/E**: 24.1 (agak tinggi, premium valuation)\n• **ROE**: 19.7% (sangat kuat)\n• **Dividend Yield**: 2.1%\n• **Indeks**: LQ45, IDX30, KOMPAS100, SRI-KEHATI\n\nBBCA dikenal sebagai \"blue chip\" dengan kualitas manajemen terbaik. P/E tinggi mencerminkan premium yang dibayar investor untuk kualitas ini.\n\nDisclaimer: Ini bukan rekomendasi beli/jual.", source: "offline" };
  }

  if (lower.includes("dcf") || lower.includes("discounted cash flow")) {
    return { reply: "**DCF (Discounted Cash Flow)** adalah metode valuasi yang menghitung nilai sekarang dari arus kas masa depan.\n\n**Rumus sederhana:**\n1. Proyeksi Free Cash Flow 10 tahun ke depan\n2. Diskon dengan WACC (biasanya 8-12%)\n3. Tambah Terminal Value\n4. Bagi dengan jumlah saham beredar\n\n**Contoh:**\nJika FCF Rp 10T, growth 8%, WACC 10%, terminal value = Rp 10T × (1.08) / (0.10 - 0.02) = Rp 135T\n\nFair value = PV(FCF 10 tahun) + PV(Terminal Value)\n\nIni metode yang dipakai analis profesional.", source: "offline" };
  }

  if (lower.includes("rsi") || lower.includes("macd") || lower.includes("bollinger") || lower.includes("indikator")) {
    return { reply: "**Indikator Teknikal Populer:**\n\n**RSI (Relative Strength Index):**\n• Oscillator 0-100\n• > 70 = Overbought (potensi turun)\n• < 30 = Oversold (potensi naik)\n\n**MACD (Moving Average Convergence Divergence):**\n• EMA12 - EMA26 = MACD Line\n• Signal line = EMA9 dari MACD\n• Histogram = MACD - Signal\n• Bullish crossover = MACD naik di atas signal\n\n**Bollinger Bands:**\n• Middle: SMA20\n• Upper: SMA20 + 2×StdDev\n• Lower: SMA20 - 2×StdDev\n• Harga di upper = overbought\n• Harga di lower = oversold\n\nGunakan kombinasi untuk konfirmasi sinyal.", source: "offline" };
  }

  if (lower.includes("pemula") || lower.includes("strategi") || lower.includes("cara")) {
    return { reply: "**Strategi Investasi untuk Pemula:**\n\n**1. Mulai dengan indeks**\nBeli ETF/indeks (LQ45) untuk diversifikasi otomatis.\n\n**2. Dollar Cost Averaging (DCA)**\nInvestasi rutin tiap bulan, tidak peduli harga naik/turun.\n\n**3. Pahami fundamental**\nCari saham dengan:\n• ROE > 15% (efisien)\n• DER < 1 (tidak banyak utang)\n• Dividend yield > 2% (income)\n\n**4. Jangan semua di satu saham**\nMinimal 5-10 saham berbeda sektor.\n\n**5. Invest jangka panjang**\nMinimal 3-5 tahun, jangan panik saat market turun.\n\nDisclaimer: Ini edukasi, bukan saran investasi.", source: "offline" };
  }

  if (lower.includes("saham") || lower.includes("investasi") || lower.includes("trading")) {
    return { reply: "Untuk investasi saham, beberapa tips penting:\n\n**1. Pahami dulu fundamental**\nCek ROE, P/E, DER, dan Dividend Yield sebelum beli.\n\n**2. Diversifikasi**\nJangan taruh semua uang di satu saham.\n\n**3. Investasi jangka panjang**\nMinimum 1-3 tahun untuk hasil optimal.\n\n**4. Belajar teknikal**\nGunakan RSI, MACD untuk timing beli/jual.\n\n**5. Atur emosi**\nJangan panik saat market turun, jangan serakah saat naik.\n\nDisclaimer: Ini edukasi, bukan rekomendasi.", source: "offline" };
  }

  return { reply: "Saya InvestBot! Untuk pertanyaan spesifik, coba:\n\n• **BBCA** - Analisis saham Bank Central Asia\n• **DCF** - Penjelasan metode valuasi\n• **Indikator** - RSI, MACD, Bollinger Bands\n• **Pemula** - Strategi investasi awal\n\nAtau tanya apa saja tentang saham Indonesia!", source: "offline" };
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const keysExist = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;

    if (!keysExist) {
      return NextResponse.json({
        reply: `Halo! Saya **InvestBot** 🤖 asisten investasi saham Indonesia.\n\nSaat ini mode **offline** (tanpa AI). Untuk mengaktifkan AI, tambahkan API key di file **.env.local**:\n\n**Opsi 1 - Google Gemini (gratis):**\n\`GEMINI_API_KEY=key\`\nBuka: https://aistudio.google.com/apikey\n\n**Opsi 2 - Groq (gratis, sangat cepat):**\n\`GROQ_API_KEY=key\`\nBuka: https://console.groq.com/keys\n\n**Opsi 3 - OpenRouter (gratis):**\n\`OPENROUTER_API_KEY=key\`\nBuka: https://openrouter.ai/keys\n\nRestart \`npm run dev\` setelah menambah key.`, source: "offline"
      });
    }

    // Fallback chain: Gemini → Groq → OpenRouter → Offline
    const providers = [
      { name: "Gemini", fn: () => callGemini(message) },
      { name: "Groq", fn: () => callGroq(message) },
      { name: "OpenRouter", fn: () => callOpenRouter(message) }
    ];

    for (const provider of providers) {
      console.log(`Trying ${provider.name}...`);
      const result = await provider.fn();
      if (result) {
        console.log(`Success: ${result.source}`);
        return NextResponse.json(result);
      }
      console.log(`${provider.name} failed, trying next...`);
    }

    // All providers failed - use offline
    console.log("All providers failed, using offline fallback");
    const offline = await getOfflineReply(message);
    return NextResponse.json({ ...offline, source: "offline" });

  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ reply: "Terjadi error. Coba refresh atau cek koneksi.", source: "error" });
  }
}
