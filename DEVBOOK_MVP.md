# 📘 Devbook MVP - Extension Moodle x Gemini

## 1. Objectif du MVP

Créer une extension Chrome simple qui :
1. Détecte les questions QCM sur Moodle
2. Extrait la question et les options de réponse
3. Envoie à Gemini 2.0 Flash Exp
4. Affiche la réponse dans une popup

**Scope MVP** :
- ✅ Questions à choix multiples uniquement (1 ou plusieurs réponses)
- ✅ Texte simple uniquement (pas d'images, pas de formules)
- ✅ Fonctionnel uniquement (pas de polish UI/UX)
- ❌ Pas de gestion avancée des erreurs
- ❌ Pas de privacy/sécurité avancée
- ❌ Pas de déploiement sur store

## 2. Architecture simplifiée

```
extension/
├── manifest.json           # Config de l'extension
├── popup/
│   ├── popup.html         # Config de la clé API
│   ├── popup.js           # Sauvegarde de la clé
│   └── popup.css          # Styles basiques
├── content.js             # Script injecté + Extraction DOM + UI
├── background.js          # Appel API Gemini
└── styles.css             # Styles du modal
```

## 3. Extraction DOM Moodle

### 3.1 Structure HTML identifiée

```html
<div class="que multichoice">
  <!-- Question -->
  <div class="qtext">
    <p>Texte de la question...</p>
  </div>
  
  <!-- Options -->
  <div class="answer">
    <div class="r0">
      <input type="radio" name="q520242:1_answer" value="0">
      <div data-region="answer-label">
        <span class="answernumber">a. </span>
        <div class="flex-fill"><p>Option A</p></div>
      </div>
    </div>
    <div class="r1">
      <input type="radio" name="q520242:1_answer" value="1">
      <div data-region="answer-label">
        <span class="answernumber">b. </span>
        <div class="flex-fill"><p>Option B</p></div>
      </div>
    </div>
  </div>
</div>
```

### 3.2 Sélecteurs CSS

| Élément | Sélecteur | Usage |
|---------|-----------|-------|
| Container question | `.que.multichoice` | Trouver la question |
| Texte question | `.qtext p` | Extraire le texte |
| Container options | `.answer` | Parent des options |
| Options | `.answer > div[class^="r"]` | Toutes les options |
| Lettre option | `.answernumber` | a., b., c., etc. |
| Texte option | `.flex-fill` | Texte de l'option |
| Type input | `input[type="radio"]` ou `input[type="checkbox"]` | Détecter si choix unique/multiple |

### 3.3 Algorithme d'extraction

```javascript
function extractQuestion() {
  // 1. Trouver la question
  const questionDiv = document.querySelector('.que.multichoice');
  if (!questionDiv) return null;
  
  // 2. Extraire le texte de la question
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  
  // 3. Détecter le type (choix unique ou multiple)
  const hasCheckbox = questionDiv.querySelector('input[type="checkbox"]') !== null;
  const type = hasCheckbox ? 'multiple' : 'single';
  
  // 4. Extraire les options
  const optionDivs = questionDiv.querySelectorAll('.answer > div[class^="r"]');
  const options = [];
  
  optionDivs.forEach(div => {
    const letter = div.querySelector('.answernumber')?.innerText.trim();
    const text = div.querySelector('.flex-fill')?.innerText.trim();
    if (letter && text) {
      options.push({ letter, text });
    }
  });
  
  return { questionText, type, options };
}
```

## 4. API Gemini

### 4.1 Configuration

- **Endpoint** : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`
- **Méthode** : POST
- **Header** : `x-goog-api-key: YOUR_API_KEY`

### 4.2 Prompt structure

```javascript
function buildPrompt(questionData) {
  const { questionText, type, options } = questionData;
  
  let prompt = `Tu es un assistant éducatif. Réponds à cette question de QCM.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `OPTIONS:\n`;
  
  options.forEach(opt => {
    prompt += `${opt.letter} ${opt.text}\n`;
  });
  
  if (type === 'multiple') {
    prompt += `\n(Plusieurs réponses possibles)\n`;
  }
  
  prompt += `\nFORMAT DE RÉPONSE:\n`;
  prompt += `REPONSE: [lettre(s) de la/des réponse(s)]\n`;
  prompt += `JUSTIFICATION: [Explication courte]\n`;
  
  return prompt;
}
```

### 4.3 Requête API

```javascript
async function callGemini(prompt, apiKey) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    }
  );
  
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  
  return parseResponse(text);
}

function parseResponse(text) {
  const reponseMatch = text.match(/REPONSE:\s*(.+?)(?=\n|$)/i);
  const justificationMatch = text.match(/JUSTIFICATION:\s*(.+?)$/is);
  
  return {
    answer: reponseMatch ? reponseMatch[1].trim() : text,
    reasoning: justificationMatch ? justificationMatch[1].trim() : ''
  };
}
```

## 5. Interface utilisateur

### 5.1 Bouton flottant

```html
<button id="gemini-analyze-btn" style="
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  z-index: 9999;
">
  🤖
</button>
```

### 5.2 Modal de réponse

```html
<div id="gemini-modal" style="
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
">
  <div style="
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  ">
    <h2>🤖 Réponse Gemini</h2>
    
    <div style="margin: 16px 0;">
      <h3>Question:</h3>
      <p id="modal-question"></p>
    </div>
    
    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
      <h3>✅ Réponse:</h3>
      <p id="modal-answer" style="font-size: 1.2em; font-weight: bold; color: #16a34a;"></p>
    </div>
    
    <div style="margin: 16px 0;">
      <h3>💡 Justification:</h3>
      <p id="modal-reasoning"></p>
    </div>
    
    <button id="close-modal" style="
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      font-size: 16px;
    ">
      Fermer
    </button>
  </div>
</div>
```

### 5.3 Loading state

```javascript
function showLoading() {
  const btn = document.getElementById('gemini-analyze-btn');
  btn.textContent = '⏳';
  btn.disabled = true;
}

function hideLoading() {
  const btn = document.getElementById('gemini-analyze-btn');
  btn.textContent = '🤖';
  btn.disabled = false;
}
```

## 6. Flux de données complet

```
1. Page Moodle chargée
   ↓
2. content.js injecté
   ↓
3. Détection de .que.multichoice
   ↓
4. Injection du bouton flottant
   ↓
5. User clique sur le bouton
   ↓
6. extractQuestion() → { questionText, type, options }
   ↓
7. Envoyer message à background.js
   chrome.runtime.sendMessage({ action: 'analyze', data: questionData })
   ↓
8. background.js récupère la clé API depuis storage
   chrome.storage.local.get(['apiKey'])
   ↓
9. Construire le prompt
   buildPrompt(questionData)
   ↓
10. Appeler Gemini API
    callGemini(prompt, apiKey)
    ↓
11. Parser la réponse
    parseResponse(text)
    ↓
12. Envoyer la réponse au content.js
    sendResponse({ success: true, data: response })
    ↓
13. Afficher le modal avec la réponse
    showModal(response)
```

## 7. Gestion du storage

```javascript
// Sauvegarder la clé API (popup.js)
chrome.storage.local.set({ apiKey: userInput });

// Récupérer la clé API (background.js)
const { apiKey } = await chrome.storage.local.get(['apiKey']);

// Vérifier si la clé existe
if (!apiKey) {
  return { success: false, error: 'NO_API_KEY' };
}
```

## 8. Manifest.json

```json
{
  "manifest_version": 3,
  "name": "Moodle Gemini Assistant MVP",
  "version": "1.0.0",
  "description": "Réponses QCM Moodle avec Gemini AI",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://*.moodle.*/*",
    "https://*/mod/quiz/*",
    "https://generativelanguage.googleapis.com/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://*.moodle.*/*",
        "https://*/mod/quiz/*"
      ],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html"
  }
}
```

## 9. Code structure

### 9.1 popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Moodle Gemini Assistant</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h2>🤖 Configuration</h2>
    <p>Entrez votre clé API Gemini :</p>
    <input type="password" id="api-key" placeholder="AIzaSy...">
    <button id="save-btn">Enregistrer</button>
    <p id="status"></p>
    <p class="info">
      <a href="https://aistudio.google.com/apikey" target="_blank">
        Obtenir une clé API
      </a>
    </p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### 9.2 popup.js

```javascript
document.getElementById('save-btn').addEventListener('click', async () => {
  const apiKey = document.getElementById('api-key').value.trim();
  const status = document.getElementById('status');
  
  if (!apiKey) {
    status.textContent = '❌ Veuillez entrer une clé API';
    status.style.color = 'red';
    return;
  }
  
  // Sauvegarder
  await chrome.storage.local.set({ apiKey });
  
  status.textContent = '✅ Clé API sauvegardée !';
  status.style.color = 'green';
  
  setTimeout(() => {
    window.close();
  }, 1000);
});

// Charger la clé existante
chrome.storage.local.get(['apiKey'], (result) => {
  if (result.apiKey) {
    document.getElementById('api-key').value = result.apiKey;
  }
});
```

### 9.3 popup.css

```css
body {
  width: 300px;
  padding: 16px;
  font-family: Arial, sans-serif;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  margin: 0;
  color: #667eea;
}

input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #5568d3;
}

.info {
  font-size: 12px;
  color: #666;
}

.info a {
  color: #667eea;
}

#status {
  font-weight: bold;
  margin: 0;
}
```

### 9.4 content.js

```javascript
// ============================================
// 1. EXTRACTION DOM
// ============================================

function extractQuestion() {
  const questionDiv = document.querySelector('.que.multichoice');
  if (!questionDiv) return null;
  
  // Texte de la question
  const questionText = questionDiv.querySelector('.qtext')?.innerText.trim();
  if (!questionText) return null;
  
  // Type de question
  const hasCheckbox = questionDiv.querySelector('input[type="checkbox"]') !== null;
  const type = hasCheckbox ? 'multiple' : 'single';
  
  // Options
  const optionDivs = questionDiv.querySelectorAll('.answer > div[class^="r"]');
  const options = [];
  
  optionDivs.forEach(div => {
    const letter = div.querySelector('.answernumber')?.innerText.trim();
    const text = div.querySelector('.flex-fill')?.innerText.trim();
    if (letter && text) {
      options.push({ letter, text });
    }
  });
  
  if (options.length === 0) return null;
  
  return { questionText, type, options };
}

// ============================================
// 2. BOUTON FLOTTANT
// ============================================

function createFloatingButton() {
  // Ne créer qu'une seule fois
  if (document.getElementById('gemini-analyze-btn')) return;
  
  const button = document.createElement('button');
  button.id = 'gemini-analyze-btn';
  button.innerHTML = '🤖';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    transition: transform 0.2s;
  `;
  
  button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.transform = 'scale(1)';
  });
  
  button.addEventListener('click', handleAnalyze);
  
  document.body.appendChild(button);
}

