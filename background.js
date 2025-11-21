// ============================================
// 1. CONSTRUCTION DU PROMPT
// ============================================

function buildPromptMultichoice(prompt, questionData) {
  const { questionText, subtype, options } = questionData;
  
  prompt += `Réponds à cette question de QCM de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `OPTIONS:\n`;
  
  options.forEach(opt => {
    prompt += `${opt.letter} ${opt.text}\n`;
  });
  
  if (subtype === 'multiple') {
    prompt += `\n⚠️ ATTENTION: Une seule réponse est correcte.\n`;
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

function buildPromptMatch(prompt, questionData) {
  const { questionText, items, choices } = questionData;
  
  prompt += `Réponds à cette question d'association/correspondance de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `ÉLÉMENTS À ASSOCIER:\n`;
  
  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.text}\n`;
  });
  
  prompt += `\nCATÉGORIES DISPONIBLES:\n`;
  
  choices.forEach(choice => {
    prompt += `- ${choice.text}\n`;
  });
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. Associe chaque élément à la catégorie appropriée\n`;
  prompt += `2. Justifie tes choix de manière pédagogique\n`;
  prompt += `3. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REPONSE:\n`;
  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.text} → [nom de la catégorie]\n`;
  });
  prompt += `\nJUSTIFICATION: [Explication brève de tes choix]\n`;
  
  return prompt;
}

function buildPromptTrueFalse(prompt, questionData) {
  const { questionText } = questionData;
  
  prompt += `Réponds à cette question Vrai/Faux de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `OPTIONS:\n`;
  prompt += `- Vrai\n`;
  prompt += `- Faux\n`;
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. Détermine si l'affirmation est vraie ou fausse\n`;
  prompt += `2. Justifie ta réponse de manière pédagogique\n`;
  prompt += `3. Sois concis mais précis\n`;
  prompt += `4. Explique pourquoi c'est vrai ou pourquoi c'est faux\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REPONSE: [Vrai ou Faux]\n`;
  prompt += `JUSTIFICATION: [Explication en 2-3 phrases maximum]\n`;
  
  return prompt;
}

function buildPrompt(questionData) {
  prompt = `Tu es un expert en économie et en gestion d'entreprise. Tu réponds toujours de manière concise et précise. Et tu fais bien attention à donner des réponses correctes.\n`;
  if (questionData.type === 'multichoice') {
    return buildPromptMultichoice(prompt, questionData);
  } else if (questionData.type === 'match') {
    return buildPromptMatch(prompt, questionData);
  } else if (questionData.type === 'truefalse') {
    return buildPromptTrueFalse(prompt, questionData);
  }
  
  throw new Error('Type de question non supporté: ' + questionData.type);
}

// ============================================
// 2. APPEL API GEMINI AVEC FILE SEARCH
// ============================================

