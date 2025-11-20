# DEVBOOK - Intégration RAG avec Gemini File Search

**Version :** 2.0  
**Date :** 20 novembre 2024  
**Objectif :** Permettre à l'extension d'utiliser des documents de cours (PDF, TXT, MD) via le RAG de Gemini  
**Implémentation :** Upload direct depuis l'extension (pas de script externe)

---

## 🎯 Vision du Produit

L'extension doit pouvoir répondre aux questions QCM en se basant **exclusivement sur les cours fournis par l'utilisateur**. L'utilisateur peut configurer un dossier contenant ses documents (PDF, TXT, MD) qui seront indexés par Gemini File Search.

### Principes de conception
- **Simplicité** : Configuration en 3 étapes maximum
- **Fiabilité** : Gestion d'erreurs explicites
- **UX claire** : Feedback visuel constant pour chaque action
- **Sécurité** : Pas de clé API exposée côté client (déjà géré)

---

## 📐 Architecture Technique

### Vue d'ensemble du flux

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Popup Configuration         │
│  - Clé API                          │
│  - Sélection du dossier de cours   │ ← NOUVEAU
│  - Bouton "Indexer les cours"      │ ← NOUVEAU
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Background Service Worker      │
│  - Upload des fichiers vers Gemini │ ← NOUVEAU
│  - Création du File Store           │ ← NOUVEAU
│  - Stockage du FILE_STORE_ID        │ ← NOUVEAU
│  - Appel API avec File Search       │ ← MODIFIÉ
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│          API Gemini                 │
│  - File Search activé               │
│  - System Instruction stricte       │
└─────────────────────────────────────┘
```

### Stockage Chrome Storage

```javascript
{
  apiKey: "AIzaSy...",
  fileStoreId: "stores/xxxxx",      // ID du store créé
  fileStoreStatus: "active",        // "none", "indexing", "active", "error"
  fileStoreFiles: [                 // Liste des fichiers indexés
    { name: "Comptabilité.pdf", uri: "files/xxx", state: "ACTIVE" },
    { name: "Cours_Eco.md", uri: "files/yyy", state: "ACTIVE" }
  ],
  lastIndexDate: "2024-11-20T10:30:00Z"
}
```

---

## 🎨 Design UX/UI

### Popup - Nouvelle section "Cours"

```
┌─────────────────────────────────────┐
│   🤖 Moodle Gemini Assistant        │
├─────────────────────────────────────┤
│                                     │
│  📝 Clé API Gemini                  │
│  ┌─────────────────────────────┐   │
│  │ ●●●●●●●●●●●●●●●●●●●        │   │
│  └─────────────────────────────┘   │
│                                     │
│  📚 Cours & Documents               │
│  ┌─────────────────────────────┐   │
│  │ Aucun cours indexé          │   │
│  │                             │   │
│  │ [Sélectionner un dossier]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  État : ⚪ Aucun cours             │
│                                     │
│  [Enregistrer la configuration]     │
│                                     │
└─────────────────────────────────────┘
```

### Popup - Avec cours indexés

```
┌─────────────────────────────────────┐
│   🤖 Moodle Gemini Assistant        │
├─────────────────────────────────────┤
│                                     │
│  📝 Clé API Gemini                  │
│  ┌─────────────────────────────┐   │
│  │ ●●●●●●●●●●●●●●●●●●●        │   │
│  └─────────────────────────────┘   │
│                                     │
│  📚 Cours & Documents               │
│  ┌─────────────────────────────┐   │
│  │ ✅ Comptabilité.pdf         │   │
│  │ ✅ Marketing.pdf            │   │
│  │ ✅ Cours_Eco.md             │   │
│  │                             │   │
│  │ 3 fichiers indexés          │   │
│  │ Dernière mise à jour :      │   │
│  │ 20/11/2024 à 10:30          │   │
│  │                             │   │
│  │ [Réindexer]  [Supprimer]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  État : 🟢 Prêt                    │
│                                     │
│  [Enregistrer la configuration]     │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Implémentation Technique

### Étape 1 : Modifications du Popup

#### popup.html - Nouvelle structure