// ============================================
// 3. ANALYSE DE LA QUESTION
// ============================================

async function handleAnalyze() {
  const button = document.getElementById('gemini-analyze-btn');
  
  // Loading
  button.textContent = '⏳';
  button.disabled = true;
  
  try {
    // Extraire la question
    const questionData = extractQuestion();
    
    if (!questionData) {
      alert('❌ Aucune question détectée sur cette page');
      return;
    }
    
    // Envoyer au background script
    chrome.runtime.sendMessage(
      { action: 'analyze', data: questionData },
      (response) => {
        if (response.success) {
          showModal(questionData, response.data);
        } else {
          alert(`❌ Erreur: ${response.error}`);
        }
      }
    );
    
  } catch (error) {
    alert(`❌ Erreur: ${error.message}`);
  } finally {
    // Reset button
    button.textContent = '🤖';
    button.disabled = false;
  }
}

// ============================================
// 4. MODAL DE RÉPONSE
// ============================================

function showModal(questionData, responseData) {
  // Supprimer le modal existant s'il y en a un
  const existingModal = document.getElementById('gemini-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Créer le modal
  const modal = document.createElement('div');
  modal.id = 'gemini-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <h2 style="margin-top: 0; color: #667eea;">🤖 Réponse Gemini AI</h2>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📝 Question:</h3>
        <p style="color: #555; line-height: 1.5;">${questionData.questionText}</p>
      </div>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">📋 Options:</h3>
        <ul style="color: #555;">
          ${questionData.options.map(opt => `<li>${opt.letter} ${opt.text}</li>`).join('')}
        </ul>
      </div>
      
      <div style="
        background: #f0fdf4;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #22c55e;
        margin: 16px 0;
      ">
        <h3 style="color: #16a34a; margin-top: 0;">✅ Réponse suggérée:</h3>
        <p style="
          font-size: 1.3em;
          font-weight: bold;
          color: #16a34a;
          margin: 8px 0;
        ">${responseData.answer}</p>
      </div>
      
      <div style="margin: 16px 0;">
        <h3 style="color: #333;">💡 Justification:</h3>
        <p style="color: #555; line-height: 1.6;">${responseData.reasoning}</p>
      </div>
      
      <div style="
        background: #fef3c7;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #fbbf24;
        margin: 16px 0;
      ">
        <p style="margin: 0; color: #92400e; font-size: 0.9em;">
          ⚠️ Cette réponse est générée par IA et peut contenir des erreurs. Vérifiez toujours.
        </p>
      </div>
      
      <button id="close-modal-btn" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        margin-top: 8px;
      ">
        Fermer
      </button>
    </div>
  `;
  
  // Ajouter au DOM
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Fermer au clic sur le backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// ============================================
// 5. INITIALISATION
// ============================================

// Détecter si on est sur une page de quiz
if (document.querySelector('.que.multichoice')) {
  createFloatingButton();
}
```

### 9.5 background.js

```javascript
// ============================================
// 1. CONSTRUCTION DU PROMPT
// ============================================

function buildPrompt(questionData) {
  const { questionText, type, options } = questionData;
  
  let prompt = `Tu es un assistant éducatif expert. Réponds à cette question de QCM de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `OPTIONS:\n`;
  
  options.forEach(opt => {
    prompt += `${opt.letter} ${opt.text}\n`;
  });
  
  if (type === 'multiple') {
    prompt += `\n⚠️ ATTENTION: Plusieurs réponses peuvent être correctes.\n`;
  }
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. Identifie la/les bonne(s) réponse(s)\n`;
  prompt += `2. Justifie ton choix de manière pédagogique\n`;
  prompt += `3. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REPONSE: [lettre(s) de la/des réponse(s), ex: "a." ou "a. et c."]\n`;
  prompt += `JUSTIFICATION: [Explication en 2-3 phrases maximum]\n`;
  
  return prompt;
}

// ============================================
// 2. APPEL API GEMINI
// ============================================

async function callGeminiAPI(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
        topK: 40,
        topP: 0.95
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error(`API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// ============================================
// 3. PARSING DE LA RÉPONSE
// ============================================

function parseGeminiResponse(data) {
  try {
    const text = data.candidates[0].content.parts[0].text;
    
    // Extraire la réponse
    const reponseMatch = text.match(/REPONSE:\s*(.+?)(?=\n|$)/i);
    const justificationMatch = text.match(/JUSTIFICATION:\s*(.+?)$/is);
    
    return {
      answer: reponseMatch ? reponseMatch[1].trim() : text.substring(0, 100),
      reasoning: justificationMatch ? justificationMatch[1].trim() : 'Pas de justification fournie.',
      rawText: text
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      answer: 'Erreur de parsing',
      reasoning: 'Impossible d\'extraire la réponse',
      rawText: JSON.stringify(data)
    };
  }
}

// ============================================
// 4. GESTIONNAIRE DE MESSAGES
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyze') {
    handleAnalyze(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Indique une réponse asynchrone
  }
});

