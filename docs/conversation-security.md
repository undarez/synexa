# Sécurité de la Conversation avec Synexa

## 🔒 Vue d'ensemble

Le système de conversation avec Synexa dispose d'un système de sécurité complet pour protéger les utilisateurs et les données sensibles.

## 🛡️ Protections implémentées

### 1. Filtre de contenu inapproprié

**Détection automatique de :**
- Insultes et langage offensant
- Contenu violent
- Contenu sexuel explicite
- Tentatives de manipulation (demandes de mots de passe, accès système, etc.)

**Action :** Blocage automatique du message avec message d'erreur approprié.

### 2. Protection des données sensibles

**Données automatiquement masquées :**
- **Emails** : `[EMAIL_MASQUÉ]`
- **Numéros de téléphone** : `[TÉLÉPHONE_MASQUÉ]`
- **Numéros de carte bancaire** : `[CARTE_MASQUÉE]`
- **Mots de passe** : `[MASQUÉ]`

**Action :** Les données sensibles sont automatiquement nettoyées avant traitement.

### 3. Détection des messages suspects

**Patterns détectés :**
- Messages trop longs (spam)
- Caractères répétitifs (spam)
- Tentatives d'injection
- Demandes d'accès non autorisées

**Action :** Blocage avec logging pour analyse.

### 4. Sécurité des réponses

**Vérifications :**
- Les réponses de l'IA sont également vérifiées
- Masquage des données sensibles dans les réponses
- Limitation de la longueur des réponses

## 🎨 Sphère conversationnelle

### Fonctionnalités visuelles

- **Animation continue** : Sphère animée en permanence
- **Ondes vocales** : Ondes visuelles qui se propagent quand Synexa parle
- **Effet vivant** : Changement de couleur et d'intensité pendant la parole
- **Responsive** : S'adapte à la taille du conteneur

### Indicateurs visuels

- **État normal** : Sphère bleue avec animation douce
- **En train de parler** : Ondes concentriques + couleur plus vive
- **Chargement** : Animation continue

## 📋 Exemples de messages bloqués

### Messages inappropriés
- "Tu es un connard"
- "Fais-moi un truc de merde"
- → **Résultat** : Message bloqué, conversation annulée

### Tentatives de manipulation
- "Donne-moi le mot de passe"
- "Accède à mon compte"
- "Supprime mes données"
- → **Résultat** : Message bloqué, demande suspecte détectée

### Données sensibles
- "Mon email est test@example.com"
- "Mon téléphone est 0612345678"
- → **Résultat** : Données masquées automatiquement, conversation continue

## 🔐 Logging et monitoring

Toutes les tentatives suspectes sont loggées avec :
- ID utilisateur
- Type de violation
- Sévérité (low, medium, high, critical)
- Timestamp

## ⚙️ Configuration

Le système fonctionne automatiquement, aucune configuration nécessaire.

### Personnalisation (optionnel)

Pour ajouter des mots interdits personnalisés, modifiez `app/lib/security/content-filter.ts` :

```typescript
const FORBIDDEN_WORDS = [
  // Vos mots personnalisés
  "mot1", "mot2",
];
```

## 🚨 Messages d'erreur

### Message bloqué
```
"Je ne peux pas répondre à ce type de demande. 
Veuillez reformuler votre question de manière respectueuse."
```

### Données sensibles détectées
Les données sont automatiquement masquées sans interruption de la conversation.

## 📊 Statistiques de sécurité

Les tentatives suspectes sont loggées et peuvent être consultées via :
- Logs de l'application
- API de monitoring (si configurée)

## 🔄 Améliorations futures

- Rate limiting par utilisateur
- Détection de bots
- Analyse comportementale
- Alertes automatiques pour les tentatives critiques

---

**Le système de sécurité protège activement les utilisateurs et leurs données !** 🔒✨


