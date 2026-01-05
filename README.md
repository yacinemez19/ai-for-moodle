# 🤖 Moodle Gemini Assistant

Extension Chrome qui utilise Gemini AI pour aider à répondre aux questions sur Moodle.

## 🎯 Fonctionnalités

- ✅ Détection automatique des questions sur Moodle
- ✅ Support des questions QCM, vrai/faux, et association
- ✅ Mode Normal (modal) et Mode Examen (discret)
- ✅ **RAG** : Utilisez vos propres cours (PDF, TXT, MD)
- ✅ Contrôle du niveau de réflexion de l'IA
- ✅ Page de test intégrée

## 📖 Documentation

> 📚 **Pour commencer** : Consultez le [Guide Utilisateur](./USER_GUIDE.md) pour l'installation et l'utilisation de l'extension.

## 🛠️ Structure du projet

```
extension_chat/
├── manifest.json              # Configuration de l'extension
├── popup/
│   ├── popup.html            # Interface de configuration
│   ├── popup.js              # Logique de configuration
│   └── popup.css             # Styles de la popup
├── content.js                # Script d'extraction et UI
├── background.js             # Appel API Gemini
├── styles.css                # Styles du modal
├── scripts/
│   ├── upload_courses.mjs    # Script d'indexation RAG
│   ├── package.json          # Configuration Node.js
│   └── README.md             # Guide des scripts
├── USER_GUIDE.md             # Guide utilisateur complet
├── DEVBOOK_RAG.md            # Documentation technique RAG
├── rag_config.example.json   # Exemple de configuration RAG
└── README.md                 # Ce fichier
```

## 📝 Développement

Pour modifier l'extension :

1. Éditez les fichiers souhaités
2. Allez sur `chrome://extensions/`
3. Cliquez sur l'icône de rechargement de l'extension
4. Rechargez la page Moodle pour tester

## 📄 Licence

Ce projet est un MVP éducatif. Utilisez-le de manière responsable et éthique, à ne surtout pas utiliser pendant un controle ou un examen officiel.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

---

**Développé avec ❤️ pour l'apprentissage**

