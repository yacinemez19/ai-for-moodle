# 🤖 Moodle Gemini Assistant MVP

Extension Chrome qui utilise Gemini AI pour aider à répondre aux questions QCM sur Moodle.

## 🎯 Fonctionnalités

- ✅ Détection automatique des questions sur Moodle
- ✅ Extraction intelligente de la question et des options
- ✅ Support des questions à choix multiples (multichoice)
- ✅ Support des questions d'association/correspondance (match)
- ✅ Support des questions vrai/faux (truefalse)
- ✅ Analyse par Gemini 2.0 Flash Exp
- ✅ Affichage de la réponse suggérée avec justification
- ✅ Interface simple et intuitive

## 📋 Prérequis

- Google Chrome (ou navigateur compatible avec les extensions Chrome)
- Une clé API Gemini (gratuite) : [Obtenir une clé](https://aistudio.google.com/apikey)

## 🚀 Installation

### 1. Télécharger l'extension

Clonez ou téléchargez ce dépôt sur votre ordinateur.

### 2. Installer en mode développeur

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **Mode développeur** (coin supérieur droit)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier de l'extension

### 3. Configurer la clé API

1. Cliquez sur l'icône de l'extension dans la barre d'outils
2. Entrez votre clé API Gemini
3. Cliquez sur **Enregistrer**

## 📖 Utilisation

1. **Naviguez vers une page de quiz Moodle**
   - L'extension fonctionne sur les pages contenant des questions QCM

2. **Utilisez le raccourci clavier**
   - Appuyez sur **Ctrl+K** (Windows/Linux) ou **Cmd+K** (Mac)
   - Un indicateur vous informe du raccourci au chargement de la page

3. **L'extension analyse la question**
   - Un indicateur de chargement apparaît en haut à droite

4. **Consultez la réponse**
   - Un modal s'affiche avec :
     - La question détectée
     - Les options disponibles
     - La réponse suggérée
     - Une justification pédagogique

5. **Fermez le modal**
   - Cliquez sur "Fermer" ou en dehors du modal

## ⚠️ Limitations du MVP

### Ce qui fonctionne
✅ Questions à choix multiples (choix unique ou multiple)
✅ Questions d'association/correspondance (match) avec menus déroulants
✅ Questions vrai/faux (truefalse)
✅ Affichage de la réponse avec justification détaillée

### Ce qui ne fonctionne pas (hors scope MVP)
❌ Questions avec images  
❌ Questions avec formules mathématiques  
❌ Questions ouvertes (essai, texte libre)  
❌ Questions de type "drag and drop"  
❌ Questions numériques
❌ Historique des questions  

## 🔒 Confidentialité et sécurité

- Votre clé API est stockée localement dans votre navigateur
- Les questions sont envoyées à l'API Gemini pour analyse
- Aucune donnée n'est stockée sur des serveurs tiers
- L'extension ne collecte aucune donnée personnelle

## ⚠️ Avertissement

Cette extension est un outil d'aide à l'apprentissage. Les réponses générées par l'IA peuvent contenir des erreurs. **Vérifiez toujours les réponses avant de les utiliser.**

L'utilisation de cet outil pendant des examens officiels peut être considérée comme de la triche. Utilisez-le uniquement pour l'apprentissage et la pratique.

## 🛠️ Structure du projet

```
extension_chat/
├── manifest.json           # Configuration de l'extension
├── popup/
│   ├── popup.html         # Interface de configuration
│   ├── popup.js           # Logique de configuration
│   └── popup.css          # Styles de la popup
├── content.js             # Script d'extraction et UI
├── background.js          # Appel API Gemini
├── styles.css             # Styles du modal
└── README.md              # Documentation
```

## 🐛 Dépannage

### Le raccourci clavier ne fonctionne pas
- Vérifiez que vous êtes sur une page contenant une question supportée :
  - QCM (`.que.multichoice`)
  - Association (`.que.match`)
  - Vrai/Faux (`.que.truefalse`)
- Rechargez la page
- Vérifiez que l'extension est bien activée dans `chrome://extensions/`
- Vérifiez les raccourcis de l'extension dans `chrome://extensions/shortcuts`

### Erreur "Clé API non configurée"
- Ouvrez la popup de l'extension
- Entrez votre clé API Gemini
- Cliquez sur "Enregistrer"

### Erreur API
- Vérifiez que votre clé API est valide
- Vérifiez votre connexion internet
- Consultez la console développeur (F12) pour plus de détails

## 📝 Développement

Pour modifier l'extension :

1. Éditez les fichiers souhaités
2. Allez sur `chrome://extensions/`
3. Cliquez sur l'icône de rechargement de l'extension
4. Rechargez la page Moodle pour tester

## 📄 Licence

Ce projet est un MVP éducatif. Utilisez-le de manière responsable et éthique.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📧 Support

Pour toute question ou problème, consultez d'abord ce README et le fichier DEVBOOK_MVP.md pour plus de détails techniques.

---

**Développé avec ❤️ pour l'apprentissage**