async function handleAnalyze(questionData) {
  console.log('[Background] Analyzing question:', questionData);
  
  // 1. Récupérer la clé API
  const storage = await chrome.storage.local.get(['apiKey']);
  
  if (!storage.apiKey) {
    throw new Error('Clé API non configurée. Ouvrez le popup pour la configurer.');
  }
  
  // 2. Construire le prompt
  const prompt = buildPrompt(questionData);
  console.log('[Background] Prompt:', prompt);
  
  // 3. Appeler Gemini
  const apiResponse = await callGeminiAPI(prompt, storage.apiKey);
  console.log('[Background] API Response:', apiResponse);
  
  // 4. Parser la réponse
  const parsedResponse = parseGeminiResponse(apiResponse);
  console.log('[Background] Parsed Response:', parsedResponse);
  
  return parsedResponse;
}
```

### 9.6 styles.css

```css
/* Styles pour éviter les conflits avec Moodle */
#gemini-analyze-btn:hover {
  transform: scale(1.1) !important;
}

#gemini-modal * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

#gemini-modal h2,
#gemini-modal h3 {
  font-weight: 600;
}

#gemini-modal p {
  margin: 8px 0;
}

#gemini-modal ul {
  margin: 8px 0;
  padding-left: 24px;
}

#gemini-modal button:hover {
  background: #5568d3 !important;
  transform: translateY(-1px);
}
```

## 10. Installation et test

### 10.1 Installation en mode développeur

1. Créer un dossier `moodle-gemini-extension/`
2. Créer tous les fichiers listés ci-dessus
3. Ouvrir Chrome → `chrome://extensions/`
4. Activer "Mode développeur" (coin supérieur droit)
5. Cliquer sur "Charger l'extension non empaquetée"
6. Sélectionner le dossier `moodle-gemini-extension/`