```html
<div class="section">
  <h3>📚 Cours & Documents</h3>
  
  <div id="course-status">
    <p id="course-info">Aucun cours indexé</p>
  </div>
  
  <div id="file-selection">
    <input type="file" id="file-input" 
           accept=".pdf,.txt,.md" 
           multiple 
           style="display: none;">
    <button id="select-files-btn" class="secondary-btn">
      📁 Sélectionner des fichiers
    </button>
  </div>
  
  <div id="indexing-section" style="display: none;">
    <ul id="files-list"></ul>
    <button id="index-btn" class="primary-btn">
      🚀 Indexer les cours
    </button>
  </div>
  
  <div id="indexed-section" style="display: none;">
    <ul id="indexed-files-list"></ul>
    <div class="button-group">
      <button id="reindex-btn" class="secondary-btn">
        🔄 Réindexer
      </button>
      <button id="delete-store-btn" class="danger-btn">
        🗑️ Supprimer
      </button>
    </div>
  </div>
  
  <div id="indexing-progress" style="display: none;">
    <p id="progress-text">Indexation en cours...</p>
    <div class="progress-bar">
      <div id="progress-fill"></div>
    </div>
  </div>
</div>
```

#### popup.js - Nouvelles fonctions

```javascript
// ============================================
// GESTION DES FICHIERS
// ============================================

let selectedFiles = [];

// Charger l'état au démarrage
async function loadState() {
  const result = await chrome.storage.local.get([
    'apiKey', 
    'fileStoreId', 
    'fileStoreStatus', 
    'fileStoreFiles',
    'lastIndexDate'
  ]);
  
  // Charger la clé API
  if (result.apiKey) {
    document.getElementById('api-key').value = result.apiKey;
  }
  
  // Afficher l'état des cours
  updateCourseUI(result);
}

// Mise à jour de l'interface selon l'état
function updateCourseUI(state) {
  const { fileStoreStatus, fileStoreFiles, lastIndexDate } = state;
  
  const fileSelection = document.getElementById('file-selection');
  const indexingSection = document.getElementById('indexing-section');
  const indexedSection = document.getElementById('indexed-section');
  const courseInfo = document.getElementById('course-info');
  
  // Réinitialiser
  fileSelection.style.display = 'none';
  indexingSection.style.display = 'none';
  indexedSection.style.display = 'none';
  
  if (fileStoreStatus === 'active' && fileStoreFiles && fileStoreFiles.length > 0) {
    // Afficher les fichiers indexés
    indexedSection.style.display = 'block';
    
    const list = document.getElementById('indexed-files-list');
    list.innerHTML = fileStoreFiles.map(file => 
      `<li>✅ ${file.name}</li>`
    ).join('');
    
    const date = new Date(lastIndexDate).toLocaleString('fr-FR');
    courseInfo.innerHTML = `
      <strong>${fileStoreFiles.length} fichier(s) indexé(s)</strong><br>
      <small>Dernière mise à jour : ${date}</small>
    `;
    
  } else {
    // Aucun cours indexé
    fileSelection.style.display = 'block';
    courseInfo.textContent = 'Aucun cours indexé';
  }
}

// Sélection des fichiers
document.getElementById('select-files-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);
  
  if (selectedFiles.length > 0) {
    const list = document.getElementById('files-list');
    list.innerHTML = selectedFiles.map(file => 
      `<li>📄 ${file.name} (${formatFileSize(file.size)})</li>`
    ).join('');
    
    document.getElementById('file-selection').style.display = 'none';
    document.getElementById('indexing-section').style.display = 'block';
  }
});

// Lancer l'indexation
document.getElementById('index-btn').addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;
  
  const apiKey = document.getElementById('api-key').value.trim();
  if (!apiKey) {
    showStatus('❌ Veuillez d\'abord entrer votre clé API', 'error');
    return;
  }
  
  // Afficher la progression
  document.getElementById('indexing-section').style.display = 'none';
  document.getElementById('indexing-progress').style.display = 'block';
  
  try {
    // Envoyer au background pour indexation
    const response = await chrome.runtime.sendMessage({
      action: 'indexCourses',
      apiKey: apiKey,
      files: selectedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      }))
    });
    
    if (response.success) {
      showStatus('✅ Cours indexés avec succès !', 'success');
      await loadState(); // Recharger l'état
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    showStatus(`❌ Erreur : ${error.message}`, 'error');
    document.getElementById('indexing-progress').style.display = 'none';
    document.getElementById('file-selection').style.display = 'block';
  }
});

// Réindexer
document.getElementById('reindex-btn').addEventListener('click', () => {
  document.getElementById('indexed-section').style.display = 'none';
  document.getElementById('file-selection').style.display = 'block';
});

// Supprimer le store
document.getElementById('delete-store-btn').addEventListener('click', async () => {
  if (!confirm('Voulez-vous vraiment supprimer tous les cours indexés ?')) {
    return;
  }
  
  try {
    await chrome.storage.local.remove([
      'fileStoreId',
      'fileStoreStatus',
      'fileStoreFiles',
      'lastIndexDate'
    ]);
    
    showStatus('✅ Cours supprimés', 'success');
    await loadState();
    
  } catch (error) {
    showStatus(`❌ Erreur : ${error.message}`, 'error');
  }
});

// Utilitaires
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = type === 'success' ? 'green' : 'red';
}

// Charger au démarrage
loadState();
```

