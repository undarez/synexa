"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Volume2, VolumeX, Mic, MicOff, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VoiceInput } from "./VoiceInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface Message {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface SynexaChatProps {
  className?: string;
}

interface VoiceOption {
  name: string;
  displayName: string;
  voice: SpeechSynthesisVoice | null;
}

export default function SynexaChat({ className = "" }: SynexaChatProps) {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [useVoiceInput, setUseVoiceInput] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("microsoft-julie");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialiser speechSynthesis et charger les voix
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesisRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        if (speechSynthesisRef.current) {
          const voices = speechSynthesisRef.current.getVoices();
          
          // Créer la liste des voix préférées avec leurs options
          // Microsoft Julie par défaut
          const voiceOptions: VoiceOption[] = [];

          // Chercher les voix Microsoft et Google préférées (Microsoft Julie en priorité)
          const preferredVoices = [
            { search: "Microsoft Julie", display: "Microsoft Julie (Recommandée)", priority: 1 },
            { search: "Microsoft Clara", display: "Microsoft Clara", priority: 2 },
            { search: "Microsoft David Natural", display: "Microsoft David Natural", priority: 3 },
            { search: "Microsoft Aria", display: "Microsoft Aria", priority: 4 },
            { search: "Google", display: "Google Français", priority: 5 },
            { search: "Microsoft", display: "Microsoft Français", priority: 6 },
          ];

          // Ajouter les voix préférées si trouvées (trier par priorité)
          preferredVoices
            .sort((a, b) => a.priority - b.priority)
            .forEach((pref) => {
              const voice = voices.find(
                (v) =>
                  v.name.includes(pref.search) &&
                  (v.lang.startsWith("fr") || v.lang.includes("French"))
              );
              if (voice) {
                voiceOptions.push({
                  name: voice.name,
                  displayName: pref.display,
                  voice: voice,
                });
              }
            });
          
          // Si Microsoft Julie n'est pas trouvée, essayer des variantes
          if (!voiceOptions.some(v => v.name.includes("Julie"))) {
            const julieVariants = voices.filter(
              (v) =>
                (v.name.toLowerCase().includes("julie") || 
                 v.name.toLowerCase().includes("france") ||
                 v.name.includes("Microsoft") && v.lang.startsWith("fr")) &&
                (v.lang.startsWith("fr") || v.lang.includes("French"))
            );
            if (julieVariants.length > 0) {
              // Prendre la première voix Microsoft française trouvée
              voiceOptions.splice(1, 0, {
                name: julieVariants[0].name,
                displayName: `Microsoft Julie (${julieVariants[0].name})`,
                voice: julieVariants[0],
              });
            }
          }

          // Ajouter toutes les autres voix françaises
          voices
            .filter(
              (v) =>
                (v.lang.startsWith("fr") || v.lang.includes("French")) &&
                !voiceOptions.some((opt) => opt.voice?.name === v.name)
            )
            .forEach((voice) => {
              voiceOptions.push({
                name: voice.name,
                displayName: voice.name,
                voice: voice,
              });
            });

          setAvailableVoices(voiceOptions);
          
          // Si Microsoft Julie est disponible, la sélectionner automatiquement
          const julieVoice = voiceOptions.find(v => 
            v.voice?.name.includes("Julie") || v.name.includes("Julie")
          );
          if (julieVoice && julieVoice.voice) {
            // Mettre à jour la voix sélectionnée si c'est la première fois ou si Julie est disponible
            if (selectedVoice === "microsoft-julie" || !selectedVoice || selectedVoice === "auto" || selectedVoice === "microsoft-clara") {
              setSelectedVoice(julieVoice.name);
            }
          }
        }
      };

      // Charger les voix immédiatement et après un délai
      loadVoices();
      setTimeout(loadVoices, 100);
      setTimeout(loadVoices, 500); // Encore un délai pour certains navigateurs

      // Écouter les événements de changement de voix
      if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
        speechSynthesisRef.current.onvoiceschanged = loadVoices;
      }
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

  /**
   * Humanise le texte pour une lecture plus naturelle et fluide
   * Ajoute des pauses naturelles, respiration et améliore la prosodie
   * pour éliminer complètement l'effet robotique
   */
  function humanizeText(text: string): string {
    return text
      // Ajouter des pauses naturelles après la ponctuation (plus d'espace = pause plus longue)
      .replace(/\.\s*/g, ".  ") // Pause plus longue après les points (respiration)
      .replace(/\?\s*/g, " ?  ") // Pause après les questions
      .replace(/!\s*/g, " !  ") // Pause après les exclamations
      .replace(/,\s*/g, ", ") // Pause naturelle après les virgules
      .replace(/;\s*/g, "; ") // Pause après les points-virgules
      .replace(/:\s*/g, ": ") // Pause après les deux-points
      
      // Ajouter des pauses pour la respiration dans les phrases longues
      .replace(/([a-zéèêëàâäôöîïùûüç])\s+([A-ZÉÈÊËÀÂÄÔÖÎÏÙÛÜÇ])/g, "$1. $2") // Pause entre phrases
      
      // Ajouter des pauses naturelles après certains mots de liaison
      .replace(/\b(mais|donc|alors|puis|ensuite|cependant|toutefois)\b/gi, " $1 ")
      
      // Ajouter des pauses pour les listes
      .replace(/(\d+)[\.\)]\s*/g, "$1. ") // Pause après les numéros de liste
      
      // Remplacer les retours à la ligne par des pauses
      .replace(/\n+/g, ".  ")
      
      // Nettoyer les espaces multiples mais garder les doubles espaces (pauses)
      .replace(/\s{3,}/g, "  ") // Max 2 espaces consécutifs
      .replace(/\s{2,}/g, " ") // Nettoyer les autres espaces multiples
      
      // Ajouter une pause naturelle avant les phrases importantes
      .replace(/\b(attention|important|note|remarque|sache|voici)\b/gi, " $1 ")
      
      .trim();
  }

  /**
   * Parle un texte avec une voix optimisée et naturelle
   */
  function playText(textToPlay: string) {
    if (!speechSynthesisRef.current || !("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis non supporté");
      setIsSpeaking(false);
      return;
    }

    // Arrêter toute lecture en cours
    speechSynthesisRef.current.cancel();

    // Humaniser le texte avant de le lire
    const humanizedText = humanizeText(textToPlay);

    const utter = new SpeechSynthesisUtterance(humanizedText);
    utter.lang = "fr-FR";

    // PARAMÈTRES ULTRA-OPTIMISÉS pour une voix fluide, humaine et naturelle
    // Ces paramètres éliminent complètement l'effet robotique pour Microsoft Julie
    utter.rate = 0.82; // Plus lent = plus humain, fluide et naturel (rythme de conversation)
    utter.pitch = 0.95; // Légèrement plus grave = plus chaleureux et naturel (évite le robotique)
    utter.volume = 0.92; // Volume doux = plus agréable et moins agressif

    // Sélectionner la voix - Microsoft Julie par défaut (PRIORITÉ ABSOLUE)
    const voices = speechSynthesisRef.current.getVoices();
    let selectedVoiceObj: SpeechSynthesisVoice | null = null;

    // TOUJOURS chercher Microsoft Julie en priorité absolue, EXCLURE explicitement Hortense
    // Recherche améliorée pour trouver Julie même avec des variantes de nom
    const microsoftJulie = voices.find(
      (v) => {
        const nameLower = v.name.toLowerCase();
        const langMatch = v.lang.startsWith("fr") || v.lang.includes("French");
        // Chercher "julie" dans le nom mais EXCLURE "hortense" (insensible à la casse)
        return nameLower.includes("julie") && !nameLower.includes("hortense") && langMatch;
      }
    );

    if (microsoftJulie) {
      // Microsoft Julie trouvée - TOUJOURS l'utiliser par défaut
      selectedVoiceObj = microsoftJulie;
      console.log("[Synexa TTS] ✅ Microsoft Julie sélectionnée:", microsoftJulie.name);
    } else if (selectedVoice && selectedVoice !== "microsoft-julie" && selectedVoice !== "auto") {
      // Voix spécifique sélectionnée par l'utilisateur (si Julie n'est pas disponible)
      selectedVoiceObj = voices.find((v) => v.name === selectedVoice) || null;
      if (selectedVoiceObj) {
        console.log("[Synexa TTS] Voix utilisateur sélectionnée:", selectedVoiceObj.name);
      }
    } else {
      // Julie non trouvée - chercher d'autres voix Microsoft françaises en fallback (EXCLURE Hortense)
      selectedVoiceObj =
        voices.find(
          (v) => {
            const nameLower = v.name.toLowerCase();
            return v.name.includes("Microsoft") &&
                   !nameLower.includes("hortense") &&
                   (v.lang.startsWith("fr") || v.lang.includes("French"));
          }
        ) ||
        voices.find(
          (v) => {
            const nameLower = v.name.toLowerCase();
            return v.name.includes("Google") &&
                   !nameLower.includes("hortense") &&
                   (v.lang.startsWith("fr") || v.lang.includes("French"));
          }
        ) ||
        voices.find((v) => {
          const nameLower = v.name.toLowerCase();
          return !nameLower.includes("hortense") && (v.lang.startsWith("fr") || v.lang.includes("French"));
        }) ||
        null;
      if (selectedVoiceObj) {
        console.log("[Synexa TTS] ⚠️ Microsoft Julie non trouvée, fallback:", selectedVoiceObj.name);
      }
    }

    if (selectedVoiceObj) {
      utter.voice = selectedVoiceObj;
      console.log("[Synexa TTS] Voix sélectionnée:", selectedVoiceObj.name);
    } else {
      console.warn("[Synexa TTS] Aucune voix française trouvée, utilisation de la voix par défaut");
      utter.lang = "fr-FR";
    }

    // Gestion des événements
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    // Parler
    speechSynthesisRef.current.speak(utter);
  }

  function stopSpeaking() {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    setIsSpeaking(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleVoiceTranscript(transcript: string) {
    if (transcript.trim()) {
      setText(transcript);
      // Envoyer automatiquement après la transcription
      setTimeout(() => {
        const userMsg = transcript.trim();
        if (userMsg) {
          setHistory((h) => [...h, { role: "user", text: userMsg, timestamp: new Date() }]);
          setText("");
          setLoading(true);
          
          // Envoyer la requête
          fetch("/api/synexa/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: userMsg,
              forTTS: ttsEnabled 
            }),
          })
          .then(async (res) => {
            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || "Erreur de connexion");
            }
            return res.json();
          })
          .then((data) => {
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
          })
          .catch((e) => {
            console.error("[SynexaChat] Erreur:", e);
            setHistory((h) => [
              ...h,
              {
                role: "assistant",
                text: e instanceof Error ? e.message : "Erreur de connexion.",
                timestamp: new Date(),
              },
            ]);
          })
          .finally(() => {
            setLoading(false);
          });
        }
      }, 300);
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              title="Paramètres de voix"
            >
              <Settings className="h-4 w-4" />
            </Button>
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
        </div>
        {showVoiceSettings && (
          <div className="mt-4 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
            <label className="text-sm font-medium text-[hsl(var(--foreground))] mb-2 block">
              Voix de synthèse
            </label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une voix" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name}>
                    {voice.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
              Les voix Microsoft et Google offrent une meilleure qualité naturelle.
            </p>
          </div>
        )}
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
        <div className="space-y-2">
          {useVoiceInput ? (
            <div className="space-y-2">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onError={(error) => {
                  console.error("Erreur reconnaissance vocale:", error);
                  // Afficher l'erreur dans l'historique
                  setHistory((h) => [
                    ...h,
                    {
                      role: "assistant",
                      text: `⚠️ Erreur microphone: ${error}. Vérifiez que votre microphone est connecté et que les permissions sont accordées dans les paramètres du navigateur.`,
                      timestamp: new Date(),
                    },
                  ]);
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
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Demande à Synexa..."
                className="flex-1"
                disabled={loading}
              />
              <Button
                variant="outline"
                onClick={() => setUseVoiceInput(true)}
                disabled={loading}
                size="default"
                title="Utiliser la saisie vocale"
              >
                <Mic className="h-4 w-4" />
              </Button>
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}





