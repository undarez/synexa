# Configuration du Chiffrement des Données

Synexa utilise un système de chiffrement AES-256-GCM pour protéger les données sensibles des utilisateurs.

## 🔐 Données Chiffrées

Les champs suivants sont automatiquement chiffrés :

- **Adresses** : `homeAddress`, `workAddress`
- **Coordonnées GPS** : `workLat`, `workLng`
- **Informations de connexion** : `wifiSSID`, `bluetoothDeviceName`
- **Données personnelles** : `firstName`, `lastName`

## 🚀 Configuration Initiale

### 1. Générer une clé de chiffrement

Exécutez le script de génération :

```bash
npx tsx scripts/generate-encryption-key.ts
```

Cela générera une clé aléatoire de 32 bytes en base64.

### 2. Ajouter la clé dans `.env`

Ajoutez la clé générée dans votre fichier `.env` :

```env
ENCRYPTION_KEY=votre_cle_generee_ici
```

**⚠️ IMPORTANT :**
- La clé doit contenir au moins 32 caractères
- Ne commitez JAMAIS cette clé dans Git
- Gardez-la dans un gestionnaire de mots de passe sécurisé
- Si vous perdez cette clé, les données chiffrées seront **irrécupérables**

### 3. Redémarrer le serveur

Après avoir ajouté la clé, redémarrez votre serveur Next.js :

```bash
npm run dev
```

## 🔄 Migration des Données Existantes

Si vous avez déjà des données non chiffrées dans votre base de données, vous devrez les migrer :

1. **Sauvegarder votre base de données** (important !)
2. Les données seront automatiquement chiffrées lors de la prochaine mise à jour
3. Le système détecte les valeurs non chiffrées et les chiffre automatiquement

## 📝 Utilisation dans le Code

### Chiffrer des données

```typescript
import { encrypt, encryptNumber } from "@/app/lib/encryption";

// Chiffrer une string
const encrypted = encrypt("adresse sensible");

// Chiffrer un nombre
const encryptedLat = encryptNumber(48.8566);
```

### Déchiffrer des données

```typescript
import { decrypt, decryptNumber } from "@/app/lib/encryption";

// Déchiffrer une string
const decrypted = decrypt(encrypted);

// Déchiffrer un nombre
const decryptedLat = decryptNumber(encryptedLat);
```

### Helpers automatiques

```typescript
import { encryptUserData, decryptUserData } from "@/app/lib/encryption-helpers";

// Chiffrer toutes les données sensibles d'un objet utilisateur
const encrypted = encryptUserData(userData);

// Déchiffrer toutes les données sensibles
const decrypted = decryptUserData(encryptedUserData);
```

## 🔒 Sécurité

### Algorithme

- **AES-256-GCM** : Chiffrement symétrique avec authentification
- **PBKDF2** : Dérivation de clé avec 100,000 itérations
- **Salt unique** : Chaque valeur chiffrée a son propre salt
- **IV unique** : Chaque chiffrement utilise un vecteur d'initialisation unique
- **Tag d'authentification** : Détection des modifications

### Bonnes Pratiques

1. **Rotation de clé** : Changez la clé périodiquement (tous les 6-12 mois)
2. **Sauvegardes** : Sauvegardez régulièrement votre base de données
3. **Accès limité** : Limitez l'accès à la variable `ENCRYPTION_KEY`
4. **Monitoring** : Surveillez les erreurs de déchiffrement

## 🐛 Dépannage

### Erreur : "ENCRYPTION_KEY n'est pas définie"

**Solution** : Ajoutez `ENCRYPTION_KEY` dans votre fichier `.env`

### Erreur : "ENCRYPTION_KEY doit contenir au moins 32 caractères"

**Solution** : Régénérez une nouvelle clé avec le script de génération

### Données non déchiffrables

**Causes possibles** :
- La clé de chiffrement a changé
- Les données ont été corrompues
- La clé n'est pas la bonne

**Solution** : Restaurez depuis une sauvegarde avec la bonne clé

## 📚 Références

- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)