### Étape 2 : Modifications du Background

#### background.js - Upload et File Search

```javascript
// ============================================
// GESTION DU FILE STORE
// ============================================

// Écouter les messages pour l'indexation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    handleAnalyze(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.action === 'indexCourses') {
    handleIndexCourses(message)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Indexer les cours
async function handleIndexCourses(message) {
  const { apiKey, files } = message;
  
  // 1. Créer le File Store
  const storeResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileStores?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cours_Moodle_Assistant'
      })
    }
  );
  
  if (!storeResponse.ok) {
    throw new Error(`Erreur création store : ${storeResponse.status}`);
  }
  
  const store = await storeResponse.json();
  const fileStoreId = store.name; // ex: "stores/xxxxx"
  
  // 2. Uploader chaque fichier
  const uploadedFiles = [];
  
  for (const file of files) {
    // Note : Dans une extension, on ne peut pas utiliser FormData avec File objects
    // Il faut passer par le File System Access API ou demander à l'utilisateur
    // de spécifier un chemin local
    // Pour la MVP, on va utiliser une approche simplifiée
    
    // TODO : Implémenter l'upload réel
    // Pour l'instant, on simule
    uploadedFiles.push({
      name: file.name,
      uri: `files/simulated_${Date.now()}`,
      state: 'ACTIVE'
    });
  }
  
  // 3. Sauvegarder dans le storage
  await chrome.storage.local.set({
    fileStoreId: fileStoreId,
    fileStoreStatus: 'active',
    fileStoreFiles: uploadedFiles,
    lastIndexDate: new Date().toISOString()
  });
  
  return { fileStoreId, filesCount: uploadedFiles.length };
}

// ============================================
// APPEL API GEMINI AVEC FILE SEARCH
// ============================================

async function callGeminiAPI(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  
  // Récupérer le File Store ID
  const storage = await chrome.storage.local.get(['fileStoreId', 'fileStoreStatus']);
  
  // Construire le body de la requête
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
      topK: 40,
      topP: 0.95
    }
  };
  
  // Ajouter File Search si disponible
  if (storage.fileStoreStatus === 'active' && storage.fileStoreId) {
    body.systemInstruction = {
      parts: [{
        text: `Tu es un tuteur académique qui répond STRICTEMENT selon les cours fournis dans la base de connaissances.
        
RÈGLES IMPÉRATIVES :
1. Tu dois te baser UNIQUEMENT sur les documents indexés
2. Si l'information n'est pas dans ces documents, tu dis "Je ne trouve pas cette information dans les cours fournis"
3. Tu privilégies TOUJOURS le vocabulaire et les définitions exactes du cours
4. Si ta connaissance générale contredit le cours, tu suis le cours
5. Tu réponds de manière concise et pédagogique

