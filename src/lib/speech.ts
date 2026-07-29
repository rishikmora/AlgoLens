"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Browser speech APIs — no vendor key required. Chromium has the widest support. */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Strips the markdown the interviewer text uses so it isn't read aloud literally. */
export function speakableText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  // Resolved after mount — checking `window` during render would desync hydration.
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Prefer a natural-sounding English voice; fall back to the first English one.
      voiceRef.current =
        voices.find((v) => /Google UK English Male|Google US English|Natural/i.test(v.name) && v.lang.startsWith("en")) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0];
      setVoiceReady(true);
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakableText(text));
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.02;
    u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onEnd?.(); };
    u.onerror = () => { setSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, supported, voiceReady };
}

export function useMicrophone(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  // Resolved after mount — checking `window` during render would desync hydration.
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(Boolean(getRecognitionCtor())); }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError("Speech recognition isn't available in this browser. Try Chrome or Edge."); return; }
    setError(null);

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const t = res[0].transcript.trim();
          if (t) finalRef.current(t);
        } else {
          live += res[0].transcript;
        }
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow it in your browser, or type your answer instead."
          : `Microphone error: ${e.error}`,
      );
      setListening(false);
    };
    rec.onend = () => { setListening(false); setInterim(""); };

    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { /* already started */ }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { start, stop, listening, interim, error, supported };
}
