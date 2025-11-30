# Système d'Actualités Intelligent - Synexa

## 🎯 Vue d'ensemble

Synexa dispose maintenant d'un système complet de recherche et d'affichage d'actualités, transformant l'application en une véritable IA capable de répondre à des questions et de rechercher des informations sur n'importe quel sujet.

## ✨ Fonctionnalités

### 1. Recherche d'actualités multi-sources

Le système utilise plusieurs sources gratuites pour obtenir les meilleures actualités :

- **NewsAPI** (optionnel, nécessite une clé API gratuite)
- **Google News RSS** (gratuit, sans clé)
- **RSS feeds français** (Le Monde, Le Figaro, Libération)

### 2. Commandes vocales

Vous pouvez rechercher des actualités en parlant :

- "Cherche les actualités sur la technologie"
- "Montre-moi les nouvelles sur l'intelligence artificielle"
- "Quelles sont les actualités sur la santé ?"
- "Donne-moi les informations sur le sport"
- "Affiche les actualités sur la politique"

### 3. Page dédiée

Une page complète `/news` permet de :
- Rechercher des actualités par mot-clé
- Filtrer par catégorie (Technologie, Business, Santé, Science, Sports, Divertissement, Politique)
- Consulter les articles avec liens vers les sources

### 4. Intégration dans les automatisations

Les routines peuvent maintenant inclure des recherches d'actualités automatiques :

- "Quand je dis 'actualités', affiche les nouvelles du jour"
- "Tous les matins à 7h, envoie-moi les actualités technologiques"

## 📋 Catégories supportées

- **Général** : Actualités générales
- **Technologie** : Tech, IA, innovation
- **Business** : Économie, entreprises
- **Santé** : Médecine, bien-être
- **Science** : Recherche, découvertes
- **Sports** : Événements sportifs
- **Divertissement** : Culture, médias
- **Politique** : Actualités politiques

## 🚀 Utilisation

### Via commandes vocales

1. Cliquez sur le microphone dans le dashboard
2. Dites : "Cherche les actualités sur [sujet]"
3. Les résultats s'affichent automatiquement

### Via la page dédiée

1. Allez sur `/news` dans le menu
2. Entrez un terme de recherche ou sélectionnez une catégorie
3. Cliquez sur "Rechercher"

### Dans les automatisations

1. Créez une routine avec un trigger (voix, horaire, etc.)
2. Ajoutez une action de notification
3. Dans le message, incluez "actualités sur [sujet]"
4. La routine recherchera automatiquement les actualités

## ⚙️ Configuration

### NewsAPI (Optionnel, recommandé)

Pour obtenir des résultats plus précis et complets :

1. Créez un compte sur [newsapi.org](https://newsapi.org)
2. Obtenez votre clé API gratuite (100 requêtes/jour)
3. Ajoutez dans `.env` :
   ```env
   NEWS_API_KEY=votre_cle_api
   ```

**Note :** Le système fonctionne sans NewsAPI en utilisant Google News RSS et les flux RSS français.

## 📊 Format des données

Chaque article contient :
- **Titre** : Titre de l'article
- **Description** : Résumé ou extrait
- **URL** : Lien vers l'article complet
- **Source** : Nom de la source (Le Monde, Google News, etc.)
- **Date de publication** : Quand l'article a été publié
- **Catégorie** : Catégorie de l'article (si disponible)
- **Image** : Image de l'article (si disponible)

## 🔍 Exemples de recherche

### Recherche par sujet
- "intelligence artificielle"
- "changement climatique"
- "santé publique"

### Recherche par catégorie
- Technologie
- Business
- Santé

### Recherches complexes
- "actualités sur la technologie en France"
- "nouvelles sur l'économie mondiale"

## 🎨 Interface

### Composant NewsResults

Affiche les articles avec :
- Titre cliquable
- Description
- Source et date
- Badge de catégorie
- Lien externe vers l'article complet

### Page /news

- Barre de recherche
- Sélecteur de catégorie
- Boutons de catégories populaires
- Affichage des résultats avec pagination

## 🔗 Intégration avec les autres fonctionnalités

### Dashboard
Les actualités peuvent être affichées directement dans le dashboard après une commande vocale.

### Automatisations
Les routines peuvent déclencher des recherches d'actualités et les envoyer via notifications.

### Commandes vocales
Recherche vocale complète avec affichage des résultats.

## 📝 Notes techniques

- **Déduplication** : Les articles en double sont automatiquement supprimés
- **Tri** : Les articles sont triés par date (plus récent en premier)
- **Limite** : Maximum 20 articles par recherche
- **Cache** : Les résultats ne sont pas mis en cache (toujours à jour)

## 🚧 Améliorations futures

- Cache des résultats pour améliorer les performances
- Favoris et sauvegarde d'articles
- Notifications push pour les actualités importantes
- Personnalisation des sources préférées
- Résumé automatique des articles avec IA

---

**Synexa est maintenant une véritable IA capable de rechercher et afficher des actualités sur n'importe quel sujet !** 🤖✨


