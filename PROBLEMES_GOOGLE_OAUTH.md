# 🔴 Analyse des Problèmes de Connexion Google OAuth

## ❌ PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. **GOOGLE_CALENDAR_REDIRECT_URI INCORRECT** ⚠️ CRITIQUE

**Problème :** Dans votre fichier `.env`, vous avez :
```env
GOOGLE_CALENDAR_REDIRECT_URI=https://www.googleapis.com/auth/calendar
```

**❌ ERREUR :** `https://www.googleapis.com/auth/calendar` n'est **PAS** une URI de redirection, c'est un **SCOPE OAuth** !

**✅ Solution :** Cette variable doit pointer vers une route de votre application, par exemple :
```env
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/callback/google-calendar
```

**Impact :** Le code dans `app/lib/calendar/google.ts` utilise cette variable pour créer le client OAuth. Si elle pointe vers un scope au lieu d'une URI de callback, l'authentification Google Calendar échouera.

---

### 2. **URI INCORRECTE DANS GOOGLE CONSOLE** ⚠️ CRITIQUE

**Problème :** Dans votre Google Cloud Console, vous avez ajouté :
```
https://www.googleapis.com/auth/calendar
```
dans la section "URI de redirection autorisés pour les requêtes provenant d'un serveur Web".

**❌ ERREUR :** C'est un **SCOPE**, pas une URI de redirection !

**✅ Solution :** Supprimez cette entrée de Google Console. Les URIs de redirection valides doivent être :
- `http://localhost:3000/api/auth/callback/google` (pour NextAuth)
- `http://localhost:3000/api/auth/callback/google-calendar` (si vous créez cette route)
- `http://localhost:3000/api/health/sync/google-fit/callback` (pour Google Fit)
- `https://synexa-xi.vercel.app/api/auth/callback/google` (pour la production)
- `https://synexa-xi.vercel.app/api/auth/callback/google-calendar` (pour la production)
- `https://synexa-xi.vercel.app/api/health/sync/google-fit/callback` (pour la production)

---

### 3. **ROUTE CALLBACK GOOGLE CALENDAR MANQUANTE** ⚠️ IMPORTANT

**Problème :** Le code dans `app/lib/calendar/google.ts` fait référence à :
```typescript
/api/auth/callback/google-calendar
```

**❌ ERREUR :** Cette route n'existe pas dans votre codebase !

**Fichier concerné :** `app/lib/calendar/google.ts` ligne 19

**✅ Solution :** Vous avez deux options :

#### Option A : Créer la route manquante
Créez le fichier `app/api/auth/callback/google-calendar/route.ts` pour gérer le callback Google Calendar séparément de NextAuth.

#### Option B : Utiliser la route NextAuth existante
Modifiez `app/lib/calendar/google.ts` pour utiliser `/api/auth/callback/google` (qui est géré automatiquement par NextAuth).

