# Scripts d'indexation des cours

⚠️ **OBSOLÈTE** : Ce script n'est plus nécessaire ! L'extension v2.0 permet l'upload direct depuis l'interface.

**Utilisez plutôt** : Le bouton "📁 Sélectionner des fichiers" dans le popup de l'extension.

---

## 📌 Note importante

Ce script a été conservé pour référence et pour les utilisateurs avancés qui préfèrent la ligne de commande, mais **il n'est plus la méthode recommandée**.

La nouvelle méthode (upload direct) est :
- ✅ Plus simple (pas de Node.js requis)
- ✅ Plus rapide (interface graphique)
- ✅ Plus intuitive (feedback visuel)

---

Ce dossier contient le script permettant d'indexer vos cours pour utiliser le RAG avec Gemini **via la ligne de commande** (méthode alternative).

## 📋 Prérequis

- Node.js (version 18 ou supérieure)
- Une clé API Gemini valide
- Vos cours au format PDF, TXT ou MD dans un dossier

## 🚀 Utilisation

### 1. Préparez vos cours

Placez tous vos fichiers de cours dans un dossier :

```
mes_cours/
├── Comptabilité_L2.pdf
├── Marketing_Fondamental.pdf
├── Economie_Entreprise.md
└── Notes_Cours.txt
```

### 2. Lancez le script

```bash
node upload_courses.mjs <VOTRE_CLE_API> <CHEMIN_DU_DOSSIER>
```

**Exemple :**

```bash
node upload_courses.mjs AIzaSyAbc123... ./mes_cours
```

### 3. Importez la configuration

Le script génère un fichier `rag_config.json` à la racine de l'extension.

1. Ouvrez l'extension Chrome
2. Cliquez sur l'icône de l'extension
3. Cliquez sur "📥 Importer la configuration"
4. Sélectionnez le fichier `rag_config.json`

C'est terminé ! L'extension utilisera maintenant vos cours pour répondre aux questions.

## 📊 Formats supportés

- **PDF** : Documents PDF standard (max 50 MB par fichier)
- **TXT** : Fichiers texte brut
- **MD** : Fichiers Markdown

## ⚠️ Limitations

- Taille maximale par fichier : 50 MB
- L'indexation peut prendre quelques secondes par fichier
- Les fichiers corrompus seront ignorés

## 🔒 Sécurité

- Votre clé API n'est utilisée que localement
- Les fichiers sont uploadés directement sur les serveurs Google
- Le fichier `rag_config.json` contient des identifiants - ne le partagez pas

## 🐛 Dépannage

### "Erreur création store"

Vérifiez que votre clé API est valide et que vous avez activé l'API Gemini.

### "Aucun fichier PDF/TXT/MD trouvé"

Vérifiez que le chemin du dossier est correct et contient bien des fichiers aux formats supportés.

### "Timeout : indexation trop longue"

Le fichier est peut-être trop volumineux ou le service est temporairement lent. Réessayez plus tard.

## 📚 En savoir plus

Consultez le fichier `DEVBOOK_RAG.md` pour plus de détails techniques.

