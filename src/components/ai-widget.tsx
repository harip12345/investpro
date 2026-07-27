"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";

export function AIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "bot", text: "Halo! Saya **InvestBot**. Tanya apa pun tentang saham Indonesia!" }
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
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Error koneksi. Coba lagi." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
          <div className="pointer-events-auto flex w-full max-w-sm flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl" style={{ height: "480px" }}>
            <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-sky-400" />
                <span className="font-semibold text-white">InvestBot</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-sky-600" : "bg-zinc-700"}`}>
                      {msg.role === "user" ? <User size={14} className="text-white" /> : <Bot size={14} className="text-sky-400" />}
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === "user" ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-200"}`}>
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

            <div className="border-t border-zinc-700 p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Tanya tentang saham..."
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-sky-500"
                />
                <button onClick={send} disabled={loading || !input.trim()} className="flex items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-white hover:bg-sky-500 disabled:opacity-50"><Send size={16} /></button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-600">Ditenagai Gemini (gratis) · Bukan saran investasi</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition hover:bg-sky-500"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
