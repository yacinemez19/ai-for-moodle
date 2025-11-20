# 📚 Guide d'utilisation du RAG (Cours personnalisés)

Ce guide vous explique comment configurer l'extension pour qu'elle utilise **vos propres cours** au lieu de la connaissance générale de Gemini.

---

## 🎯 Pourquoi utiliser le RAG ?

Sans RAG, l'extension utilise la **connaissance générale** de Gemini AI. Avec le RAG activé, l'extension :

✅ Répond **exclusivement** à partir de vos cours  
✅ Utilise le **vocabulaire exact** de votre professeur  
✅ Suit les **définitions précises** de vos polys  
✅ Évite les contradictions avec votre programme  

**Exemple concret :**
- **Sans RAG** : "En marketing, un segment est généralement défini comme..."
- **Avec RAG** : "Selon le cours de Marketing L2, page 15 : un segment est..."

---

## 🚀 Configuration en 3 étapes

### Étape 1 : Préparez vos cours

Créez un dossier et placez-y tous vos cours :

```
mes_cours_L2/
├── Comptabilité_Générale.pdf
├── Marketing_Fondamental.pdf
├── Economie_Entreprise.pdf
├── Notes_Cours_Gestion.md
└── Résumés.txt
```

**Formats supportés :**
- 📄 PDF (jusqu'à 50 MB par fichier)
- 📝 TXT (fichiers texte)
- 📋 MD (fichiers Markdown)

**Conseils :**
- Utilisez des noms de fichiers explicites
- Évitez les accents et caractères spéciaux dans les noms
- Organisez vos cours par matière si vous avez beaucoup de fichiers

---

### Étape 2 : Indexez vos cours

#### 2.1. Installez Node.js (si pas déjà fait)

Téléchargez et installez Node.js : https://nodejs.org/

Vérifiez l'installation :
```bash
node --version
```

#### 2.2. Lancez le script d'indexation

Ouvrez un terminal et naviguez vers le dossier de l'extension :

```bash
cd chemin/vers/extension_chat
cd scripts
```

Lancez le script avec votre clé API et le chemin vers vos cours :

```bash
node upload_courses.mjs VOTRE_CLE_API ../mes_cours_L2
```

**Remplacez :**
- `VOTRE_CLE_API` par votre clé API Gemini (ex: `AIzaSyAbc123...`)
- `../mes_cours_L2` par le chemin vers votre dossier de cours

**Exemple complet :**
```bash
node upload_courses.mjs AIzaSyAbc123defGHI456jkl ~/Documents/cours/L2_Gestion
```

#### 2.3. Attendez la fin de l'indexation

Le script va :
1. ✅ Créer un espace de stockage sur Gemini
2. 📤 Uploader tous vos fichiers
3. ⏳ Attendre l'indexation complète (quelques secondes par fichier)
4. 💾 Générer un fichier `rag_config.json`

**Exemple de sortie :**
```
╔════════════════════════════════════════════╗
║  Moodle Gemini Assistant - Indexation     ║
╚════════════════════════════════════════════╝

📚 Création du File Store...
✅ Store créé : stores/abc123xyz

📤 Upload de 3 fichier(s)...

  ✅ Comptabilité_Générale.pdf (2.4 MB) indexé
  ✅ Marketing_Fondamental.pdf (1.8 MB) indexé
  ✅ Notes_Cours.md (125 KB) indexé

═══════════════════════════════════════════════
✅ Indexation terminée !

📊 Résultat :
   - Fichiers indexés : 3

📋 Configuration générée :
   /chemin/vers/extension_chat/rag_config.json

📌 Prochaines étapes :
   1. Ouvrez l'extension Chrome
   2. Cliquez sur "Importer la configuration"
   3. Sélectionnez le fichier rag_config.json

═══════════════════════════════════════════════
```

---

### Étape 3 : Importez la configuration dans l'extension

#### 3.1. Ouvrez l'extension

Cliquez sur l'icône de l'extension dans Chrome.

#### 3.2. Importez la configuration

1. Cliquez sur le bouton **"📥 Importer la configuration"**
2. Sélectionnez le fichier `rag_config.json` (généré à l'étape 2)
3. Attendez le message de confirmation

**Interface attendue :**

```
┌─────────────────────────────────────┐
│   🤖 Moodle Gemini Assistant        │
├─────────────────────────────────────┤
│  📚 Cours & Documents               │
│  ┌─────────────────────────────┐   │
│  │ ✅ Comptabilité_Générale.pdf│   │
│  │ ✅ Marketing_Fondamental.pdf│   │
│  │ ✅ Notes_Cours.md           │   │
│  │                             │   │
│  │ 3 fichiers indexés          │   │
│  │ Dernière mise à jour :      │   │
│  │ 20/11/2024 à 10:30          │   │
│  └─────────────────────────────┘   │
│                                     │
│  État : 🟢 Prêt                    │
└─────────────────────────────────────┘
```

#### 3.3. C'est terminé !

Vous pouvez maintenant utiliser l'extension normalement. Elle utilisera vos cours pour répondre aux questions.

---

## 🔧 Utilisation quotidienne

### Utiliser l'extension avec le RAG activé

Rien ne change ! Utilisez l'extension comme d'habitude :

1. Allez sur une question Moodle
2. Appuyez sur **Ctrl+K** (ou Cmd+K sur Mac)
3. Consultez la réponse

**La différence :**
- L'extension va chercher la réponse **dans vos cours**
- Si l'information n'est pas dans vos cours, elle vous le dira
- Les réponses utilisent le vocabulaire de vos polys

### Vérifier que le RAG est actif

Dans le popup de l'extension, vérifiez que vous voyez :
- ✅ Une liste de vos fichiers indexés
- 🟢 L'état "Prêt"

Si vous voyez "Aucun cours indexé", le RAG n'est pas actif.

---

## 🔄 Mise à jour de vos cours

### Quand mettre à jour ?

Mettez à jour vos cours quand :
- Vous ajoutez de nouveaux chapitres
- Le professeur distribue des nouveaux polys
- Vous voulez ajouter vos notes personnelles
- Vous voulez changer de matière

### Comment mettre à jour ?

#### Option 1 : Réindexer complètement

1. Ajoutez les nouveaux fichiers dans votre dossier de cours
2. Relancez le script d'indexation (Étape 2)
3. Importez la nouvelle configuration (Étape 3)

#### Option 2 : Supprimer et recommencer

1. Dans le popup de l'extension, cliquez sur **"🗑️ Supprimer"**
2. Suivez les 3 étapes de configuration depuis le début

**Note :** La suppression ne supprime pas les fichiers de votre ordinateur, seulement la configuration de l'extension.

---

## ❓ FAQ

### Combien de fichiers puis-je indexer ?

Il n'y a pas de limite stricte, mais :
- Maximum **50 MB par fichier**
- Plus vous avez de fichiers, plus l'indexation est longue
- Recommandé : 5-15 fichiers par matière

### Les cours sont-ils stockés localement ?

Non. Le processus est :
1. Vos fichiers sont **uploadés sur les serveurs Google**
2. Gemini les indexe et crée une base de connaissances
3. L'extension stocke uniquement l'**identifiant** de cette base
4. À chaque question, Gemini cherche dans cette base

### Puis-je avoir plusieurs configurations ?

Pour la MVP, une seule configuration à la fois. Pour utiliser différents cours :
1. Supprimez la configuration actuelle
2. Indexez les nouveaux cours
3. Importez la nouvelle configuration

**Astuce :** Gardez plusieurs fichiers `rag_config.json` avec des noms différents :
- `rag_config_compta.json`
- `rag_config_marketing.json`
- `rag_config_eco.json`

### Mes cours sont-ils partagés avec d'autres utilisateurs ?

Non. Vos cours sont :
- ✅ Liés à **votre clé API**
- ✅ Stockés dans **votre espace Gemini**
- ✅ Accessibles uniquement par vous

### Puis-je voir mes fichiers indexés sur Google ?

Oui, via l'API Gemini Files Manager (interface web à venir).

### Le RAG coûte-t-il plus cher ?

L'indexation des fichiers et les recherches sont incluses dans l'offre gratuite de Gemini (avec quotas).

### Que se passe-t-il si je perds le fichier rag_config.json ?

Deux options :
1. **Créer un nouveau store** : Réindexez vos cours
2. **Récupérer l'ID** : Si vous connaissez votre File Store ID, vous pouvez recréer manuellement le fichier JSON

**Format du fichier :**
```json
{
  "fileStoreId": "stores/VOTRE_ID",
  "fileStoreStatus": "active",
  "fileStoreFiles": [...],
  "lastIndexDate": "2024-11-20T10:30:00.000Z"
}
```

### L'extension fonctionne-t-elle sans le RAG ?

Oui ! Le RAG est **optionnel**. Sans RAG, l'extension utilise la connaissance générale de Gemini.

---

## 🐛 Dépannage

### "Erreur création store"

**Causes possibles :**
- Clé API invalide
- Clé API sans accès à l'API Gemini Files
- Problème réseau

**Solutions :**
1. Vérifiez votre clé API sur https://aistudio.google.com/apikey
2. Vérifiez votre connexion internet
3. Essayez de régénérer une nouvelle clé API

### "Aucun fichier PDF/TXT/MD trouvé"

**Causes :**
- Le chemin du dossier est incorrect
- Les fichiers n'ont pas les bonnes extensions

**Solutions :**
1. Vérifiez le chemin : `ls chemin/vers/dossier` (Mac/Linux) ou `dir chemin\vers\dossier` (Windows)
2. Vérifiez les extensions : `.pdf`, `.txt`, `.md` (en minuscules)

### "Timeout : indexation trop longue"

**Causes :**
- Fichier trop volumineux
- Service Gemini temporairement lent

**Solutions :**
1. Réessayez dans quelques minutes
2. Divisez les gros fichiers en plusieurs parties
3. Compressez vos PDF si possible

### L'extension ne trouve pas l'information dans mes cours

**Causes possibles :**
- L'information n'est pas dans les cours indexés
- La formulation de la question est trop différente
- Le PDF est scanné (image) et non textuel

**Solutions :**
1. Vérifiez que le cours contient bien cette information
2. Ajoutez des notes complémentaires en TXT/MD
3. Pour les PDF scannés, utilisez un OCR pour extraire le texte

### "État : ⚪ Aucun cours" dans le popup

**Causes :**
- La configuration n'a pas été importée
- Le stockage Chrome a été effacé

**Solutions :**
1. Importez à nouveau le fichier `rag_config.json`
2. Si vous ne l'avez plus, réindexez vos cours

---

## 📊 Exemples d'utilisation

### Exemple 1 : Cours de Comptabilité

**Fichiers :**
- `Comptabilité_L2_Chapitre1_Bilan.pdf`
- `Comptabilité_L2_Chapitre2_Compte_Résultat.pdf`
- `Exercices_Corrigés.pdf`

**Question Moodle :**
> "Quelle est la différence entre un bilan et un compte de résultat ?"

**Réponse avec RAG :**
> "Selon le cours de Comptabilité L2 Chapitre 1 : Le bilan est une photographie du patrimoine de l'entreprise à un instant T, tandis que le compte de résultat (Chapitre 2) retrace l'activité de l'entreprise sur une période donnée..."

### Exemple 2 : Cours de Marketing

**Fichiers :**
- `Marketing_Fondamental.pdf`
- `Notes_CM_Marketing.md` (vos notes personnelles)

**Question Moodle :**
> "Qu'est-ce qu'un segment de marché ?"

**Réponse avec RAG :**
> "D'après le cours de Marketing Fondamental : Un segment de marché est un sous-groupe de consommateurs partageant des caractéristiques communes..."

### Exemple 3 : Mélange de formats

**Fichiers :**
- `Cours_Eco.pdf` (poly du prof)
- `Résumés_Perso.md` (vos fiches)
- `Définitions.txt` (glossaire)

L'extension va chercher dans **tous ces fichiers** pour construire sa réponse.

---

## 📚 Pour aller plus loin

- **DEVBOOK_RAG.md** : Documentation technique complète
- **scripts/README.md** : Détails sur le script d'indexation
- **DEVBOOK_MVP.md** : Architecture générale de l'extension

---

## 💡 Astuces avancées

### Astuce 1 : Créez des fichiers de synthèse

Au lieu d'indexer 50 pages de cours, créez un fichier Markdown de synthèse :

```markdown
# Synthèse Comptabilité L2

## Définitions clés

**Actif** : Ce que l'entreprise possède
**Passif** : Ce que l'entreprise doit

## Formules importantes

Résultat = Produits - Charges
```

Plus concis = réponses plus rapides et précises.

### Astuce 2 : Ajoutez des mots-clés

Dans vos fichiers TXT/MD, ajoutez des mots-clés pour faciliter la recherche :

```markdown
# Question type examen : Bilan

Mots-clés : actif, passif, patrimoine, comptabilité, bilan

[Votre réponse détaillée...]
```

### Astuce 3 : Un dossier par matière

Organisez vos fichiers :

```
cours/
├── Comptabilité/
│   └── [fichiers compta]
├── Marketing/
│   └── [fichiers marketing]
└── Économie/
    └── [fichiers éco]
```

Indexez la matière dont vous avez besoin au moment de l'examen.

---

**✅ Vous êtes maintenant prêt à utiliser le RAG !**

Si vous avez des questions, consultez la section Dépannage ou le README principal.

