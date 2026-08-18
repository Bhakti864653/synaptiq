"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import ErrorMessage from "@/components/ErrorMessage";

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
      <h2 className="font-semibold">Ask the tutor</h2>
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end rounded bg-black px-3 py-2 text-white max-w-[80%]"
                : "self-start rounded border px-3 py-2 max-w-[80%]"
            }
          >
            {m.content}
          </div>
        ))}
        {asking && <p className="text-sm text-gray-500">Thinking...</p>}
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your material..."
          disabled={asking}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Ask
        </button>
      </form>
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </div>
  );
}
