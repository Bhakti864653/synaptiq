"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Minimal shape of the non-standard SpeechRecognition API — not in TS's lib.dom by default.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function transcribeViaBackend(blob: Blob): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");

  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed (${res.status})`);
  }
  const result = await res.json();
  return result.text as string;
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");

  function start(onDone: (text: string) => void) {
    setError(null);
    transcriptRef.current = "";

    const RecognitionCtor = getSpeechRecognitionCtor();

    if (RecognitionCtor) {
      const recognition = new RecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        transcriptRef.current = Array.from(event.results as any[])
          .map((r: any) => r[0].transcript)
          .join(" ")
          .trim();
      };
      recognition.onerror = () => {
        setIsRecording(false);
        setError("Couldn't hear you — try again.");
      };
      recognition.onend = () => {
        setIsRecording(false);
        if (transcriptRef.current) onDone(transcriptRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    // Fallback for browsers without built-in speech recognition (e.g. iPad Safari):
    // record audio and send it to the backend for transcription.
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = async () => {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          setIsRecording(false);
          setIsTranscribing(true);
          try {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const text = await transcribeViaBackend(blob);
            if (text.trim()) onDone(text.trim());
          } catch {
            setError("Couldn't transcribe that — try again.");
          } finally {
            setIsTranscribing(false);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
      })
      .catch(() => {
        setError("Microphone access denied.");
      });
  }

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { start, stop, isRecording, isTranscribing, error };
}
