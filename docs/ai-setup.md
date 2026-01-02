# Configuration IA pour le parsing de langage naturel

## 🆓 Options gratuites

### Option 1 : Groq (Recommandé) ⭐

**Avantages :**
- ✅ **100% gratuit** avec limites généreuses
- ⚡ **Très rapide** (réponses en < 1 seconde)
- 🎯 Modèles performants (Llama 3.1, Mixtral)
- 🔒 Pas de carte bancaire requise

**Configuration :**

1. Créez un compte sur [console.groq.com](https://console.groq.com)
2. Obtenez votre clé API (gratuite)
3. Ajoutez dans `.env` :
   ```env
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   GROQ_MODEL=llama-3.1-8b-instant  # Optionnel, par défaut
   ```

**Limites :**
- 30 requêtes/minute
- 14,400 requêtes/jour
- Plus que suffisant pour un usage personnel !

### Option 2 : Hugging Face Inference API

**Avantages :**
- ✅ Gratuit avec limites
- 🎯 Beaucoup de modèles disponibles

**Configuration :**

1. Créez un compte sur [huggingface.co](https://huggingface.co)
2. Créez un token API
3. Ajoutez dans `.env` :
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
   ```

**Note :** Nécessite une modification du code pour utiliser l'API Hugging Face.

### Option 3 : Parser Regex amélioré (Déjà implémenté)

**Avantages :**
- ✅ **100% gratuit, aucune API**
- ✅ **Fonctionne hors ligne**
- ✅ **Aucune configuration**

**Limites :**
- Moins précis pour les phrases complexes
- Ne comprend pas toutes les expressions

**Fonctionne déjà sans configuration !**

## 🎯 Recommandation

**Pour commencer :** Utilisez le parser regex (déjà actif, aucune config)

**Pour améliorer :** Ajoutez Groq (gratuit, rapide, simple)

## 📊 Comparaison

| Service | Gratuit | Rapidité | Précision | Configuration |
|---------|---------|----------|-----------|---------------|
| **Regex** | ✅ Oui | ⚡ Instant | 🟡 Moyenne | Aucune |
| **Groq** | ✅ Oui | ⚡ Très rapide | 🟢 Bonne | Clé API |
| **Hugging Face** | ✅ Oui | 🟡 Moyenne | 🟢 Bonne | Clé API |
| OpenAI | ❌ Payant | 🟡 Moyenne | 🟢 Excellente | Clé API |

## 🔧 Code actuel

Le code utilise **Groq** par défaut (si configuré), sinon **regex** automatiquement.

Aucune modification nécessaire - ça fonctionne déjà !








