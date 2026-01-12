import { NextResponse } from "next/server";

/**
 * Route de diagnostic pour vérifier les variables d'environnement
 * Visitez http://localhost:3000/api/test-env
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    diagnostic: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : null,
      keyPreview: supabaseKey ? supabaseKey.substring(0, 30) + '...' : null,
      urlValid: supabaseUrl?.startsWith('https://') && supabaseUrl?.includes('.supabase.co'),
      keyValid: supabaseKey && supabaseKey.length > 100,
    },
    instructions: {
      step1: "Vérifiez que .env.local existe à la racine du projet",
      step2: "Vérifiez le format: NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co",
      step3: "Redémarrez le serveur après modification",
      step4: "Consultez DIAGNOSTIC_SUPABASE.md pour plus d'aide",
    },
  });
}

