# 🔒 Guide de Sécurité - SINEXA

## Règles de Stockage Côté Client

### 🚫 JAMAIS dans localStorage/sessionStorage

**Données strictement interdites :**
- ❌ Tokens d'authentification (access_token, refresh_token)
- ❌ Identifiants utilisateur (userId, email)
- ❌ Données personnelles (nom, prénom, adresse)
- ❌ Données métier sensibles (domotique, caméras, routines)
- ❌ Préférences personnelles liées à la sécurité
- ❌ Clés API ou secrets
- ❌ Données de paiement ou financières

### ✅ Autorisé dans localStorage (UI ONLY)

**Données non sensibles d'interface :**
- ✅ Thème (clair/sombre) - géré par `next-themes`
- ✅ État d'un menu (collapsed/expanded)
- ✅ Préférences d'affichage non sensibles (vue liste/grille)

### ✅ Autorisé dans sessionStorage (Navigation temporaire)

**Données temporaires de navigation :**
- ✅ Chemin de redirection OAuth (`oauth_redirect_path`) - supprimé après utilisation

## Architecture de Sécurité

### Authentification

L'authentification utilise **Supabase Auth** avec les mécanismes suivants :

1. **Supabase gère automatiquement** le stockage de la session dans localStorage (via `@supabase/ssr`)
   - Clé : `sb-{project-id}-auth-token`
   - Géré par Supabase, ne pas modifier manuellement

2. **Synchronisation vers cookies HTTP** (pour Server Components)
   - Géré par `@supabase/ssr` dans le middleware
   - Les cookies créés manuellement via `document.cookie` ne sont **PAS HTTP-only** (limitation JavaScript)
   - ⚠️ **Note de sécurité** : Les cookies créés via JavaScript sont accessibles par le code client, ce qui est un risque XSS
   - ✅ **Recommandation** : Utiliser uniquement `@supabase/ssr` pour la gestion des cookies (déjà en place)

3. **Tokens Google** (provider_token, provider_refresh_token)
   - Stockés dans la session Supabase (gérée par Supabase)
   - Accessibles via `session.provider_token` côté client
   - ⚠️ **Note** : Ces tokens sont sensibles, mais nécessaires pour l'accès à Google Calendar
   - ✅ **Mitigation** : Utilisés uniquement côté serveur via API routes

### Wrapper Sécurisé

Utiliser **uniquement** les wrappers sécurisés pour le stockage client :

```typescript
import { secureStorage, secureSessionStorage } from '@/app/lib/utils/storage';

// ✅ CORRECT - localStorage (UI only)
secureStorage.setItem('theme', 'dark');

// ✅ CORRECT - sessionStorage (navigation temporaire)
secureSessionStorage.setItem('oauth_redirect_path', '/dashboard');

// ❌ INCORRECT - Accès direct à localStorage
localStorage.setItem('user_token', token); // ❌ Erreur : clé non autorisée
```

### Nettoyage des Données Sensibles

Appeler `clearSensitiveData()` lors de la déconnexion :

```typescript
import { clearSensitiveData } from '@/app/lib/utils/storage';

// Lors de la déconnexion
await supabase.auth.signOut();
clearSensitiveData(); // Nettoie toutes les clés non autorisées
```

## Bonnes Pratiques

### 1. Source de Vérité

- **Supabase** = Source de vérité pour auth + données
- **Server Components / API Routes** = Logique métier
- **Client** = Affichage uniquement

### 2. Protection XSS

- Ne jamais stocker de tokens dans localStorage accessible par JavaScript
- Utiliser des cookies HTTP-only pour les tokens (géré par `@supabase/ssr`)
- Valider et sanitizer toutes les entrées utilisateur

### 3. Validation Côté Serveur

- Toujours valider les données côté serveur
- Ne jamais faire confiance aux données du client
- Utiliser `requireUser()` ou `requireAdmin()` pour protéger les routes

### 4. Gestion des Erreurs

- Ne jamais exposer d'informations sensibles dans les messages d'erreur
- Logger les erreurs côté serveur uniquement
- Masquer les détails techniques aux utilisateurs

## Audit de Sécurité

### Checklist

- [x] Wrapper sécurisé pour localStorage/sessionStorage
- [x] Whitelist de clés autorisées
- [x] Remplacement de localStorage par sessionStorage pour OAuth redirect
- [x] Documentation des règles de stockage
- [ ] Vérification que Supabase gère correctement les cookies (via @supabase/ssr)
- [ ] Audit régulier des usages de localStorage/sessionStorage

### Vérification Post-Login

Après connexion, vérifier dans les DevTools (Application → Local Storage) :

✅ **Autorisé :**
- `sb-{project-id}-auth-token` (géré par Supabase)
- `theme` ou `next-themes` (thème UI)

❌ **Interdit :**
- `user_token`, `access_token`, `refresh_token` (sauf dans Supabase)
- `userId`, `email`, `user_data`
- Toute autre clé non listée dans la whitelist

## Migration et Maintenance

### Ajouter une Nouvelle Clé Autorisée

1. Modifier `app/lib/utils/storage.ts`
2. Ajouter la clé dans `ALLOWED_LOCALSTORAGE_KEYS` ou `ALLOWED_SESSIONSTORAGE_KEYS`
3. Documenter l'usage dans ce fichier
4. Vérifier que la clé n'est pas sensible

### Détecter les Usages Non Autorisés

```bash
# Rechercher tous les usages de localStorage
grep -r "localStorage\." app/

# Rechercher tous les usages de sessionStorage
grep -r "sessionStorage\." app/
```

Tous les usages doivent passer par `secureStorage` ou `secureSessionStorage`.

## Références

- [OWASP - XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Supabase Auth - Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Next.js - Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
