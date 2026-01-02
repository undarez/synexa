/**
 * Service Text-to-Speech amélioré
 * Utilise Web Speech API avec voix française
 */

export interface TTSOptions {
  voice?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  lang?: string;
}

/**
 * Liste des voix françaises disponibles
 */
export function getFrenchVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices().filter((voice) => {
    return voice.lang.startsWith("fr") || voice.lang.includes("French");
  });
}

/**
 * Formate le texte pour la synthèse vocale avant de le lire
 * Version améliorée pour une voix plus fluide et humaine
 */
function prepareTextForTTS(text: string): string {
  return text
    // Ajouter des pauses naturelles après la ponctuation
    .replace(/\.\s*/g, ".  ") // Pause plus longue après les points (respiration)
    .replace(/\?\s*/g, " ?  ") // Pause après les questions
    .replace(/!\s*/g, " !  ") // Pause après les exclamations
    .replace(/,\s*/g, ", ") // Pause naturelle après les virgules
    .replace(/;\s*/g, "; ") // Pause après les points-virgules
    .replace(/:\s*/g, ": ") // Pause après les deux-points
    
    // Ajouter des pauses pour la respiration dans les phrases longues
    .replace(/([a-zéèêëàâäôöîïùûüç])\s+([A-ZÉÈÊËÀÂÄÔÖÎÏÙÛÜÇ])/g, "$1. $2")
    
    // Ajouter des pauses naturelles après certains mots de liaison
    .replace(/\b(mais|donc|alors|puis|ensuite|cependant|toutefois)\b/gi, " $1 ")
    
    // Remplacer les sauts de ligne multiples par des pauses
    .replace(/\n{2,}/g, ".  ")
    .replace(/\n/g, ". ")
    
    // Nettoyer les espaces multiples mais garder les doubles espaces (pauses)
    .replace(/\s{3,}/g, "  ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parle un texte avec une voix française authentique
 * Le texte est automatiquement formaté pour la TTS
 */
export async function speakText(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  // Formater le texte pour la TTS
  const formattedText = prepareTextForTTS(text);
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("SpeechSynthesis non disponible");
    return;
  }

  return new Promise((resolve, reject) => {
    // Attendre que les voix soient chargées
    const voices = getFrenchVoices();
    
    if (voices.length === 0) {
      // Si les voix ne sont pas encore chargées, attendre
      window.speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = getFrenchVoices();
        if (loadedVoices.length > 0) {
          speakWithVoice(formattedText, loadedVoices, options, resolve, reject);
        } else {
          // Fallback avec la langue française
          speakWithVoice(formattedText, [], options, resolve, reject);
        }
      };
      
      // Forcer le chargement des voix
      window.speechSynthesis.getVoices();
    } else {
      speakWithVoice(formattedText, voices, options, resolve, reject);
    }
  });
}

function speakWithVoice(
  text: string,
  voices: SpeechSynthesisVoice[],
  options: TTSOptions,
  resolve: () => void,
  reject: (error: Error) => void
) {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Sélectionner Microsoft Julie en priorité absolue (EXCLURE Hortense)
  if (voices.length > 0) {
    // TOUJOURS chercher Microsoft Julie en premier, EXCLURE explicitement Hortense
    const microsoftJulie = voices.find((v) => {
      const nameLower = v.name.toLowerCase();
      const langMatch = v.lang.startsWith("fr") || v.lang.includes("French");
      // Chercher "julie" mais EXCLURE "hortense"
      return nameLower.includes("julie") && !nameLower.includes("hortense") && langMatch;
    });
    
    if (microsoftJulie) {
      utterance.voice = microsoftJulie;
      console.log("[TTS Service] ✅ Microsoft Julie sélectionnée:", microsoftJulie.name);
    } else {
      // Fallback : chercher d'autres voix Microsoft françaises (mais PAS Hortense)
      const microsoftVoice = voices.find((v) => {
        const nameLower = v.name.toLowerCase();
        return v.name.includes("Microsoft") &&
               !nameLower.includes("hortense") &&
               (v.lang.startsWith("fr") || v.lang.includes("French"));
      }) || voices.find((v) => {
        const nameLower = v.name.toLowerCase();
        return v.name.includes("French") && !nameLower.includes("hortense");
      }) || voices.find((v) => {
        const nameLower = v.name.toLowerCase();
        return !nameLower.includes("hortense") && (v.lang.startsWith("fr") || v.lang.includes("French"));
      }) || voices[0];
      
      utterance.voice = microsoftVoice;
      if (microsoftVoice) {
        console.log("[TTS Service] ⚠️ Microsoft Julie non trouvée, fallback:", microsoftVoice.name);
      }
    }
  } else {
    // Fallback : utiliser la langue française
    utterance.lang = options.lang || "fr-FR";
  }

  // Configuration ULTRA-OPTIMISÉE pour Microsoft Julie (voix fluide et humaine)
  utterance.rate = options.rate ?? 0.82; // Plus lent = rythme de conversation naturel, fluide
  utterance.pitch = options.pitch ?? 0.95; // Légèrement plus grave = chaleureux, évite le robotique
  utterance.volume = options.volume ?? 0.92; // Volume doux = agréable, moins agressif

  // Gestion des événements
  utterance.onend = () => {
    resolve();
  };

  utterance.onerror = (event) => {
    reject(new Error(`Erreur TTS: ${event.error}`));
  };

  // Parler
  window.speechSynthesis.speak(utterance);
}

/**
 * Arrête la synthèse vocale en cours
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Vérifie si la synthèse vocale est disponible
 */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}