**Recommandation :** L'Option B est plus simple car NextAuth gère déjà le callback OAuth. Cependant, si vous avez besoin d'un flux OAuth séparé pour Google Calendar (en plus de l'authentification NextAuth), vous devrez créer la route.

---

### 4. **INCOHÉRENCE DES URIs DE REDIRECTION** ⚠️ IMPORTANT

**Problème :** Vous avez plusieurs URIs configurés dans Google Console, mais ils ne correspondent pas tous aux routes réelles :

**URIs dans Google Console (d'après l'image) :**
- ✅ `http://localhost:3000` (pour navigateur)`
- ✅ `http://localhost:3000/api/auth/callback/google`
- ❌ `https://www.googleapis.com/auth/calendar` (INCORRECT - à supprimer)
- ✅ `http://localhost:3000/api/health/sync/google-fit/callback`
- ✅ `https://synexa-xi.vercel.app/api/auth/callback/google`
- ✅ `https://synexa-xi.vercel.app/auth/signin`
- ✅ `https://synexa-xi.vercel.app`

**URIs manquantes (si vous créez la route google-calendar) :**
- `http://localhost:3000/api/auth/callback/google-calendar`
- `https://synexa-xi.vercel.app/api/auth/callback/google-calendar`

---

### 5. **GOOGLE_REDIRECT_URI NON UTILISÉ PAR NEXTAUTH** ℹ️ INFO

**Problème :** Vous avez défini `GOOGLE_REDIRECT_URI` dans votre `.env`, mais NextAuth génère automatiquement l'URI de callback basé sur `NEXTAUTH_URL`.

**Impact :** Cette variable n'est pas utilisée par NextAuth (qui utilise automatiquement `/api/auth/callback/google`). Elle pourrait être utilisée ailleurs dans le code, mais je ne l'ai pas trouvée.

**✅ Solution :** Vous pouvez la garder pour référence, mais elle n'est pas nécessaire pour NextAuth.

---

## 🔧 ACTIONS CORRECTIVES À EFFECTUER

### Étape 1 : Corriger le fichier `.env`

```env
# ❌ SUPPRIMEZ ou CORRIGEZ cette ligne :
# GOOGLE_CALENDAR_REDIRECT_URI=https://www.googleapis.com/auth/calendar

# ✅ REMPLACEZ par :
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/callback/google-calendar
```

**OU** si vous voulez utiliser la route NextAuth existante :

```env
# Supprimez GOOGLE_CALENDAR_REDIRECT_URI et laissez le code utiliser la valeur par défaut
# qui sera : ${NEXTAUTH_URL}/api/auth/callback/google-calendar
```

---

### Étape 2 : Nettoyer Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** > **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans la section **"URI de redirection autorisés"**, **SUPPRIMEZ** :
   - ❌ `https://www.googleapis.com/auth/calendar`

6. **AJOUTEZ** (si nécessaire) :
   - ✅ `http://localhost:3000/api/auth/callback/google-calendar` (pour le développement)
   - ✅ `https://synexa-xi.vercel.app/api/auth/callback/google-calendar` (pour la production)

7. Cliquez sur **Enregistrer**

---

### Étape 3 : Décider de la stratégie pour Google Calendar

Vous avez deux options :

#### Option A : Utiliser NextAuth pour tout (Recommandé)

Si vous utilisez NextAuth pour l'authentification Google, vous pouvez récupérer les tokens depuis la session NextAuth et les utiliser pour Google Calendar. Dans ce cas :

1. Modifiez `app/lib/calendar/google.ts` pour utiliser `/api/auth/callback/google` au lieu de `/api/auth/callback/google-calendar`
2. Récupérez les tokens depuis la session NextAuth au lieu de faire un flux OAuth séparé

#### Option B : Créer un flux OAuth séparé pour Google Calendar

Si vous avez besoin d'un flux OAuth séparé (par exemple, pour permettre aux utilisateurs de connecter plusieurs comptes Google), créez la route manquante :

**Fichier à créer :** `app/api/auth/callback/google-calendar/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/lib/calendar/google";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent("Code d'autorisation manquant")}`
      );
    }

    // Échanger le code contre des tokens
    const tokens = await exchangeCodeForTokens(code);

    // TODO: Enregistrer les tokens dans la base de données
    // await saveGoogleCalendarTokens(userId, tokens);

    return NextResponse.redirect(
      `${baseUrl}/profile?success=google_calendar_connected`
    );
  } catch (error) {
    console.error("[GET /api/auth/callback/google-calendar]", error);
    return NextResponse.redirect(
      `${baseUrl}/profile?error=google_calendar_auth_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Erreur inconnue"
      )}`
    );
  }
}
```

---

### Étape 4 : Vérifier les variables d'environnement sur Vercel

Assurez-vous que sur Vercel, vous avez :

1. ✅ `NEXTAUTH_URL=https://synexa-xi.vercel.app` (sans slash final)
2. ✅ `GOOGLE_CLIENT_ID` (votre Client ID)
3. ✅ `GOOGLE_CLIENT_SECRET` (votre Client Secret)
4. ✅ `NEXTAUTH_SECRET` (votre secret NextAuth)
5. ⚠️ `GOOGLE_CALENDAR_REDIRECT_URI` (si vous l'utilisez, doit être `https://synexa-xi.vercel.app/api/auth/callback/google-calendar`)

**Important :** Après avoir modifié les variables d'environnement sur Vercel, vous devez **redéployer** l'application.

---

## 📋 CHECKLIST DE VÉRIFICATION

- [ ] Corriger `GOOGLE_CALENDAR_REDIRECT_URI` dans `.env`
- [ ] Supprimer `https://www.googleapis.com/auth/calendar` de Google Console
- [ ] Ajouter les bonnes URIs de redirection dans Google Console
- [ ] Décider de la stratégie (Option A ou B) pour Google Calendar
- [ ] Créer la route callback si nécessaire (Option B)
- [ ] Vérifier les variables d'environnement sur Vercel
- [ ] Redéployer sur Vercel après modifications
- [ ] Tester la connexion Google en local
- [ ] Tester la connexion Google en production

---

## 🐛 ERREURS COURANTES ET SOLUTIONS

### Erreur : "redirect_uri_mismatch"

**Cause :** L'URI de redirection dans votre code ne correspond pas à celle configurée dans Google Console.

**Solution :**
1. Vérifiez que l'URI dans Google Console correspond exactement à celle utilisée dans le code
2. Vérifiez qu'il n'y a pas d'espaces ou de caractères supplémentaires
3. Vérifiez que vous utilisez `http://` pour localhost et `https://` pour la production

### Erreur : "invalid_client"

**Cause :** Les credentials Google sont incorrects ou manquants.

**Solution :**
1. Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont corrects
2. Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs
3. Vérifiez que les guillemets sont correctement gérés (le code les enlève automatiquement)

### Erreur : "access_denied" - "L'appli est en cours de test"

**Cause :** Votre application OAuth est en mode "Test" et votre email n'est pas ajouté comme testeur.

**Solution :** Voir `docs/google-oauth-troubleshooting.md`

---

## 📚 RESSOURCES

- [Documentation NextAuth.js - Google Provider](https://next-auth.js.org/providers/google)
- [Documentation Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

