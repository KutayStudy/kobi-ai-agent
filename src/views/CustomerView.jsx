import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api/kobiApi.js";
import { Card, cx } from "../components/ui.jsx";

const STARTER_MESSAGES = [
  {
    role: "assistant",
    text: "Merhaba, sipariş numaranızı yazarsanız kargo ve sipariş durumunu sistem kayıtlarından kontrol edebilirim.",
    meta: { intent: "ready", orderId: null },
  },
];

export default function CustomerView() {
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [traceOpen, setTraceOpen] = useState({});
  const scrollerRef = useRef(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text }]);
    setPending(true);

    try {
      const response = await sendChatMessage(text);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.text,
          meta: response.meta,
          trace: response.trace,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `Sistem yanıtı alınamadı: ${error.message}`,
          meta: { intent: "error", orderId: null },
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-500 mb-1.5">Müşteri Asistanı</div>
        <h1 className="text-[28px] font-medium tracking-tight text-ink-900">Müşteri Asistanı</h1>
        <p className="text-[14px] text-ink-500 mt-1.5 max-w-xl">
          Müşteriler sipariş ve kargo durumunu yapay zeka destekli asistan ile sorgulayabilir. Asistan, ilgili sipariş
          kayıtlarını ve kargo durumunu eşleştirerek operasyonel bir yanıt üretir.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-accent-500" />
            <span className="text-[13px] text-ink-900 font-medium">Sipariş & Kargo Asistanı</span>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500">tr · canlı ajan</span>
        </div>

        <div ref={scrollerRef} className="px-5 py-5 space-y-4 max-h-[520px] overflow-y-auto bg-paper-soft">
          {messages.map((message, index) => (
            <Message
              key={`${message.role}-${index}`}
              msg={message}
              traceOpen={!!traceOpen[index]}
              onToggleTrace={() => setTraceOpen((current) => ({ ...current, [index]: !current[index] }))}
            />
          ))}
          {pending && <Typing />}
        </div>

        <div className="border-t border-ink-200 px-3 py-3 bg-paper">
          <div className="flex items-end gap-2">
            <textarea
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Sipariş numarası veya sorunuzu yazın..."
              className="flex-1 resize-none px-3 py-2.5 text-[14px] bg-transparent outline-none placeholder:text-ink-400 text-ink-900"
            />
            <button
              onClick={send}
              disabled={!input.trim() || pending}
              className="h-9 px-3.5 rounded-md bg-ink-900 text-paper text-[13px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-800 transition-colors inline-flex items-center gap-1.5"
            >
              Gönder
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 px-1 pt-2 flex-wrap">
            {["128 numaralı siparişim nerede?", "777 numaralı kargo ne durumda?", "Ne zaman teslim alırım?"].map((sample) => (
              <button
                key={sample}
                onClick={() => setInput(sample)}
                className="text-[11px] font-mono text-ink-500 hover:text-ink-900 border border-ink-200 hover:border-ink-300 rounded-md px-2 py-1 bg-paper transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <p className="text-[11px] font-mono uppercase tracking-wider text-ink-400 mt-4 text-center">
        Bağlı servis: POST /chat?message=
      </p>
    </div>
  );
}

function Message({ msg, traceOpen, onToggleTrace }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-ink-900 text-paper text-[14px] leading-relaxed">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-md bg-ink-900 text-paper grid place-items-center mt-0.5">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 13L6 7L9.5 10.5L14 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="14" cy="3" r="1.4" fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md bg-paper border border-ink-200 text-[14px] leading-relaxed text-ink-900">
          {msg.text}
        </div>
        {msg.meta && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-100 text-ink-700">
              <span className="text-ink-400">niyet</span>
              <span>{formatIntent(msg.meta.intent)}</span>
            </span>
            {msg.meta.orderId != null && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-100 text-ink-700">
                <span className="text-ink-400">sipariş</span>
                <span>#{msg.meta.orderId}</span>
              </span>
            )}
            {msg.trace && (
              <button
                onClick={onToggleTrace}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
              >
                <svg width="9" height="9" viewBox="0 0 12 12" className={cx("transition-transform", traceOpen && "rotate-90")} aria-hidden="true">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ajan izi
              </button>
            )}
          </div>
        )}
        {traceOpen && msg.trace && (
          <pre className="mt-2 px-3.5 py-3 rounded-lg bg-ink-900 text-paper/90 text-[11.5px] font-mono leading-relaxed overflow-x-auto">
            {Object.entries(msg.trace)
              .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
              .join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-md bg-ink-900 grid place-items-center mt-0.5" />
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-md bg-paper border border-ink-200 inline-flex items-center gap-1.5">
        <Dot delay="0s" />
        <Dot delay="0.15s" />
        <Dot delay="0.3s" />
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: delay }} />;
}

function formatIntent(intent) {
  const labels = {
    ready: "hazır",
    error: "hata",
    unknown: "bilinmiyor",
    track_order: "sipariş takibi",
    delivery_issue: "teslimat sorunu",
    inventory_check: "stok kontrolü",
    supplier_draft: "tedarik taslağı",
    dashboard_summary: "operasyon özeti",
    fallback: "genel yanıt",
  };

  return labels[intent] || intent || "bilinmiyor";
}
