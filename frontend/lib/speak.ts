// Free, browser-native text-to-speech (Web Speech API) - same
// free-first-then-Groq-fallback philosophy as useVoiceInput.ts, except
// there's no paid TTS endpoint in this app to fall back to, so this is a
// no-op where the API isn't available rather than an error.
export function speak(text: string, onDone?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (onDone) {
    utterance.onend = onDone;
    utterance.onerror = onDone;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speechOutputSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
