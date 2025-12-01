# Configuration de l'API TomTom pour le trafic routier

TomTom offre une API gratuite pour les données de trafic en temps réel avec **2500 requêtes/jour gratuites** (plan Freemium).

## 📋 Étapes de configuration

### 1. Créer un compte TomTom Developer

1. Allez sur [https://developer.tomtom.com/](https://developer.tomtom.com/)
2. Cliquez sur **"Sign Up"** ou **"Get Started"**
3. Créez un compte (gratuit, aucune carte de crédit requise)
4. Confirmez votre email

### 2. Créer une application et obtenir la clé API

1. Une fois connecté, allez dans **"My Apps"** ou **"Dashboard"**
2. Cliquez sur **"Add New App"**
3. Remplissez le formulaire :
   - **App Name** : `Synexa Traffic` (ou le nom de votre choix)
   - **App Category** : `Web` ou `Mobile`
   - **App Description** : Description de votre application
4. Cliquez sur **"Create App"**
5. Votre **API Key** sera affichée (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### 3. Configurer la clé API dans Synexa

Ajoutez la clé API dans votre fichier `.env` :

```env
TOMTOM_API_KEY=votre_cle_api_tomtom_ici
```

### 4. Redémarrer le serveur

Après avoir ajouté la clé API, redémarrez votre serveur de développement :

```bash
npm run dev
```

## 🚀 Fonctionnalités disponibles

### Routing API (Itinéraires avec trafic)
- Calcul d'itinéraires optimisés avec données de trafic en temps réel
- Jusqu'à 3 itinéraires alternatifs
- Temps de trajet avec et sans trafic
- Délais de trafic calculés

### Traffic Flow API (Flux de trafic)
- Données de vitesse observée sur les routes
- Temps de parcours en temps réel
- Mises à jour toutes les minutes

### Traffic Incidents API (Incidents)
- Accidents, travaux, embouteillages
- Détails des incidents (type, localisation, durée estimée)
- Descriptions en français

## 📊 Quotas gratuits

- **2500 requêtes/jour** pour les API non-tuiles (Routing, Traffic Flow, Traffic Incidents)
- **50 000 requêtes/jour** pour les tuiles de carte
- Aucune carte de crédit requise
- Parfait pour les applications commerciales

## 🔧 Utilisation dans Synexa

L'API TomTom est utilisée **en priorité** pour le trafic routier. Si la clé API n'est pas configurée ou si une erreur survient, le système bascule automatiquement sur Google Maps (si configuré) ou sur une simulation.

### Endpoints utilisés

1. **Routing API** : `/routing/1/calculateRoute/json`
   - Calcul d'itinéraires avec trafic
   - Utilisé pour la page `/traffic`

2. **Traffic Flow API** : `/traffic/services/4/flowSegmentData/absolute/10/json`
   - Données de flux de trafic sur un segment
   - Utilisé pour obtenir les vitesses en temps réel

3. **Traffic Incidents API** : `/traffic/services/4/incidentDetails`
   - Liste des incidents de trafic dans une zone
   - Utilisé pour afficher les accidents et travaux

## 🐛 Dépannage

### Erreur : "Invalid API Key"
- Vérifiez que `TOMTOM_API_KEY` est bien défini dans `.env`
- Vérifiez que la clé API est correcte dans votre dashboard TomTom
- Redémarrez le serveur après modification de `.env`

### Erreur : "Quota exceeded"
- Vous avez atteint la limite de 2500 requêtes/jour
- Attendez le lendemain ou passez à un plan payant
- Le système basculera automatiquement sur Google Maps si configuré

### Pas de données de trafic
- Vérifiez que `traffic: true` est bien passé dans les paramètres
- Vérifiez que les coordonnées sont valides
- Consultez les logs du serveur pour plus de détails

## 📚 Documentation officielle

- [TomTom Developer Portal](https://developer.tomtom.com/)
- [Routing API Documentation](https://developer.tomtom.com/routing-api/routing-api-documentation)
- [Traffic Flow API Documentation](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction)
- [Traffic Incidents API Documentation](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction)

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Allez sur la page `/traffic`
2. Cliquez sur "Obtenir ma position"
3. Les données de trafic devraient s'afficher avec la source "TomTom"
4. Vérifiez la console du serveur pour les logs `[Traffic]`