### 10.2 Configuration

1. Cliquer sur l'icône de l'extension dans la toolbar
2. Entrer votre clé API Gemini (obtenue sur https://aistudio.google.com/apikey)
3. Cliquer sur "Enregistrer"

### 10.3 Utilisation

1. Naviguer vers une page de quiz Moodle (ex: https://moodle.insa-toulouse.fr/mod/quiz/...)
2. Observer le bouton violet 🤖 en bas à droite
3. Cliquer sur le bouton
4. Attendre la réponse (2-5 secondes)
5. Lire la réponse et la justification dans le modal
6. Cliquer sur "Fermer" ou cliquer en dehors du modal

### 10.4 Tests à effectuer

- [ ] Installation de l'extension
- [ ] Configuration de la clé API
- [ ] Détection du bouton sur page de quiz
- [ ] Extraction d'une question simple (2 options)
- [ ] Extraction d'une question complexe (4+ options)
- [ ] Question à choix unique (radio buttons)
- [ ] Question à choix multiple (checkboxes)
- [ ] Affichage du modal avec la réponse
- [ ] Fermeture du modal (bouton + backdrop)
- [ ] Erreur si clé API invalide
- [ ] Erreur si pas de question détectée

## 11. Limitations du MVP

### Ce qui fonctionne
✅ Questions QCM avec texte simple  
✅ Choix unique ou multiple  
✅ Affichage basique de la réponse  
✅ Configuration simple de la clé API  

### Ce qui ne fonctionne pas (hors scope)
❌ Questions avec images  
❌ Questions avec formules mathématiques  
❌ Questions ouvertes (essai, texte libre)  
❌ Questions de type "drag and drop"  
❌ Historique des questions  
❌ Gestion avancée des erreurs  
❌ UI/UX polie  
❌ Support multi-navigateurs (Firefox, etc.)  

## 12. Temps de développement estimé

| Tâche | Temps |
|-------|-------|
| Setup du projet + manifest | 30 min |
| Popup de configuration | 30 min |
| Extraction DOM | 1h |
| Intégration API Gemini | 1h |
| UI (bouton + modal) | 1h |
| Tests et debug | 1h |
| **TOTAL** | **~5h** |

## 13. Checklist de développement

- [ ] Créer la structure de dossiers
- [ ] Écrire manifest.json
- [ ] Créer popup.html + popup.js + popup.css
- [ ] Créer content.js (extraction + UI)
- [ ] Créer background.js (API Gemini)
- [ ] Créer styles.css
- [ ] Tester l'installation
- [ ] Tester l'extraction DOM
- [ ] Tester l'appel API
- [ ] Tester l'affichage du modal
- [ ] Débugger les erreurs
- [ ] Documentation README

## 14. Points clés de réussite

### 1. Extraction DOM robuste
- Utiliser les bons sélecteurs CSS
- Gérer les cas où la question n'est pas trouvée
- Nettoyer le texte extrait (trim, espaces multiples)

### 2. Prompt engineering
- Format structuré clair pour Gemini
- Instructions précises
- Demander un format de réponse explicite

### 3. Parsing de la réponse
- Utiliser des regex pour extraire REPONSE et JUSTIFICATION
- Fallback si le parsing échoue
- Logger les erreurs pour debug

### 4. Communication entre scripts
- Utiliser `chrome.runtime.sendMessage()` correctement
- Retourner `true` dans le listener pour réponse async
- Gérer les erreurs avec `try/catch`

### 5. UX minimal mais fonctionnel
- Loading state sur le bouton
- Messages d'erreur clairs
- Modal lisible et épuré

---

## 🎯 Résumé

Ce MVP est **simple, fonctionnel et rapide à développer** (~5h).

**Les 3 points critiques** :
1. ✅ Extraction DOM : Récupérer question + options
2. ✅ API Gemini : Prompt structuré + parsing de la réponse
3. ✅ UI : Bouton + Modal pour afficher le résultat

**Prêt à coder ! 🚀**