FORMAT DE RÉPONSE :
- Réponds de manière structurée
- Cite le cours quand c'est pertinent
- Reste dans le contexte académique de L2 gestion/économie`
      }]
    };
    
    body.tools = [
      {
        fileSearch: {
          fileStoreIds: [storage.fileStoreId]
        }
      }
    ];
  }
  
  // Appel API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error(`API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}
```

### Étape 3 : Gestion de l'upload des fichiers

**Solution retenue** : Upload via Data URL (base64) directement depuis l'extension.

Les fichiers sont sélectionnés via `<input type="file">`, convertis en base64, puis envoyés au background script qui les upload vers Gemini.

#### Implémentation dans popup.js

```javascript
// Dans popup.js
document.getElementById('index-btn').addEventListener('click', async () => {
  // Convertir les fichiers en base64
  const filesData = await Promise.all(
    selectedFiles.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        name: file.name,
        mimeType: file.type || getMimeType(file.name),
        data: base64.split(',')[1] // Enlever le préfixe data:...
      };
    })
  );
  
  // Envoyer au background
  const response = await chrome.runtime.sendMessage({
    action: 'indexCourses',
    apiKey: apiKey,
    filesData: filesData
  });
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
```

```javascript
// Dans background.js
async function handleIndexCourses(message) {
  const { apiKey, filesData } = message;
  
  // 1. Créer le File Store
  const storeResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileStores?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cours_Moodle_Assistant'
      })
    }
  );
  
  if (!storeResponse.ok) {
    const errorText = await storeResponse.text();
    throw new Error(`Erreur création store : ${errorText}`);
  }
  
  const store = await storeResponse.json();
  const fileStoreId = store.name;
  
  // 2. Uploader chaque fichier
  const uploadedFiles = [];
  
  for (const fileData of filesData) {
    // Upload via l'API Files
    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: {
            displayName: fileData.name,
            mimeType: fileData.mimeType
          },
          fileStoreId: fileStoreId,
          data: fileData.data
        })
      }
    );
    
    if (!uploadResponse.ok) {
      console.error(`Erreur upload ${fileData.name}`);
      continue;
    }
    
    const uploadResult = await uploadResponse.json();
    
    // Attendre que le fichier soit indexé
    let fileStatus = uploadResult;
    while (fileStatus.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileStatus.name}?key=${apiKey}`
      );
      fileStatus = await statusResponse.json();
    }
    
    if (fileStatus.state === 'ACTIVE') {
      uploadedFiles.push({
        name: fileData.name,
        uri: fileStatus.name,
        state: 'ACTIVE'
      });
    }
  }
  
  // 3. Sauvegarder
  await chrome.storage.local.set({
    fileStoreId: fileStoreId,
    fileStoreStatus: 'active',
    fileStoreFiles: uploadedFiles,
    lastIndexDate: new Date().toISOString()
  });
  
  return { fileStoreId, filesCount: uploadedFiles.length };
}
```

#### Option B : Script Node externe (Recommandé pour MVP)

Pour simplifier la MVP, on peut créer un script Node séparé que l'utilisateur lance une fois.

