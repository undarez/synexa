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
 */
function prepareTextForTTS(text: string): string {
  // Import dynamique pour éviter les dépendances circulaires
  // Le formatage sera fait côté serveur, mais on peut aussi nettoyer ici
  return text
    .replace(/\n{2,}/g, ". ") // Remplacer les sauts de ligne multiples
    .replace(/\s{2,}/g, " ")   // Remplacer les espaces multiples
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
  
  // Sélectionner la meilleure voix française
  if (voices.length > 0) {
    // Préférer les voix féminines françaises (souvent plus naturelles)
    const preferredVoice = voices.find((v) => 
      v.name.includes("French") && (v.name.includes("Female") || v.name.includes("france"))
    ) || voices.find((v) => v.name.includes("French")) || voices[0];
    
    utterance.voice = preferredVoice;
  } else {
    // Fallback : utiliser la langue française
    utterance.lang = options.lang || "fr-FR";
  }

  // Configuration de la voix
  utterance.pitch = options.pitch ?? 1.0;
  utterance.rate = options.rate ?? 1.0;
  utterance.volume = options.volume ?? 1.0;

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


