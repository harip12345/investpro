"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Loader2, Sparkles, TrendingUp, Shield, BarChart3, Info } from "lucide-react";

const suggestions = [
  { icon: TrendingUp, text: "Analisis BBCA saat ini berdasarkan data terbaru", label: "Analisis BBCA" },
  { icon: Shield, text: "Bandingkan BBRI vs BMRI dari sisi fundamental", label: "Bandingkan Bank" },
  { icon: BarChart3, text: "Jelaskan DCF, ROE, dan RSI secara singkat", label: "Konsep Dasar" },
  { icon: Info, text: "Apa strategi investasi yang cocok untuk pemula?", label: "Untuk Pemula" }
];

export default function AiPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "bot", text: "Halo! Saya **InvestBot** 🤖 asisten investasi saham Indonesia.\n\nSaya bisa bantu:\n• Analisis saham — sebutkan ticker, mis. \"analisis TLKM\"\n• Bandingkan dua emiten — \"bandingkan BBRI vs BMRI\"\n• Penjelasan konsep (DCF, ROE, RSI, dll)\n• Diskusi strategi & pertanyaan bebas\n\nData fundamental saya ambil langsung dari aplikasi. Ada yang ingin ditanyakan?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-8) })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Terjadi error. Coba refresh atau periksa koneksi." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={22} className="shrink-0 text-sky-400 sm:size-6" />
          <h1 className="text-xl font-bold sm:text-2xl">AI InvestBot</h1>
        </div>
        <p className="small-muted leading-relaxed">Diskusi investasi dengan AI · Ditenagai Google Gemini · Gratis</p>
      </div>

      {messages.length === 1 && (
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {suggestions.map((s) => (
            <button key={s.label} onClick={() => send(s.text)} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/40 p-3.5 text-left transition hover:border-sky-500 hover:bg-zinc-800 active:bg-zinc-800 sm:min-h-0 sm:rounded-lg sm:p-4">
              <s.icon size={20} className="shrink-0 text-sky-400" />
              <span className="text-sm text-zinc-300">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col rounded-xl border border-zinc-700 bg-zinc-800/20" style={{ height: "min(65dvh, 560px)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-sky-600" : "bg-zinc-700"}`}>
                  {msg.role === "user" ? <User size={16} className="text-white" /> : <Bot size={16} className="text-sky-400" />}
                </div>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-sky-600 text-white rounded-tr-sm" : "bg-zinc-800 text-zinc-200 rounded-tl-sm"}`}>
                  {msg.text.split("\n").map((line, j) => <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700"><Bot size={16} className="text-sky-400" /></div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3"><Loader2 size={16} className="animate-spin text-zinc-400" /><span className="text-sm text-zinc-400">InvestBot sedang memikirkan...</span></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-700 p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Tanya tentang saham, rasio, strategi, atau apa pun..."
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-[16px] text-white outline-none placeholder:text-zinc-500 focus:border-sky-500 sm:px-4 sm:py-3 sm:text-sm"
            />
            <button onClick={() => send()} disabled={loading || !input.trim()} className="flex h-[48px] shrink-0 items-center justify-center rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 sm:h-auto sm:px-5 sm:py-3"><Send size={18} /></button>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-[11px] leading-relaxed text-zinc-600 sm:flex-row sm:justify-between">
            <span>Ditenagai Google Gemini (free tier) · Diskusi bebas</span>
            <span className="hidden sm:inline">Disclaimer: Bukan saran investasi resmi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
