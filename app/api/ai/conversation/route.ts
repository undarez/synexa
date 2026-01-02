import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/session";
import { 
  generateConversationResponse, 
  getUserContextForSynexa 
} from "@/app/lib/ai/conversation";
import { searchWeb, searchPrice, searchServices } from "@/app/lib/services/web-search";
import { logger } from "@/app/lib/logger";
import {
  checkMessageSecurity,
  checkResponseSecurity,
  sanitizeResponse,
} from "@/app/lib/security/conversation-security";

/**
 * POST - Conversation avec l'IA
 * Body: { message: string, context?: ConversationContext }
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

    logger.info("Conversation avec l'IA", {
      userId: user.id,
      messageLength: body.message.length,
    });

    // Vérifier la sécurité du message
    const securityCheck = checkMessageSecurity(body.message, user.id);

    if (!securityCheck.allowed) {
      logger.warn("Message bloqué par sécurité", {
        userId: user.id,
        reason: securityCheck.reason,
        severity: securityCheck.severity,
      });

      return NextResponse.json(
        {
          success: false,
          error: securityCheck.reason || "Message non autorisé",
          blocked: true,
        },
        { status: 403 }
      );
    }

    // Utiliser le message nettoyé si nécessaire
    const messageToProcess = securityCheck.sanitizedMessage || body.message;

    // Récupérer le contexte utilisateur pour enrichir les réponses de Synexa
    const userContext = await getUserContextForSynexa(user.id);

    // Fusionner le contexte fourni avec le contexte utilisateur
    const enrichedContext = {
      ...body.context,
      ...userContext,
      userId: user.id,
    };

    // Détecter si la réponse sera lue à voix haute (TTS)
    // Si le client demande explicitement une réponse vocale ou si c'est une commande vocale
    const forTTS = body.forTTS === true || body.voiceResponse === true;

    // Générer la réponse de l'IA avec le contexte enrichi
    const aiResponse = await generateConversationResponse(messageToProcess, enrichedContext, forTTS);

    // Si une recherche web est nécessaire, la faire
    let webSearchResults = null;
    if (aiResponse.needsWebSearch && aiResponse.searchQuery) {
      webSearchResults = await searchWeb(aiResponse.searchQuery);
    }

    // Si une recherche de prix est nécessaire
    let priceResults = null;
    if (aiResponse.needsPriceSearch && aiResponse.priceQuery) {
      priceResults = await searchPrice(aiResponse.priceQuery);
    }

    // Si une recherche de service est nécessaire
    let serviceResults = null;
    if (aiResponse.needsServiceSearch && aiResponse.serviceQuery) {
      serviceResults = await searchServices(aiResponse.serviceQuery, body.location);
    }

    // Vérifier la sécurité de la réponse
    const responseSecurity = checkResponseSecurity(aiResponse.response, user.id);

    if (!responseSecurity.allowed) {
      logger.warn("Réponse de l'IA bloquée", {
        userId: user.id,
        reason: responseSecurity.reason,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Impossible de générer une réponse sécurisée",
        },
        { status: 500 }
      );
    }

    // Utiliser la réponse nettoyée si nécessaire
    let finalResponse = responseSecurity.sanitizedMessage
      ? sanitizeResponse(aiResponse.response)
      : aiResponse.response;

    if (webSearchResults && webSearchResults.results.length > 0) {
      finalResponse += `\n\nVoici ce que j'ai trouvé :\n`;
      webSearchResults.results.slice(0, 3).forEach((result, index) => {
        finalResponse += `\n${index + 1}. ${result.title}\n   ${result.snippet}\n   ${result.url}\n`;
      });
    }

    if (priceResults && priceResults.prices.length > 0) {
      finalResponse += `\n\nPrix trouvés pour "${priceResults.product}" :\n`;
      priceResults.prices.forEach((price) => {
        finalResponse += `- ${price.store}: ${price.price}\n`;
      });
      if (priceResults.averagePrice) {
        finalResponse += `\nPrix moyen: ${priceResults.averagePrice}\n`;
      }
    }

    if (serviceResults && serviceResults.services.length > 0) {
      finalResponse += `\n\nServices trouvés :\n`;
      serviceResults.services.slice(0, 5).forEach((service) => {
        finalResponse += `\n- ${service.name}`;
        if (service.address) finalResponse += `\n  Adresse: ${service.address}`;
        if (service.phone) finalResponse += `\n  Téléphone: ${service.phone}`;
        if (service.url) finalResponse += `\n  ${service.url}`;
      });
    }

    logger.debug("Réponse générée", {
      userId: user.id,
      hasWebSearch: !!webSearchResults,
      hasPriceSearch: !!priceResults,
      hasServiceSearch: !!serviceResults,
    });

    return NextResponse.json({
      success: true,
      response: finalResponse,
      aiResponse: aiResponse.response,
      webSearch: webSearchResults,
      priceSearch: priceResults,
      serviceSearch: serviceResults,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    logger.error("Erreur lors de la conversation", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

