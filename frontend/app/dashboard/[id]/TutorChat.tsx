"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { friendlyErrorMessage } from "@/lib/friendlyError";
import { speak, stopSpeaking, speechOutputSupported } from "@/lib/speak";
import ErrorMessage from "@/components/ErrorMessage";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Card from "@/components/Card";
import VoiceButton from "@/components/VoiceButton";

type Message = { role: "user" | "assistant"; content: string };

export default function TutorChat({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(
    null,
  );

  // Checked post-mount, not during render - `window` exists as soon as this
  // client component's function runs in the browser, but not during SSR,
  // so branching the render on it directly would mismatch the server HTML.
  useEffect(() => {
    setCanSpeak(speechOutputSupported());
  }, []);

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
      if (voiceMode) {
        setSpeaking(true);
        speak(result.answer, () => setSpeaking(false));
      }
    } catch (e) {
      setError({
        message: friendlyErrorMessage(e),
        retry: () => ask(question, history),
      });
    } finally {
      setAsking(false);
    }
  }

  function toggleVoiceMode() {
    setVoiceMode((prev) => {
      if (prev) {
        stopSpeaking();
        setSpeaking(false);
      }
      return !prev;
    });
  }

  function handleVoiceText(text: string) {
    if (voiceMode) {
      ask(text, messages);
    } else {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Ask the tutor</h2>
        {canSpeak && (
          <Button
            type="button"
            variant={voiceMode ? "primary" : "secondary"}
            onClick={toggleVoiceMode}
            className="w-fit"
          >
            {voiceMode ? "Voice mode: on" : "Voice mode: off"}
          </Button>
        )}
      </div>
      {voiceMode && (
        <p className="text-xs text-ink-muted">
          Tap the mic and just talk - your question is sent as soon as you
          stop speaking, and the tutor's answer is read back to you.
        </p>
      )}
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
        {speaking && (
          <div className="flex items-center gap-2 self-start text-sm text-ink-muted">
            Speaking...
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                stopSpeaking();
                setSpeaking(false);
              }}
              className="w-fit px-0"
            >
              Stop
            </Button>
          </div>
        )}
      </div>
      <form onSubmit={handleAsk} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            voiceMode
              ? "Or type here..."
              : "Ask a question about your material..."
          }
          disabled={asking}
          className="flex-1"
        />
        <VoiceButton onText={handleVoiceText} />
        <Button type="submit" disabled={asking || !input.trim()}>
          Ask
        </Button>
      </form>
      {error && <ErrorMessage message={error.message} onRetry={error.retry} />}
    </Card>
  );
}
