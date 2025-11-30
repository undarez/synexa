"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  className?: string;
}

export function VoiceInput({
  onTranscript,
  onError,
  language = "fr-FR",
  continuous = false,
  className = "",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    // Vérifier le support de Web Speech API
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          finalTranscriptRef.current = "";
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          finalTranscriptRef.current = finalTranscript.trim();

          // Si on a un résultat final et qu'on n'est pas en mode continu
          if (finalTranscript && !continuous) {
            onTranscript(finalTranscript.trim());
            setIsListening(false);
            recognition.stop();
          }
        };

        recognition.onerror = (event: any) => {
          let errorMessage = "Erreur de reconnaissance vocale";
          
          switch (event.error) {
            case "no-speech":
              errorMessage = "Aucune parole détectée. Réessayez.";
              break;
            case "audio-capture":
              errorMessage = "Microphone non disponible";
              break;
            case "not-allowed":
              errorMessage = "Permission microphone refusée";
              break;
            case "network":
              errorMessage = "Erreur réseau";
              break;
            case "aborted":
              // L'utilisateur a arrêté, ce n'est pas une erreur
              setIsListening(false);
              return;
            default:
              errorMessage = `Erreur: ${event.error}`;
          }

          setError(errorMessage);
          setIsListening(false);
          
          if (onError) {
            onError(errorMessage);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          
          // En mode continu, envoyer le transcript final
          if (continuous && finalTranscriptRef.current) {
            onTranscript(finalTranscriptRef.current);
            finalTranscriptRef.current = "";
          }
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
        setError("Reconnaissance vocale non supportée par ce navigateur");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, continuous, onTranscript, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError("Impossible de démarrer la reconnaissance vocale");
        if (onError) {
          onError("Impossible de démarrer la reconnaissance vocale");
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`text-sm text-zinc-500 ${className}`}>
        Reconnaissance vocale non supportée. Utilisez Chrome, Edge ou Safari.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        type="button"
        onClick={toggleListening}
        disabled={!isSupported}
        variant={isListening ? "default" : "outline"}
        className={`relative ${isListening ? "animate-pulse" : ""}`}
      >
        {isListening ? (
          <>
            <MicOff className="mr-2 h-4 w-4" />
            Arrêter
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Parler
          </>
        )}
      </Button>
      
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
          <span>Écoute en cours...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}



