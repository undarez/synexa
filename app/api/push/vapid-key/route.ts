import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/app/lib/services/push";

/**
 * Retourne la clé publique VAPID pour le client
 * GET /api/push/vapid-key
 */
export async function GET() {
  const publicKey = getVapidPublicKey();
  
  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID keys non configurées" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}








