import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/app/lib/services/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    // Valider l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      );
    }

    // Récupérer l'email de contact depuis les variables d'environnement
    const contactEmail = process.env.EMAIL_CONTACT || "fortuna77320@gmail.com";

    // Envoyer l'email
    try {
      await sendEmail({
        to: contactEmail,
        subject: `[Contact Synexa] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #18181b;">Nouveau message de contact</h2>
            <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Nom:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Sujet:</strong> ${subject}</p>
            </div>
            <div style="margin: 20px 0;">
              <h3 style="color: #18181b;">Message:</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
            <p style="color: #71717a; font-size: 12px;">
              Ce message a été envoyé depuis le formulaire de contact de Synexa.
            </p>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        message: "Votre message a été envoyé avec succès !",
      });
    } catch (emailError) {
      console.error("[Contact] Erreur envoi email:", emailError);
      return NextResponse.json(
        {
          error: "Erreur lors de l'envoi du message. Veuillez réessayer plus tard.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Contact] Erreur:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de l'envoi du message",
      },
      { status: 400 }
    );
  }
}