async function callGeminiAPI(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  
  // Récupérer la configuration RAG
  const storage = await chrome.storage.local.get(['fileStoreId', 'fileStoreStatus']);
  
  // Construire le body de la requête
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      topK: 40,
      topP: 0.95
    }
  };
  
  // Ajouter File Search si disponible
  if (storage.fileStoreStatus === 'active' && storage.fileStoreId) {
    console.log('[Background] RAG activé avec File Search Store:', storage.fileStoreId);
    
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
- Utilise le format demandé (REPONSE: / JUSTIFICATION:)
- Reste dans le contexte académique de L2 gestion/économie`
      }]
    };
    
    // Référence : https://ai.google.dev/gemini-api/docs/file-search
    body.tools = [{
        file_search: {
        file_search_store_names: [storage.fileStoreId]
      }
    }];
  } else {
    console.log('[Background] RAG non activé, utilisation de la connaissance générale');
  }
  
  // Log de la requête complète pour debug
  console.log('[Background] Requête API Gemini:', JSON.stringify(body, null, 2));
  
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

// ============================================
// 2B. INDEXATION DES COURS (RAG)
// ============================================

async function handleIndexCourses(message) {
  const { apiKey, filesData } = message;
  
  console.log(`[Background] Indexation de ${filesData.length} fichier(s)...`);
  
  try {
    // 1. Créer le File Search Store
    // Référence : https://ai.google.dev/gemini-api/docs/file-search#rest
    console.log('[Background] Création du File Search Store...');
    const storeResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`,
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
      console.error('[Background] Erreur création store:', errorText);
      throw new Error(`Erreur création store (${storeResponse.status}): ${errorText.substring(0, 200)}`);
    }
    
    const store = await storeResponse.json();
    const fileStoreId = store.name;
    console.log('[Background] ✓ Store créé:', fileStoreId);
    
    // 2. Uploader et indexer chaque fichier
    const uploadedFiles = [];
    
    for (let i = 0; i < filesData.length; i++) {
      const fileData = filesData[i];
      console.log(`[Background] Upload de ${fileData.name} (${i + 1}/${filesData.length})...`);
      
      try {
        // Upload du fichier
        const uploadedFile = await uploadAndIndexFile(apiKey, fileData, fileStoreId);
        uploadedFiles.push({
          name: fileData.name,
          uri: uploadedFile.name,
          state: 'ACTIVE',
          mimeType: fileData.mimeType
        });
        
        console.log(`[Background] ✅ ${fileData.name} indexé`);
      } catch (error) {
        console.error(`[Background] ❌ Erreur avec ${fileData.name}:`, error);
        // Continuer avec les autres fichiers
      }
    }
    
    if (uploadedFiles.length === 0) {
      throw new Error('Aucun fichier n\'a pu être indexé');
    }
    
    // 3. Sauvegarder la configuration
    await chrome.storage.local.set({
      fileStoreId: fileStoreId,
      fileStoreStatus: 'active',
      fileStoreFiles: uploadedFiles,
      lastIndexDate: new Date().toISOString()
    });
    
    console.log(`[Background] ✅ Indexation terminée : ${uploadedFiles.length} fichier(s)`);
    
    return {
      fileStoreId: fileStoreId,
      filesCount: uploadedFiles.length
    };
    
  } catch (error) {
    console.error('[Background] Erreur d\'indexation:', error);
    throw error;
  }
}

async function uploadAndIndexFile(apiKey, fileData, fileStoreId) {
    console.log(`[Background] Upload de ${fileData.name} (${fileData.size} bytes) vers ${fileStoreId}...`);
  
    // 1. Décoder le base64 reçu depuis le front
    const byteCharacters = atob(fileData.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
  
    // 2. Construire l’URL d’upload (media)
    const uploadUrl =
      `https://generativelanguage.googleapis.com/upload/v1beta/` +
      `${fileStoreId}:uploadToFileSearchStore?key=${apiKey}`;
  
    console.log('[Background] URL API uploadToFileSearchStore:', uploadUrl);
  
    // 3. Envoyer directement les bytes en body
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': fileData.mimeType || 'application/pdf'
      },
      body: byteArray
    });
  
    const text = await res.text();
    console.log('[Background] Réponse API uploadToFileSearchStore:', res, 'body:', text);
  
    if (!res.ok) {
      throw new Error(`Erreur uploadToFileSearchStore (${res.status}): ${text}`);
    }
  
    // 4. On reçoit une Operation (long-running)
    const operation = JSON.parse(text);
    console.log('[Background] Operation démarrée:', operation.name);
  
    // OPTIONNEL : poll jusqu’à ce que l’indexation soit terminée
    let attempts = 0;
    const maxAttempts = 60; // par ex. 2 minutes si tu mets 2s entre chaque
  
    while (!operation.done && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${apiKey}`
      );
      const statusText = await statusRes.text();
      if (!statusRes.ok) {
        throw new Error(`Erreur polling operation (${statusRes.status}): ${statusText}`);
      }
      const status = JSON.parse(statusText);
      attempts++;
      console.log(`[Background] Operation status (tentative ${attempts}):`, status.done);
      if (status.done) {
        console.log('[Background] ✅ Indexation terminée pour', fileData.name);
        return status; // contient la réponse finale
      }
    }
  
    console.warn('[Background] ⚠️ Operation pas terminée dans le temps imparti');
    return operation; // au pire tu renvoies l’operation pour info
  }
  
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  
  if (message.action === 'indexCourses') {
    handleIndexCourses(message)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Indique une réponse asynchrone
  }
});

// ============================================
// 5. GESTIONNAIRE DE RACCOURCIS CLAVIER
// ============================================

chrome.commands.onCommand.addListener((command) => {
  if (command === 'analyze-question') {
    // Envoyer un message à l'onglet actif pour déclencher l'analyse
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'trigger-analyze' });
      }
    });
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

