"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface SynexaChatProps {
  className?: string;
}

export default function SynexaChat({ className = "" }: SynexaChatProps) {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialiser speechSynthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    // Scroll vers le bas quand de nouveaux messages arrivent
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function send() {
    if (!text.trim() || loading) return;

    const userMsg = text.trim();
    setHistory((h) => [...h, { role: "user", text: userMsg, timestamp: new Date() }]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/synexa/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          forTTS: ttsEnabled 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur de connexion");
      }

      const data = await res.json();

      if (data?.reply) {
        const assistantMsg: Message = {
          role: "assistant",
          text: data.reply,
          timestamp: new Date(),
        };
        setHistory((h) => [...h, assistantMsg]);

        // Lire la réponse avec TTS si activé
        if (ttsEnabled && speechSynthesisRef.current) {
          playText(data.reply);
        }
      } else {
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            text: "Désolée, je n'ai pas reçu de réponse. Peux-tu réessayer ?",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.error("[SynexaChat] Erreur:", e);
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Erreur de connexion.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function playText(textToPlay: string) {
    if (!speechSynthesisRef.current || !("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis non supporté");
      return;
    }

    // Arrêter toute lecture en cours
    speechSynthesisRef.current.cancel();

    const utter = new SpeechSynthesisUtterance(textToPlay);
    utter.lang = "fr-FR";
    utter.pitch = 1;
    utter.rate = 1;

    // Choisir une voix française si disponible
    const voices = speechSynthesisRef.current.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) {
      utter.voice = frVoice;
    }

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current.speak(utter);
  }

  function stopSpeaking() {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Synexa
            </CardTitle>
            <CardDescription>
              Ton assistante personnelle vocale et textuelle
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                setTtsEnabled(!ttsEnabled);
              }
            }}
            title={ttsEnabled ? "Désactiver la lecture vocale" : "Activer la lecture vocale"}
          >
            {isSpeaking ? (
              <VolumeX className="h-4 w-4" />
            ) : ttsEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Zone de messages */}
        <div className="h-60 overflow-auto mb-4 p-3 space-y-3 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))] text-sm text-center">
              <div>
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Demande à Synexa...</p>
                <p className="text-xs mt-1 opacity-75">
                  Je peux t'aider à organiser ta journée, répondre à tes questions, et bien plus encore.
                </p>
              </div>
            </div>
          ) : (
            history.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    m.role === "user"
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {m.timestamp.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {m.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center">
                    <User className="h-4 w-4 text-[hsl(var(--accent-foreground))]" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                <Bot className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
              </div>
              <div className="bg-[hsl(var(--muted))] p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Demande à Synexa..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={send}
            disabled={loading || !text.trim()}
            size="default"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

