import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import Groq from "groq-sdk";
import { getSynexaSystemPromptWithContext } from "@/app/lib/ai/synexa-system-prompt";
import { getUserContextForSynexa } from "@/app/lib/ai/conversation";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/**
 * POST /api/synexa/ask
 * Endpoint sécurisé pour poser des questions à Synexa
 * 
 * Body: { message: string, forTTS?: boolean }
 * Response: { reply: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Le champ 'message' est requis" },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    const forTTS = body.forTTS === true;

    if (!message) {
      return NextResponse.json(
        { error: "Le message ne peut pas être vide" },
        { status: 400 }
      );
    }

    // Si Groq n'est pas configuré, retourner une réponse de fallback
    if (!groq) {
      return NextResponse.json({
        reply: "Désolée, je ne peux pas répondre pour le moment. Configure GROQ_API_KEY dans votre .env pour activer les réponses intelligentes.",
      });
    }

    // Récupérer le contexte utilisateur pour enrichir les réponses
    const userContext = await getUserContextForSynexa(user.id);

    // Générer le prompt système avec contexte
    const systemPrompt = getSynexaSystemPromptWithContext(
      {
        userHabits: userContext.userHabits,
        userPreferences: userContext.userPreferences,
        recentActivity: userContext.recentActivity,
      },
      forTTS
    );

    // Construire les messages pour l'IA
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];

    // Appeler Groq
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const maxTokens = forTTS ? 400 : 600; // Moins de tokens pour TTS

    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: model,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const reply = completion.choices[0]?.message?.content || 
      "Désolée, je n'ai pas pu générer de réponse. Peux-tu reformuler ta question ?";

    // Retourner uniquement la réponse texte (sécurité : pas d'écriture en base)
    return NextResponse.json({ reply });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    console.error("[Synexa Ask] Erreur:", error);
    
    return NextResponse.json(
      { 
        error: "Erreur lors de la génération de la réponse",
        reply: "Désolée, il y a eu un problème. Peux-tu réessayer ?"
      },
      { status: 500 }
    );
  }
}

