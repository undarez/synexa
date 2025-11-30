# Automatisations en langage naturel

## 🎯 Fonctionnalité

Créez des automatisations simplement en décrivant ce que vous voulez faire en français. L'IA se charge de configurer les triggers, actions et paramètres automatiquement.

## ✨ Exemples d'utilisation

### Déclenchement vocal
```
Quand je dis 'Bonjour', allumer les lumières et lire les nouvelles
Si je dis 'Je pars', éteindre les lumières et activer l'alarme
```

### Déclenchement programmé
```
Tous les matins à 7h, allumer le chauffage et ouvrir les volets
Tous les soirs à 22h, éteindre les lumières et activer le mode nuit
Chaque lundi à 8h, envoyer une notification de rappel
```

### Déclenchement par géolocalisation
```
Quand je rentre à la maison, allumer les lumières et mettre de la musique
Quand je sors, éteindre les lumières et activer l'alarme
Quand j'arrive au bureau, envoyer une notification
```

## 🧠 Comment ça fonctionne

### Mode IA (avec Groq) - Plus précis

Si vous avez configuré `GROQ_API_KEY` dans votre `.env`, le système utilise Groq (Llama 3.1) pour parser le texte avec une grande précision.

**Avantages :**
- ✅ Comprend les phrases complexes
- ✅ Extrait automatiquement les triggers et actions
- ✅ Matche les devices par nom
- ✅ Configure les paramètres automatiquement

### Mode Regex (fallback) - Fonctionne toujours

Même sans clé API, le système utilise un parser regex intelligent qui comprend :
- Les triggers : "quand je dis", "tous les matins", "quand je rentre"
- Les actions : "allumer", "éteindre", "ouvrir", "lire"
- Les devices : cherche dans vos devices par nom
- Les heures : "7h", "14h30", "22h"

## 📋 Types de triggers supportés

| Type | Exemple | Détection |
|------|---------|-----------|
| **VOICE** | "Quand je dis 'X'" | ✅ Automatique |
| **SCHEDULE** | "Tous les matins à 7h" | ✅ Automatique |
| **LOCATION** | "Quand je rentre" | ✅ Automatique |
| **MANUAL** | Par défaut | ✅ Automatique |
| **SENSOR** | "Quand le capteur détecte" | ✅ Automatique |

## 🎬 Types d'actions supportés

| Type | Exemple | Détection |
|------|---------|-----------|
| **DEVICE_COMMAND** | "allumer les lumières" | ✅ Automatique |
| **NOTIFICATION** | "envoyer une notification" | ✅ Automatique |
| **TASK_CREATE** | "créer une tâche" | ✅ Automatique |
| **MEDIA_PLAY** | "mettre de la musique" | ✅ Automatique |
| **CUSTOM** | Actions personnalisées | ✅ Automatique |

## 🚀 Utilisation

1. Allez dans **Automatisations** → **Nouvelle automatisation**
2. Cliquez sur **✨ Langage naturel**
3. Tapez votre automatisation en français
4. Cliquez sur **Créer**
5. L'IA remplit automatiquement le formulaire
6. Vous pouvez modifier les détails si nécessaire
7. Cliquez sur **Créer** pour sauvegarder

## ⚙️ Configuration

### Optionnel : Activer Groq (gratuit et recommandé) ⭐

1. Créez un compte sur [console.groq.com](https://console.groq.com) (gratuit)
2. Obtenez votre clé API (gratuite, pas de carte bancaire)
3. Ajoutez dans `.env` :
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   GROQ_MODEL=llama-3.1-8b-instant  # Optionnel, par défaut
   ```

**Avantages de Groq :**
- ✅ **100% gratuit** (30 requêtes/min, 14,400/jour)
- ⚡ **Très rapide** (< 1 seconde)
- 🎯 **Performant** (Llama 3.1)

**Note :** Le mode regex fonctionne très bien pour les cas simples, Groq améliore juste la précision pour les phrases complexes.

## 💡 Conseils

### Pour de meilleurs résultats

1. **Soyez spécifique** : "allumer les lumières du salon" plutôt que "allumer"
2. **Mentionnez les devices** : Utilisez les noms exacts de vos devices
3. **Séparez les actions** : Utilisez des virgules pour plusieurs actions
4. **Précisez les heures** : "7h" ou "14h30" plutôt que "le matin"

### Exemples de phrases optimales

✅ **Bon** :
- "Quand je dis 'Bonjour', allumer les lumières du salon et mettre de la musique"
- "Tous les matins à 7h, allumer le chauffage et ouvrir les volets"
- "Quand je rentre, allumer les lumières et envoyer une notification"

❌ **Moins bon** :
- "Faire quelque chose" (trop vague)
- "Allumer" (pas de device spécifié)
- "Le matin" (heure imprécise)

## 🔧 Dépannage

### L'IA ne comprend pas ma phrase

- Vérifiez que vous utilisez des mots-clés connus (allumer, éteindre, etc.)
- Essayez de reformuler plus simplement
- Vérifiez que vos devices ont des noms clairs
- Le mode regex a des limites, activez Groq pour de meilleurs résultats

### Les devices ne sont pas détectés

- Vérifiez que le nom du device est mentionné dans le texte
- Utilisez le nom exact du device (tel qu'enregistré)
- Le matching est insensible à la casse mais sensible aux accents

### Groq ne répond pas

- Vérifiez que `GROQ_API_KEY` est correct
- Vérifiez votre quota Groq (gratuit : 30 req/min, 14,400/jour)
- Le système bascule automatiquement sur le mode regex en cas d'erreur

## 📊 Comparaison des modes

| Fonctionnalité | Regex | Groq |
|----------------|-------|------|
| **Gratuit** | ✅ Oui | ✅ Oui |
| **Rapidité** | ⚡ Instant | ⚡ Très rapide |
| **Précision** | 🟡 Moyenne | 🟢 Bonne |
| **Phrases complexes** | 🟡 Limité | 🟢 Excellent |
| **Configuration** | Aucune | Clé API |

## 🎉 Résultat

Une fois parsée, votre automatisation est automatiquement configurée avec :
- ✅ Le bon type de trigger
- ✅ Les paramètres du trigger (heure, commande vocale, etc.)
- ✅ Les actions correctes
- ✅ Les devices associés
- ✅ L'ordre des actions

Vous pouvez ensuite modifier manuellement les détails dans le formulaire si nécessaire !



