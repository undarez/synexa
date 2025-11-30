"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Mic, MicOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { speakText } from "@/app/lib/services/tts";
import { ConversationSphere } from "./ConversationSphere";
import { VoiceInput } from "./VoiceInput";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = "" }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useVoiceInput, setUseVoiceInput] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          forTTS: true, // Toujours optimiser pour la TTS dans ChatInterface
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Si le message a été bloqué
        if (errorData.blocked) {
          setError(errorData.error || "Message non autorisé");
          const errorMessage: Message = {
            role: "assistant",
            content: "Je ne peux pas répondre à ce type de demande. Peux-tu reformuler ta question ? Je serai ravie de t'aider autrement.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }
        
        throw new Error(errorData.error || "Erreur lors de la conversation");
      }

      const result = await response.json();
      const aiResponse = result.response || result.aiResponse || "";

      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError(null);

      // Réponse vocale avec voix authentique
      setIsSpeaking(true);
      await speakText(aiResponse, {
        lang: "fr-FR",
        rate: 0.9,
        pitch: 1.0,
      });
      setIsSpeaking(false);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error ? error.message : "Une erreur est survenue",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = async (text: string) => {
    if (!text.trim()) return;

    // Mettre à jour l'input avec le texte transcrit
    setInput(text);
    
    // Envoyer automatiquement le message
    const userMessage: Message = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          forTTS: true, // Toujours optimiser pour la TTS dans ChatInterface
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.blocked) {
          setError(errorData.error || "Message non autorisé");
          const errorMessage: Message = {
            role: "assistant",
            content: "Je ne peux pas répondre à ce type de demande. Peux-tu reformuler ta question ? Je serai ravie de t'aider autrement.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }
        
        throw new Error(errorData.error || "Erreur lors de la conversation");
      }

      const result = await response.json();
      const aiResponse = result.response || result.aiResponse || "";

      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError(null);

      // Réponse vocale avec voix authentique
      setIsSpeaking(true);
      await speakText(aiResponse, {
        lang: "fr-FR",
        rate: 0.9,
        pitch: 1.0,
      });
      setIsSpeaking(false);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error ? error.message : "Une erreur est survenue",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Conversation avec Synexa
        </CardTitle>
        <CardDescription>
          Votre assistante personnelle intelligente. Posez des questions, recherchez des informations, créez des tâches, consultez la météo, et bien plus encore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sphère animée avec ondes vocales */}
        <div className="flex justify-center py-4">
          <ConversationSphere isSpeaking={isSpeaking} />
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {/* Messages */}
        <div className="h-96 space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-zinc-500">
              <div>
                <Bot className="mx-auto h-12 w-12 text-zinc-400" />
                <p className="mt-4 text-sm font-medium">
                  Commencez une conversation avec Synexa
                </p>
                <div className="mt-4 space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <p className="font-semibold text-[hsl(var(--foreground))]">Exemples de questions :</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>"Quel est le prix d'un iPhone ?"</li>
                    <li>"Trouve-moi un restaurant à Paris"</li>
                    <li>"Quelle est la météo aujourd'hui ?"</li>
                    <li>"Crée une tâche : faire les courses"</li>
                    <li>"Quelles sont les actualités en technologie ?"</li>
                    <li>"Explique-moi comment fonctionne..."</li>
                  </ul>
                  <p className="mt-3 text-[hsl(var(--muted-foreground))]">
                    💡 <strong>Astuce :</strong> Utilisez le bouton micro pour parler à Synexa !
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="rounded-lg bg-white px-4 py-2 dark:bg-zinc-800">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="space-y-2">
          {useVoiceInput ? (
            <div className="space-y-2">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onError={(error) => {
                  setError(error);
                }}
                language="fr-FR"
                continuous={false}
                className="w-full"
              />
              <Button
                variant="outline"
                onClick={() => setUseVoiceInput(false)}
                className="w-full"
              >
                <MicOff className="mr-2 h-4 w-4" />
                Passer à la saisie texte
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Parlez à Synexa... (ex: 'Quel est le prix d'un iPhone ?')"
                disabled={loading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setUseVoiceInput(true)}
                disabled={loading}
                title="Saisie vocale"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