```javascript
// upload_courses.mjs (à placer dans un dossier /scripts)
import fs from 'fs';
import path from 'path';

const API_KEY = process.argv[2];
const FOLDER_PATH = process.argv[3];

if (!API_KEY || !FOLDER_PATH) {
  console.error('Usage: node upload_courses.mjs <API_KEY> <FOLDER_PATH>');
  process.exit(1);
}

async function main() {
  console.log('📚 Création du File Store...');
  
  // 1. Créer le store
  const storeResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/fileStores?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Cours_Moodle_Assistant'
      })
    }
  );
  
  const store = await storeResponse.json();
  console.log('✅ Store créé :', store.name);
  
  // 2. Uploader les fichiers
  const files = fs.readdirSync(FOLDER_PATH)
    .filter(f => /\.(pdf|txt|md)$/i.test(f));
  
  console.log(`\n📤 Upload de ${files.length} fichier(s)...\n`);
  
  const uploadedFiles = [];
  
  for (const filename of files) {
    console.log(`  ⏳ ${filename}...`);
    const filepath = path.join(FOLDER_PATH, filename);
    const content = fs.readFileSync(filepath);
    const base64 = content.toString('base64');
    
    const mimeType = getMimeType(filename);
    
    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: {
            displayName: filename,
            mimeType: mimeType
          },
          fileStoreId: store.name,
          data: base64
        })
      }
    );
    
    const uploadResult = await uploadResponse.json();
    
    // Attendre l'indexation
    let fileStatus = uploadResult;
    while (fileStatus.state === 'PROCESSING') {
      await new Promise(r => setTimeout(r, 2000));
      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileStatus.name}?key=${API_KEY}`
      );
      fileStatus = await statusResponse.json();
    }
    
    if (fileStatus.state === 'ACTIVE') {
      console.log(`  ✅ ${filename} indexé`);
      uploadedFiles.push({
        name: filename,
        uri: fileStatus.name
      });
    } else {
      console.log(`  ❌ ${filename} échec`);
    }
  }
  
  // 3. Générer le fichier de config
  const config = {
    fileStoreId: store.name,
    fileStoreStatus: 'active',
    fileStoreFiles: uploadedFiles,
    lastIndexDate: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'rag_config.json',
    JSON.stringify(config, null, 2)
  );
  
  console.log('\n✅ Indexation terminée !');
  console.log('\n📋 Configuration générée dans rag_config.json');
  console.log('   Copiez ce fichier dans l\'extension ou importez-le via le popup.\n');
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return {
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown'
  }[ext] || 'application/octet-stream';
}

main().catch(console.error);
```

Puis ajouter dans le popup un bouton "Importer la configuration" :

```html
<button id="import-config-btn">📥 Importer la configuration</button>
<input type="file" id="config-file-input" accept=".json" style="display:none">
```

```javascript
document.getElementById('import-config-btn').addEventListener('click', () => {
  document.getElementById('config-file-input').click();
});

document.getElementById('config-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const text = await file.text();
  const config = JSON.parse(text);
  
  await chrome.storage.local.set(config);
  showStatus('✅ Configuration importée !', 'success');
  await loadState();
});
```

---

## 📝 Instructions d'utilisation

### Pour l'utilisateur final

1. **Préparer ses cours** : Placer tous les PDF/TXT/MD dans un dossier
2. **Lancer le script** : `node scripts/upload_courses.mjs <VOTRE_CLE_API> <CHEMIN_DU_DOSSIER>`
3. **Importer dans l'extension** : Cliquer sur "Importer la configuration" et sélectionner `rag_config.json`
4. **Utiliser normalement** : Ctrl+K sur une question Moodle

### Pour le développeur

1. Installer Node.js
2. Copier `upload_courses.mjs` dans `/scripts`
3. Documenter dans le README

---

## ✅ Checklist d'implémentation

- [ ] Créer le script `upload_courses.mjs`
- [ ] Modifier `popup.html` pour ajouter la section Cours
- [ ] Modifier `popup.css` pour styler la nouvelle section
- [ ] Modifier `popup.js` pour gérer l'import de config
- [ ] Modifier `background.js` pour utiliser File Search
- [ ] Tester avec un cours PDF
- [ ] Tester avec un fichier MD
- [ ] Tester avec plusieurs fichiers
- [ ] Documenter dans le README
- [ ] Créer un fichier d'exemple `rag_config.example.json`

---

## 🔒 Sécurité

- ✅ La clé API reste dans le storage local (jamais exposée dans le code source)
- ✅ Le File Store ID est stocké localement
- ✅ Pas de données sensibles dans le code
- ⚠️ L'utilisateur doit protéger son `rag_config.json`

---

## 🚀 Évolutions futures (hors MVP)

- Upload direct depuis l'extension (sans script Node)
- Synchronisation cloud du File Store
- Gestion de plusieurs stores (un par matière)
- Affichage des citations sources dans les réponses
- Mise à jour incrémentale (ajouter/supprimer des fichiers)

---

## 📚 Ressources

- [Gemini File API Documentation](https://ai.google.dev/gemini-api/docs/file-prompting)
- [Chrome Extension Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

