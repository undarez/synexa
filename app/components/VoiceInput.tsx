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
        recognition.maxAlternatives = 1; // Améliorer la précision

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
              errorMessage = "Aucune parole détectée. Parlez plus fort ou vérifiez votre microphone.";
              break;
            case "audio-capture":
              errorMessage = "Microphone non disponible. Vérifiez que votre microphone est connecté et autorisé.";
              break;
            case "not-allowed":
              errorMessage = "Permission microphone refusée. Cliquez sur l'icône de cadenas dans la barre d'adresse et autorisez le microphone.";
              break;
            case "network":
              errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
              break;
            case "service-not-allowed":
              errorMessage = "Service de reconnaissance vocale non autorisé. Vérifiez les paramètres du navigateur.";
              break;
            case "bad-grammar":
              errorMessage = "Erreur de grammaire. Réessayez.";
              break;
            case "language-not-supported":
              errorMessage = "Langue non supportée. Le français devrait être supporté.";
              break;
            case "aborted":
              // L'utilisateur a arrêté, ce n'est pas une erreur
              setIsListening(false);
              return;
            default:
              errorMessage = `Erreur: ${event.error}. Vérifiez que votre microphone fonctionne et que les permissions sont accordées.`;
          }

          console.error("[VoiceInput] Erreur reconnaissance vocale:", event.error, event);
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

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      try {
        // Demander explicitement les permissions du microphone d'abord
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            // Demander l'accès au microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Arrêter le stream immédiatement, on a juste besoin de la permission
            stream.getTracks().forEach(track => track.stop());
          } catch (mediaError: any) {
            if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
              setError("Permission microphone refusée. Veuillez autoriser l'accès au microphone dans les paramètres du navigateur.");
              if (onError) {
                onError("Permission microphone refusée");
              }
              return;
            } else if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
              setError("Aucun microphone détecté. Vérifiez que votre microphone est connecté.");
              if (onError) {
                onError("Microphone non disponible");
              }
              return;
            } else {
              console.warn("Erreur permission microphone:", mediaError);
              // Continuer quand même, peut-être que SpeechRecognition fonctionnera
            }
          }
        }
        
        // Démarrer la reconnaissance vocale
        recognitionRef.current.start();
      } catch (err: any) {
        console.error("Erreur démarrage reconnaissance vocale:", err);
        let errorMsg = "Impossible de démarrer la reconnaissance vocale";
        
        if (err.message?.includes("already started") || err.message?.includes("déjà démarré")) {
          errorMsg = "La reconnaissance vocale est déjà en cours";
        } else if (err.message?.includes("not-allowed") || err.message?.includes("refusé")) {
          errorMsg = "Permission microphone refusée. Veuillez autoriser l'accès au microphone.";
        }
        
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
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
      <div className={`space-y-2 ${className}`}>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
            ⚠️ Reconnaissance vocale non supportée
          </p>
          <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
            Utilisez Chrome, Edge ou Safari pour la reconnaissance vocale. Firefox ne supporte pas Web Speech API.
          </p>
        </div>
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
          <span>Écoute en cours... Parlez maintenant</span>
        </div>
      )}

      {!isListening && !error && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Cliquez sur "Parler" et autorisez l'accès au microphone si demandé
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            ⚠️ {error}
          </p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
            Astuce : Cliquez sur l'icône de cadenas dans la barre d'adresse → Autoriser le microphone
          </p>
        </div>
      )}
    </div>
  );
}








