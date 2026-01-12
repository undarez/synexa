# Configuration APIs Trafic Réel

## Architecture

L'application utilise des APIs réelles pour afficher le trafic routier et ferroviaire en temps réel :

- **TomTom Traffic API** : Incidents de trafic routier (accidents, bouchons, travaux)
- **SNCF OpenData API** : Perturbations ferroviaires (retards, suppressions)

## Variables d'environnement

Ajoutez ces variables dans `.env.local` :

```bash
# TomTom Traffic API
# Obtenez votre clé sur : https://developer.tomtom.com/
TOMTOM_API_KEY=votre_cle_tomtom_ici

# SNCF OpenData API (optionnel)
# Obtenez votre clé sur : https://www.sncf-connect.com/appli-plan-de-transport
SNCF_API_KEY=votre_cle_sncf_ici
```

## Structure des services

### `app/lib/services/tomtom-traffic.ts`
- `getTomTomTrafficIncidents(bbox, apiKey)` : Récupère les incidents réels depuis TomTom
- `calculateBboxFromBounds(northEast, southWest)` : Calcule la BBOX depuis les bounds de la carte

### `app/lib/services/sncf-opendata.ts`
- `getSNCFDisruptions(lat, lng, radius, apiKey)` : Récupère les perturbations SNCF réelles

## Routes API

### `GET /api/traffic/tomtom`
Récupère les incidents de trafic réels.

**Query params :**
- `bbox` : Bounding box au format "minLon,minLat,maxLon,maxLat" (optionnel)
- `northEast` : Coordonnées nord-est "lat,lng" (optionnel, avec southWest)
- `southWest` : Coordonnées sud-ouest "lat,lng" (optionnel, avec northEast)

**Exemple :**
```
GET /api/traffic/tomtom?bbox=2.0,48.8,2.5,49.0
```

### `GET /api/traffic/sncf`
Récupère les perturbations ferroviaires réelles.

**Query params :**
- `lat` : Latitude de référence
- `lng` : Longitude de référence
- `radius` : Rayon de recherche en km (défaut: 50)

**Exemple :**
```
GET /api/traffic/sncf?lat=48.8566&lng=2.3522&radius=100
```

## Fonctionnement

### Calcul dynamique de BBOX

La BBOX est calculée automatiquement depuis la vue actuelle de la carte :

1. L'utilisateur déplace ou zoome la carte
2. Les événements `moveend` et `zoomend` sont déclenchés
3. La BBOX est recalculée depuis les bounds de la carte
4. Les incidents sont récupérés pour cette nouvelle zone
5. Les incidents sont affichés sur la carte

### Rafraîchissement automatique

- **Trafic routier** : Rafraîchissement toutes les 60 secondes
- **Trafic ferroviaire** : Rafraîchissement toutes les 60 secondes

Les données sont mises à jour automatiquement sans rechargement de la page.

## Sécurité

- ✅ Toutes les clés API sont stockées côté serveur uniquement
- ✅ Les appels API passent par des routes Next.js (`/api/traffic/*`)
- ✅ Aucune clé n'est exposée côté client
- ✅ Authentification requise via `requireUser()`

## Bonnes pratiques

### Rate Limiting
- TomTom : Limite de 2500 requêtes/jour (plan gratuit)
- SNCF : Vérifier les limites de votre plan

### Performance
- Les incidents sont mis en cache pendant 60 secondes
- La BBOX est recalculée uniquement lors des déplacements/zooms
- Les layers sont mis à jour de manière optimisée

### Gestion d'erreurs
- En cas d'erreur API, l'application continue de fonctionner
- Les erreurs sont loggées côté serveur
- L'utilisateur voit un message discret en cas de problème

## Exemple d'utilisation

```typescript
// Dans un composant
const fetchIncidents = async () => {
  const bbox = "2.0,48.8,2.5,49.0"; // BBOX de Paris
  const response = await fetch(`/api/traffic/tomtom?bbox=${bbox}`);
  const data = await response.json();
  console.log(data.incidents); // Incidents réels
};
```

## Notes importantes

⚠️ **La BBOX n'est PAS une simulation**
- Elle est utilisée exclusivement comme fenêtre de requête spatiale
- Elle permet de récupérer les incidents réels visibles dans la zone affichée
- Principe identique à Google Maps / Waze

✅ **Données 100% réelles**
- Tous les incidents proviennent des APIs officielles
- Aucune donnée simulée ou fictive
- Mise à jour en temps réel
