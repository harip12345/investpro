"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";

export function AIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "bot", text: "Halo! Saya **InvestBot** 🤖\n\nTanya apa saja — sebutkan ticker (mis. \"analisis BBCA\" atau \"bandingkan BBRI vs BMRI\") dan saya ambilkan data fundamental terbaru dari aplikasi. Bisa juga tanya konsep seperti DCF, ROE, atau strategi investasi." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-8) })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const errText = [data.error && `❌ ${data.error}`, data.details && `Detail: ${data.details}`, data.hint && `💡 ${data.hint}`].filter(Boolean).join("\n\n");
        setMessages((prev) => [...prev, { role: "bot", text: errText || "Terjadi error yang tidak diketahui." }]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "bot", text: `Error koneksi: ${(e as Error).message}` }]);
    }
    setLoading(false);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-end sm:justify-end sm:p-6">
          <button type="button" aria-label="Tutup chat" onClick={() => setOpen(false)} className="absolute inset-0 z-0 bg-black/40 sm:bg-black/20" />
          <div className="relative z-10 flex w-full flex-col border border-zinc-700 bg-zinc-900 shadow-2xl sm:max-w-sm sm:rounded-xl max-sm:rounded-t-[20px] max-sm:border-b-0" style={{ height: "min(78dvh, 560px)", maxHeight: "calc(100dvh - 12px)" }}>
            <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-sky-400" />
                <span className="font-semibold text-white">InvestBot</span>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white active:bg-zinc-800"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-sky-600" : "bg-zinc-700"}`}>
                      {msg.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-sky-400" />}
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-[15px] leading-relaxed sm:text-sm ${msg.role === "user" ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>
                      {msg.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700"><Bot size={14} className="text-sky-400" /></div>
                    <div className="rounded-xl bg-zinc-800 px-3 py-2"><Loader2 size={16} className="animate-spin text-zinc-400" /></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-zinc-700 p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:pb-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Tanya tentang saham..."
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-[16px] text-white outline-none placeholder:text-zinc-500 focus:border-sky-500 sm:rounded-lg sm:py-2 sm:text-sm"
                />
                <button onClick={send} disabled={loading || !input.trim()} className="flex h-[48px] shrink-0 items-center justify-center rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-500 disabled:opacity-50 sm:h-auto sm:rounded-lg sm:px-3 sm:py-2"><Send size={16} /></button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">Ditenagai Gemini (gratis) · Bukan saran investasi</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 active:bg-sky-700 ${open ? "bottom-4 right-4 max-sm:hidden sm:bottom-6 sm:right-6" : "bottom-4 right-4 sm:bottom-6 sm:right-6"}`}
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={open ? "Tutup chat" : "Buka chat"}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
