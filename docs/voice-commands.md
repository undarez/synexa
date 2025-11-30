# Commandes Vocales - Synexa

## 🎤 Fonctionnalité

Système complet de commandes vocales utilisant Web Speech API pour créer des événements, automatisations et tâches en parlant simplement.

## ✨ Fonctionnalités

### Reconnaissance vocale
- ✅ **Web Speech API** : Reconnaissance vocale native du navigateur
- ✅ **Support français** : Langue française (fr-FR)
- ✅ **Feedback visuel** : Indicateur d'écoute en temps réel
- ✅ **Gestion d'erreurs** : Messages clairs pour les erreurs

### Parsing intelligent
- ✅ **Réutilise les parsers existants** :
  - `event-parser` pour les événements
  - `routine-parser` pour les automatisations
  - Parser basique pour les tâches
- ✅ **Détection automatique** : Identifie le type de commande
- ✅ **Confiance** : Score de confiance pour chaque commande

### Actions automatiques
- ✅ **Création d'événements** : Via langage naturel
- ✅ **Création d'automatisations** : Via langage naturel
- ✅ **Création de tâches** : Extraction du titre
- ✅ **Feedback utilisateur** : Messages de succès/erreur

## 🚀 Utilisation

### 1. Accéder aux commandes vocales

1. Allez sur le **Dashboard** (page principale)
2. Trouvez la carte **"Commandes vocales"**
3. Cliquez sur le bouton **"Parler"**

### 2. Autoriser le microphone

- Le navigateur demandera l'autorisation d'accéder au microphone
- Cliquez sur **"Autoriser"** ou **"Permettre"**

### 3. Parler votre commande

Exemples de commandes :

**Événements :**
- "Créer un événement réunion demain à 14h avec Jean"
- "Ajouter un rendez-vous chez le médecin lundi à 10h"
- "Planifier réunion équipe vendredi à 15h"

**Automatisations :**
- "Quand je dis bonjour, allumer les lumières"
- "Tous les matins à 7h, allumer le chauffage"
- "Quand je rentre, allumer les lumières et mettre de la musique"

**Tâches :**
- "Créer une tâche faire les courses"
- "Ajouter une tâche appeler le dentiste"
- "Nouvelle tâche préparer la présentation"

### 4. Résultat

- La commande est analysée automatiquement
- L'action est exécutée (création d'événement, routine, etc.)
- Un message de confirmation s'affiche

## 🔧 Détails techniques

### Architecture

```
VoiceInput (Web Speech API)
    ↓
VoiceCommandHandler (Orchestration)
    ↓
/api/voice/parse (Parser)
    ↓
voice-commands.ts (Détection type)
    ↓
event-parser.ts | routine-parser.ts (Parsing)
    ↓
Création automatique (API)
```

### Types de commandes supportées

| Type | Détection | Parser utilisé |
|------|-----------|----------------|
| **EVENT** | "créer un événement", "réunion", "rendez-vous" | `event-parser.ts` |
| **ROUTINE** | "créer une automatisation", "quand je dis" | `routine-parser.ts` |
| **TASK** | "créer une tâche", "nouvelle tâche" | Parser basique |

### Compatibilité navigateurs

| Navigateur | Support | Notes |
|------------|---------|-------|
| **Chrome** | ✅ Oui | Support complet |
| **Edge** | ✅ Oui | Support complet |
| **Safari** | ✅ Oui | Support complet |
| **Firefox** | ❌ Non | Pas de support Web Speech API |

### Limitations

1. **HTTPS requis** : En production, nécessite HTTPS (ou localhost en dev)
2. **Microphone requis** : Nécessite un microphone et l'autorisation
3. **Langue** : Actuellement configuré pour le français (fr-FR)
4. **Nettoyage du texte** : Les mots de commande sont retirés avant parsing

## 💡 Conseils d'utilisation

### Pour de meilleurs résultats

1. **Parlez clairement** : Articulez bien les mots
2. **Environnement calme** : Réduisez le bruit ambiant
3. **Microphone de qualité** : Utilisez un bon microphone
4. **Phrases complètes** : Donnez tous les détails nécessaires

### Exemples optimaux

✅ **Bon** :
- "Créer un événement réunion demain à 14h avec Jean au bureau"
- "Quand je dis bonjour, allumer les lumières du salon"
- "Créer une tâche faire les courses demain"

❌ **Moins bon** :
- "Réunion" (trop court, manque de détails)
- "Allumer" (pas de contexte)
- "Tâche" (titre manquant)

## 🐛 Dépannage

### Le microphone ne fonctionne pas

1. **Vérifiez les permissions** :
   - Chrome : Paramètres → Confidentialité → Microphone
   - Edge : Paramètres → Confidentialité → Microphone
   - Safari : Préférences → Sites web → Microphone

2. **Vérifiez le navigateur** :
   - Utilisez Chrome, Edge ou Safari
   - Firefox ne supporte pas Web Speech API

3. **Vérifiez HTTPS** :
   - En production, le site doit être en HTTPS
   - En développement, localhost fonctionne

### La commande n'est pas reconnue

1. **Vérifiez la langue** : Parlez en français
2. **Vérifiez la phrase** : Utilisez les mots-clés ("créer", "événement", etc.)
3. **Vérifiez le parsing** : Consultez les logs dans la console

### Erreur "Permission microphone refusée"

1. Cliquez sur l'icône de cadenas dans la barre d'adresse
2. Autorisez l'accès au microphone
3. Rechargez la page

## 🔮 Améliorations futures

- [ ] Support de plusieurs langues
- [ ] Mode continu (écoute permanente)
- [ ] Commandes de modification/suppression
- [ ] Historique des commandes vocales
- [ ] Correction manuelle du texte reconnu
- [ ] Commandes complexes ("Modifier l'événement de demain")

## 📚 Ressources

- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)



