# Création d'événements via langage naturel

## 🎯 Fonctionnalité

Créez des événements en tapant du texte naturel au lieu de remplir un formulaire !

**Exemples :**
- "Réunion demain à 14h avec Jean"
- "Dentiste lundi prochain à 10h30"
- "Anniversaire de Marie le 15 décembre"
- "Conférence à Paris demain de 9h à 17h"
- "Rendez-vous médical après-demain à 15h"

## 🚀 Utilisation

1. Cliquez sur "Nouvel événement" dans le calendrier
2. Cliquez sur l'onglet **"✨ Langage naturel"**
3. Tapez votre événement en langage naturel
4. Cliquez sur "Créer" ou appuyez sur Entrée
5. Le formulaire se remplit automatiquement avec les informations extraites
6. Vous pouvez modifier les détails si nécessaire
7. Cliquez sur "Créer" pour finaliser

## 🧠 Comment ça marche ?

### Mode IA (avec Groq) - Plus précis et gratuit

Si vous avez configuré `GROQ_API_KEY` dans votre `.env`, le système utilise Groq (Llama 3.1) pour parser le texte avec une grande précision. **C'est gratuit !**

**Avantages :**
- Comprend les expressions complexes
- Extrait les participants, lieux, descriptions
- Gère les dates relatives ("dans 3 jours", "semaine prochaine")
- Meilleure précision globale

### Mode Regex (sans API) - Fonctionne toujours

Même sans clé OpenAI, le système utilise un parser regex intelligent qui fonctionne pour la plupart des cas courants.

**Fonctionnalités :**
- Dates relatives : "demain", "après-demain", "lundi", etc.
- Heures : "14h", "10h30", "9h15"
- Lieux : "à Paris", "chez Jean", "dans le bureau"
- Participants : "avec Marie", "et Paul"

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

## 📝 Format supporté

### Dates
- **Relatives** : "demain", "après-demain", "aujourd'hui"
- **Jours de la semaine** : "lundi", "mardi", etc.
- **Dates absolues** : "15 décembre", "1/12", "le 20 janvier"

### Heures
- **Format simple** : "14h", "10h30", "9h15"
- **Par défaut** : Si pas d'heure, utilise 9h

### Lieux
- **Mots-clés** : "à", "chez", "dans"
- **Exemples** : "à Paris", "chez le médecin", "dans le bureau 204"

### Participants
- **Mots-clés** : "avec", "et"
- **Exemples** : "avec Jean", "et Marie et Paul"

### Durée
- **Par défaut** : 1 heure
- **Explicite** : "de 9h à 17h", "de 14h à 16h"

## 🎨 Interface

Le composant `NaturalLanguageInput` offre :
- ✨ Icône Sparkles pour indiquer l'IA
- 🔄 Loading state pendant le parsing
- ❌ Bouton pour effacer le texte
- 💡 Exemples en placeholder
- ⚠️ Gestion d'erreurs claire

## 🔧 API

### Endpoint

```
POST /api/calendar/parse
Content-Type: application/json

{
  "text": "Réunion demain à 14h avec Jean",
  "referenceDate": "2024-11-28T10:00:00Z" // Optionnel
}
```

### Réponse

```json
{
  "success": true,
  "event": {
    "title": "Réunion",
    "description": null,
    "location": null,
    "start": "2024-11-29T14:00:00Z",
    "end": "2024-11-29T15:00:00Z",
    "allDay": false,
    "attendees": ["Jean"],
    "confidence": 0.9
  }
}
```

## 🐛 Dépannage

### Le parsing ne fonctionne pas bien

1. **Vérifiez le format** : Utilisez des phrases simples et claires
2. **Activez OpenAI** : Si vous avez une clé API, elle améliore grandement la précision
3. **Vérifiez les logs** : Les erreurs sont loggées dans la console serveur

### Groq ne répond pas

- Vérifiez que `GROQ_API_KEY` est correct
- Vérifiez votre quota Groq (gratuit : 30 req/min, 14,400/jour)
- Le système bascule automatiquement sur le mode regex en cas d'erreur

### Les dates sont incorrectes

- Le parser utilise la date actuelle comme référence
- "demain" = jour actuel + 1
- "lundi" = prochain lundi (ou lundi de cette semaine si on est avant)

## 💡 Améliorations futures

- [ ] Support de plusieurs langues
- [ ] Apprentissage des préférences utilisateur
- [ ] Suggestions de corrections si parsing incertain
- [ ] Support des événements récurrents ("tous les lundis")
- [ ] Intégration avec les contacts pour les participants

