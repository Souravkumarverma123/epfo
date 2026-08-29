"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "~/trpc/client";
import { COLOR } from "~/design/tokens";
import { useLang } from "~/design/lang";

/**
 * Floating AI Assistant, mounted once in SiteShell so it's on every page.
 * Real OpenAI call (packages/application/services/assistant-service.ts),
 * tool-calling into the same services the rest of the app uses — nothing
 * here is scripted or canned. See that file's own comment for the "reads,
 * never decides" boundary this widget's backend enforces.
 *
 * Chat history is kept in component state only — refreshing the page
 * starts a new conversation. No server-side persistence is claimed.
 */
interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistant() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = trpc.assistant.chat.useMutation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  function send() {
    const text = draft.trim();
    if (!text || chat.isPending) return;
    const history = messages;
    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    chat.mutate(
      { message: text, history, lang },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                lang === "hi"
                  ? `कुछ गड़बड़ हुई: ${err.message}`
                  : `Something went wrong: ${err.message}`,
            },
          ]);
        },
      },
    );
  }

  return (
    <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {open && (
        <div
          style={{
            width: 360,
            maxWidth: "calc(100vw - 48px)",
            height: 480,
            maxHeight: "calc(100vh - 140px)",
            background: COLOR.white,
            border: `2px solid ${COLOR.ink}`,
            boxShadow: "0 8px 0 0 rgba(26,24,21,0.15)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: `2px solid ${COLOR.ink}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                {lang === "hi" ? "AI सहायक" : "AI Assistant"}
              </p>
              <p style={{ fontSize: 12, color: COLOR.muted, margin: 0 }}>
                {lang === "hi" ? "OpenAI द्वारा संचालित" : "Powered by OpenAI"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={lang === "hi" ? "बंद करें" : "Close"}
              style={{ background: "none", border: 0, fontSize: 20, cursor: "pointer", color: COLOR.muted, lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <p style={{ fontSize: 14, color: COLOR.muted, lineHeight: 1.5, margin: 0 }}>
                {lang === "hi"
                  ? "अटके हुए हैं या कुछ ढूँढ रहे हैं? पूछें — साइन इन होने पर मैं आपका असली बैलेंस या दावा स्थिति देख सकता हूँ।"
                  : "Stuck, or looking for something? Ask me — when you're signed in I can look up your real balance or claim status."}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: m.role === "user" ? COLOR.accent : COLOR.panel,
                  color: m.role === "user" ? COLOR.white : COLOR.ink,
                  padding: "8px 12px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {chat.isPending && (
              <div style={{ alignSelf: "flex-start", color: COLOR.muted, fontSize: 14 }}>
                {lang === "hi" ? "सोच रहा हूँ…" : "Thinking…"}
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: `2px solid ${COLOR.ink}`, display: "flex", gap: 8 }}>
            <input
              aria-label={lang === "hi" ? "अपना सवाल लिखें" : "Type your question"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder={lang === "hi" ? "अपना सवाल लिखें…" : "Type your question…"}
              style={{
                flex: 1,
                border: `2px solid ${COLOR.border}`,
                padding: "8px 10px",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                color: COLOR.ink,
                background: COLOR.white,
              }}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || chat.isPending}
              style={{
                background: COLOR.accent,
                color: COLOR.white,
                border: 0,
                padding: "0 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: draft.trim() && !chat.isPending ? "pointer" : "not-allowed",
                opacity: draft.trim() && !chat.isPending ? 1 : 0.5,
              }}
            >
              {lang === "hi" ? "भेजें" : "Send"}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: COLOR.ink,
          color: COLOR.white,
          border: 0,
          borderRadius: 999,
          padding: "14px 20px",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 0 0 rgba(26,24,21,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden>✨</span>
        {open ? (lang === "hi" ? "बंद करें" : "Close") : lang === "hi" ? "सहायता चाहिए?" : "Need help?"}
      </button>
    </div>
  );
}
