// app/lib/supabase/client.ts
// Client Supabase pour l'application
import { createClient } from '@supabase/supabase-js';

// Types de base de données (seront générés plus tard)
// Utilisation de Record<string, unknown> pour éviter les erreurs de linting
export type Database = {
  public: {
    Tables: {
      User: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      Task: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // ... autres tables
    };
  };
};

// Configuration Supabase avec initialisation lazy
function getSupabaseConfig() {
  // Vérifier les variables d'environnement (peuvent être chargées depuis .env.local)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Vérifier si les valeurs sont valides (pas vides et pas des placeholders)
  const isValidUrl = supabaseUrl && 
    supabaseUrl !== '' && 
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.startsWith('http');
  
  const isValidKey = supabaseAnonKey && 
    supabaseAnonKey !== '' && 
    supabaseAnonKey !== 'placeholder-key';

  if (!isValidUrl || !isValidKey) {
    // En mode développement, afficher un avertissement détaillé
    if (process.env.NODE_ENV === 'development') {
      // Afficher une seule fois au démarrage
      // Utilisation d'une interface pour typer global
      interface GlobalWithSupabaseWarning {
        __supabase_warning_shown?: boolean;
      }
      const globalWithWarning = globalThis as typeof globalThis & GlobalWithSupabaseWarning;
      
      if (!globalWithWarning.__supabase_warning_shown) {
        console.warn('\n⚠️ ============================================');
        console.warn('⚠️ Variables d\'environnement Supabase manquantes');
        console.warn('⚠️ ============================================');
        console.warn('📋 Diagnostic:');
        console.warn('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `✅ Trouvée (${supabaseUrl.substring(0, 30)}...)` : '❌ Manquante');
        console.warn('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✅ Trouvée (${supabaseAnonKey.substring(0, 20)}...)` : '❌ Manquante');
        console.warn('\n💡 Solutions:');
        console.warn('   1. Vérifiez que .env.local existe à la racine du projet');
        console.warn('   2. Vérifiez le format: NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co');
        console.warn('   3. Redémarrez le serveur après modification: npm run dev');
        console.warn('   4. Consultez DIAGNOSTIC_SUPABASE.md pour plus d\'aide\n');
        globalWithWarning.__supabase_warning_shown = true;
      }
      // Retourner null pour indiquer que Supabase n'est pas configuré
      return null;
    }
    
    throw new Error(
      'Variables d\'environnement Supabase manquantes. ' +
      'Vérifiez que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies.'
    );
  }

  return {
    url: supabaseUrl,
    key: supabaseAnonKey,
  };
}

const config = getSupabaseConfig();

// Client Supabase pour le serveur (utilise la clé service_role en production)
// Si config est null, créer un client mock qui retourne des erreurs gracieuses
// Note: Ce client ne fonctionnera pas mais évitera les erreurs de build
export const supabase = config 
  ? createClient<Database>(
      config.url,
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || config.key,
      {
        auth: {
          persistSession: false, // Pas de session côté serveur
          autoRefreshToken: false,
        },
      }
    )
  : createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

// Client Supabase pour le client (utilise la clé anon)
export const createBrowserClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient ne peut être utilisé que côté client');
  }
  
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Variables d\'environnement Supabase manquantes');
  }
  
  return createClient<Database>(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

// Fonction utilitaire pour vérifier si Supabase est configuré
export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export default supabase;

