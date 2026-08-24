"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";
import Input from "@/components/Input";
import Button from "@/components/Button";
import VoiceButton from "@/components/VoiceButton";

type Message = { role: "user" | "assistant"; content: string };

async function authFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}

export default function TutorChat({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  async function ask(question: string, history: Message[]) {
    setError(null);
    const nextMessages: Message[] = [
      ...history,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setAsking(true);

    try {
      const res = await authFetch(`/documents/${documentId}/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      const result = await res.json();
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.answer },
      ]);
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: () => ask(question, history),
      });
    } finally {
      setAsking(false);
    }
  }

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    ask(question, messages);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Ask the tutor</h2>
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[80%] self-end rounded-xl bg-brand px-3 py-2 text-brand-ink"
                : "max-w-[80%] self-start rounded-xl border border-line bg-surface px-3 py-2 text-ink"
            }
          >
            {m.content}
          </div>
        ))}
        {asking && <p className="text-sm text-ink-muted">Thinking...</p>}
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your material..."
          disabled={asking}
          className="flex-1"
        />
        <VoiceButton onText={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))} />
        <Button type="submit" disabled={asking || !input.trim()}>
          Ask
        </Button>
      </form>
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
