# 🔧 Correction : `provider_refresh_token` Absent

## ❌ Problème Actuel

```
[useAuth]   - provider_token: ya29.A0AUMWg_KRJaFI9kPok46pCO9... ✅ Présent
[useAuth]   - provider_refresh_token: ❌ Absent
```

**Cause :** L'utilisateur s'est connecté **avant** que nous ajoutions `access_type=offline` et `prompt=consent` dans la configuration OAuth.

## 🔍 Pourquoi le `provider_refresh_token` est absent ?

Google ne retourne un `refresh_token` que lors de la **première connexion** avec :
- ✅ `access_type=offline` dans les queryParams
- ✅ `prompt=consent` dans les queryParams

**Si l'utilisateur s'est déjà connecté précédemment** sans ces paramètres, Google ne retournera **PAS** de refresh_token, même si vous les ajoutez après.

## ✅ Solution : Se Déconnecter et Se Reconnecter

Pour obtenir le `refresh_token`, vous devez :

1. **Se déconnecter complètement de Google**
   - Allez sur [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
   - Trouvez votre application dans la liste
   - Cliquez sur "Supprimer l'accès" ou "Révoquer l'accès"

2. **Se déconnecter de Supabase**
   - Dans votre application, cliquez sur "Se déconnecter"
   - Ou appelez `supabase.auth.signOut()`

3. **Se reconnecter avec Google**
   - Cliquez sur "Se connecter avec Google"
   - Cette fois, Google demandera **à nouveau** le consentement (`prompt=consent`)
   - Avec `access_type=offline`, Google retournera le `refresh_token`

## 🎯 Vérification Après Reconnexion

Après reconnexion, vous devriez voir dans la console :

```
[useAuth] ✅ Connexion réussie - Tokens Google :
[useAuth]   - provider_token: ya29.A0AUMWg_KRJaFI9kPok46pCO9... ✅ Présent
[useAuth]   - provider_refresh_token: 1//0g... ✅ Présent (maintenant disponible !)
[useAuth]   - access_token: eyJhbGc... ✅ Présent
```

## 🔧 Correction Automatique (Optionnel)

Si vous voulez forcer la reconnexion automatiquement, vous pouvez ajouter ce code dans `use-auth.ts` :

```typescript
// Dans signInWithGoogle(), ajouter cette vérification
const { data: { session } } = await supabase.auth.getSession();

if (session && !session.provider_refresh_token) {
  // Forcer la déconnexion si pas de refresh_token
  await supabase.auth.signOut();
  // Relancer la connexion
  // ... (relancer signInWithOAuth)
}
```

**⚠️ ATTENTION :** Cette approche force une double connexion, ce qui peut être frustrant pour l'utilisateur. Il est préférable de le faire manuellement une fois.

## 📋 Checklist

- [ ] Se déconnecter complètement de Google (révoquer l'accès)
- [ ] Se déconnecter de Supabase
- [ ] Se reconnecter avec Google
- [ ] Vérifier que `provider_refresh_token` est présent dans la session
- [ ] Tester le rafraîchissement du token si nécessaire

## 🎉 Résultat Attendu

Après reconnexion avec `prompt=consent` et `access_type=offline` :

✅ **`provider_token`** → Token Google pour Calendar API  
✅ **`provider_refresh_token`** → Token pour renouveler l'access token  
✅ **`access_token`** → Token Supabase (pour authentification Supabase)

## 📚 Documentation

- [Supabase Auth - OAuth Providers](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 - Offline Access](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
