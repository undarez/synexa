# API TomTom pour Automatisation

## 📋 Vue d'ensemble

L'API `/api/traffic/automation` permet d'obtenir des données de trafic structurées pour l'automatisation et les routines.

## 🔐 Authentification

L'API nécessite une authentification via session NextAuth.

## 📡 Endpoint

```
GET /api/traffic/automation
```

## 📥 Paramètres de requête

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `originLat` | number | ✅ Oui | Latitude de la position de départ |
| `originLng` | number | ✅ Oui | Longitude de la position de départ |
| `destinationLat` | number | ✅ Oui | Latitude de la position d'arrivée |
| `destinationLng` | number | ✅ Oui | Longitude de la position d'arrivée |
| `includeIncidents` | boolean | ❌ Non | Inclure les incidents (défaut: `true`) |
| `includeFlow` | boolean | ❌ Non | Inclure les données de flux (défaut: `true`) |

## 📤 Réponse

### Succès (200)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "origin": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "destination": {
    "lat": 48.8606,
    "lng": 2.3376
  },
  "routes": [
    {
      "name": "Itinéraire principal",
      "duration": 900,
      "distance": 5000,
      "traffic": "Fluide",
      "status": "good",
      "details": "Aucun incident signalé"
    }
  ],
  "bestRoute": {
    "duration": 900,
    "distance": 5000,
    "traffic": "Fluide",
    "status": "good"
  },
  "incidents": [
    {
      "type": "ACCIDENT",
      "lat": 48.8580,
      "lng": 2.3450,
      "description": "Accident sur la route",
      "delay": 300,
      "category": 1
    }
  ],
  "trafficFlow": {
    "currentSpeed": 50,
    "freeFlowSpeed": 60,
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    }
  }
}
```

### Erreur (400/401/500)

```json
{
  "error": "Message d'erreur"
}
```

## 💡 Exemples d'utilisation

### Exemple 1 : Vérifier le trafic avant de partir

```typescript
const response = await fetch(
  `/api/traffic/automation?originLat=48.8566&originLng=2.3522&destinationLat=48.8606&destinationLng=2.3376`
);
const data = await response.json();

if (data.bestRoute.status === "bad" || data.bestRoute.duration > 1800) {
  // Trafic dense ou temps de trajet > 30 min
  // Envoyer une notification ou déclencher une action
}
```

### Exemple 2 : Routine automatique basée sur le trafic

```typescript
// Dans une routine Synexa
const checkTraffic = async () => {
  const response = await fetch(
    `/api/traffic/automation?originLat=${homeLat}&originLng=${homeLng}&destinationLat=${workLat}&destinationLng=${workLng}`
  );
  const data = await response.json();
  
  if (data.bestRoute.status === "heavy" || data.bestRoute.status === "bad") {
    // Trafic dense détecté
    // Déclencher une action (ex: réveil plus tôt, notification)
    return {
      action: "notify",
      message: `Trafic dense détecté. Temps de trajet estimé: ${Math.round(data.bestRoute.duration / 60)} minutes`,
    };
  }
  
  return {
    action: "none",
    message: "Trafic fluide",
  };
};
```

### Exemple 3 : Vérifier les incidents

```typescript
const response = await fetch(
  `/api/traffic/automation?originLat=48.8566&originLng=2.3522&destinationLat=48.8606&destinationLng=2.3376&includeIncidents=true`
);
const data = await response.json();

if (data.incidents.length > 0) {
  // Incidents détectés sur l'itinéraire
  const criticalIncidents = data.incidents.filter(
    (incident) => incident.delay && incident.delay > 600
  );
  
  if (criticalIncidents.length > 0) {
    // Incidents critiques (délai > 10 min)
    // Prendre une action
  }
}
```

## 🔄 Statuts de trafic

| Statut | Description | Action recommandée |
|--------|-------------|-------------------|
| `good` | Trafic fluide | Aucune action |
| `moderate` | Trafic modéré | Surveillance |
| `heavy` | Trafic dense | Notification optionnelle |
| `bad` | Trafic bloqué | Notification + action recommandée |

## 📊 Données disponibles

### Routes
- **duration** : Durée en secondes
- **distance** : Distance en mètres
- **traffic** : Niveau de trafic (Fluide, Modéré, Dense, Bloqué)
- **status** : Statut du trafic (good, moderate, heavy, bad)
- **details** : Détails supplémentaires

### Incidents
- **type** : Type d'incident
- **lat/lng** : Coordonnées de l'incident
- **description** : Description de l'incident
- **delay** : Délai estimé en secondes
- **category** : Catégorie d'icône TomTom

### Traffic Flow
- **currentSpeed** : Vitesse actuelle (km/h)
- **freeFlowSpeed** : Vitesse sans trafic (km/h)
- **coordinates** : Coordonnées du point de mesure

## 🚀 Intégration dans les routines

Vous pouvez utiliser cette API dans vos routines Synexa pour :

1. **Vérifier le trafic avant de partir** : Déclencher une notification si le trafic est dense
2. **Ajuster les horaires** : Modifier automatiquement les rappels en fonction du trafic
3. **Choisir un itinéraire** : Sélectionner automatiquement le meilleur itinéraire
4. **Détecter les incidents** : Alerter l'utilisateur en cas d'incident majeur

## ⚠️ Limitations

- **Quota** : 2500 requêtes/jour (plan gratuit TomTom)
- **Authentification** : Nécessite une session active
- **Coordonnées** : Doivent être valides (latitude/longitude)

## 📚 Documentation complémentaire

- [TomTom Routing API](https://developer.tomtom.com/routing-api/routing-api-documentation)
- [TomTom Traffic Flow API](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction)
- [TomTom Traffic Incidents API](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction)





