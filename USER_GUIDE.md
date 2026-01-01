# 📖 Guide Utilisateur - Moodle Gemini Assistant

> Extension Chrome qui utilise l'IA Gemini pour vous aider à répondre aux questions sur Moodle.

---

## 🚀 Installation

### Étape 1 : Installer l'extension

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **Mode développeur** (coin supérieur droit)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier de l'extension

### Étape 2 : Configurer la clé API

1. Cliquez sur l'icône de l'extension 🤖 dans la barre d'outils Chrome
2. Entrez votre clé API Gemini dans le champ prévu
3. Cliquez sur **💾 Enregistrer**

> 💡 **Obtenir une clé API** : Rendez-vous sur [Google AI Studio](https://aistudio.google.com/apikey) (gratuit)

---

## 🎯 Utilisation

### Raccourci clavier

| Système | Raccourci |
|---------|-----------|
| Windows / Linux | `Ctrl + K` |
| Mac | `Cmd + K` |

### Comment ça marche

1. **Naviguez** vers une page de quiz Moodle
2. **Appuyez** sur le raccourci clavier (`Ctrl+K` ou `Cmd+K`)
3. **Attendez** quelques secondes (le texte de la question passe en *italique* pendant le chargement)
4. **Consultez** la réponse affichée

---

## 🎮 Modes d'affichage

L'extension propose **deux modes** d'affichage des réponses :

### 💬 Mode Normal (par défaut)

Un **modal** s'affiche avec :
- La question détectée
- Les options disponibles
- ✅ La réponse suggérée
- 💡 Une justification pédagogique
- ⚠️ Un rappel de vérifier la réponse

### 📝 Mode Examen

Un mode **discret** qui modifie directement la page :

| Type de question | Comportement |
|-----------------|--------------|
| **QCM** | La bonne réponse passe en **gras** |
| **Vrai/Faux** | La bonne réponse passe en **gras** |
| **Autres** (association, etc.) | Affichage ligne par ligne via des popups |

#### Activer le Mode Examen

1. Cliquez sur l'icône de l'extension
2. Dans la section **Mode d'affichage**, basculez le switch vers **Mode Examen**
3. Le changement est immédiat

---

## 📚 Utiliser vos propres cours (RAG)

Vous pouvez indexer vos cours pour que l'IA réponde en se basant sur **vos documents** plutôt que sur ses connaissances générales.

### Indexer des cours

1. Ouvrez le popup de l'extension
2. Dans la section **Cours & Documents (RAG)**, cliquez sur **📁 Sélectionner des fichiers**
3. Choisissez vos fichiers (formats supportés : PDF, TXT, MD)
4. Cliquez sur **🚀 Indexer les cours**
5. Attendez la fin de l'indexation

### Statut RAG

| Indicateur | Signification |
|------------|---------------|
| 🟢 | RAG actif - L'IA utilise vos cours |
| ⚪ | RAG inactif - L'IA utilise ses connaissances générales |

### Gérer les cours indexés

- **🔄 Réindexer** : Remplace les anciens cours par de nouveaux
- **🗑️ Supprimer** : Supprime tous les cours indexés

---

## ✅ Types de questions supportés

| Type | Support |
|------|---------|
| QCM (choix unique) | ✅ Complet |
| QCM (choix multiples) | ✅ Complet |
| Vrai / Faux | ✅ Complet |
| Association / Correspondance | ✅ Basique |

### Types non supportés

❌ Questions avec images  
❌ Questions avec formules mathématiques  
❌ Questions ouvertes (essai, texte libre)  
❌ Questions de type "drag and drop"  
❌ Questions numériques

---

## 🧪 Page de test

Testez votre configuration sans aller sur Moodle :

1. Ouvrez le popup de l'extension
2. Cliquez sur **🧪 Ouvrir la page de test RAG**
3. Testez avec les questions prédéfinies ou créez les vôtres

---

## 🔧 Dépannage

### Le raccourci ne fonctionne pas

- Vérifiez que vous êtes sur une page Moodle avec une question
- Rechargez la page (`F5`)
- Vérifiez que l'extension est activée dans `chrome://extensions/`

### Erreur "Clé API non configurée"

1. Ouvrez le popup de l'extension
2. Entrez votre clé API Gemini
3. Cliquez sur **💾 Enregistrer**

### Erreur API

- Vérifiez que votre clé API est valide
- Vérifiez votre connexion internet
- Réessayez dans quelques secondes

---

## 🔒 Confidentialité

- ✅ Votre clé API est stockée **localement** dans votre navigateur
- ✅ Aucune donnée n'est stockée sur des serveurs tiers
- ✅ L'extension ne collecte aucune donnée personnelle
- ⚠️ Les questions sont envoyées à l'API Gemini de Google pour analyse

---

## ⚠️ Avertissement important

> **Cette extension est un outil d'aide à l'apprentissage.**
> 
> - Les réponses générées par l'IA peuvent contenir des erreurs
> - **Vérifiez toujours les réponses** avant de les utiliser
> - L'utilisation pendant des examens officiels peut être considérée comme de la triche
> - Utilisez cet outil de manière **responsable et éthique**

---

## 📞 Support

Pour toute question ou problème :
1. Consultez ce guide
2. Vérifiez la section Dépannage
3. Consultez la console développeur (`F12` → Console) pour les erreurs techniques

---

**Développé avec ❤️ pour l'apprentissage**
