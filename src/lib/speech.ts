// Voice guidance via the Web Speech API (offline on most devices).
const LANG_MAP: Record<string, string> = {
  English: "en-IN",
  "हिन्दी": "hi-IN",
  "தமிழ்": "ta-IN",
  "తెలుగు": "te-IN",
  "मराठी": "mr-IN",
  "বাংলা": "bn-IN",
};

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, language = "English"): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_MAP[language] ?? "en-IN";
  u.rate = 0.95;
  u.pitch = 1;
  const match = synth.getVoices().find((v) => v.lang === u.lang);
  if (match) u.voice = match;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
