# Configuration des clés API TomTom dans .env

## ⚠️ IMPORTANT

Pour que TomTom fonctionne correctement, vous devez ajouter **DEUX** clés API dans votre fichier `.env` :

## 📝 Configuration requise

Ajoutez ces deux lignes dans votre fichier `.env` à la racine du projet :

```env
# Clé API TomTom pour le serveur (API routes)
TOMTOM_API_KEY=DVJDtq2A9aUOlidj4LyzSOXYJ3QmhgWI

# Clé API TomTom pour le client (carte interactive)
NEXT_PUBLIC_TOMTOM_API_KEY=DVJDtq2A9aUOlidj4LyzSOXYJ3QmhgWI
```

## 🔍 Pourquoi deux clés ?

- **`TOMTOM_API_KEY`** : Utilisée côté serveur pour les appels API (Routing, Traffic, Geocoding)
- **`NEXT_PUBLIC_TOMTOM_API_KEY`** : Utilisée côté client pour charger la carte interactive TomTom Maps SDK

## ✅ Vérification

Après avoir ajouté les clés :

1. **Redémarrez le serveur de développement** :
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   npm run dev
   ```

2. **Vérifiez les logs** :
   - Vous ne devriez plus voir `[TomTom Map] NEXT_PUBLIC_TOMTOM_API_KEY non configurée`
   - Vous ne devriez plus voir `[Traffic] TOMTOM_API_KEY non configurée`
   - Les données devraient venir de `tomtom` et non de `simulation`

3. **Testez sur la page `/traffic`** :
   - Cliquez sur "Obtenir ma position"
   - La carte TomTom devrait se charger
   - Les données de trafic devraient être réelles

## 🐛 Dépannage

### Erreur : "NEXT_PUBLIC_TOMTOM_API_KEY non configurée"
- Vérifiez que la clé est bien dans `.env`
- Vérifiez qu'elle commence par `NEXT_PUBLIC_`
- Redémarrez le serveur

### Erreur : "TOMTOM_API_KEY non configurée"
- Vérifiez que la clé est bien dans `.env`
- Redémarrez le serveur

### Données en mode "simulation"
- Vérifiez que `TOMTOM_API_KEY` est bien configurée
- Vérifiez les logs serveur pour voir les erreurs éventuelles
- Vérifiez que vous avez une destination configurée (adresse de travail ou destination manuelle)

## 📚 Documentation

- [TomTom Developer Portal](https://developer.tomtom.com/)
- [TomTom Maps SDK](https://developer.tomtom.com/maps-sdk/maps-sdk-for-web/)

