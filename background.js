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
    prompt += `\n⚠️ ATTENTION: Plusieurs réponses possibles.\n`;
  }
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. RÉFLÉCHIS d'abord : analyse chaque option, décortique le problème, identifie les pièges\n`;
  prompt += `2. Écris ta réflexion complète avant de donner la réponse\n`;
  prompt += `3. Donne la réponse finale seulement après avoir terminé ton raisonnement\n`;
  prompt += `4. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REFLEXION: [Analyse détaillée de chaque option, décortication du problème, identification des pièges potentiels]\n`;
  prompt += `REPONSE: [lettre(s) de la/des réponse(s) uniquement, ex: "a." ou "a. et c."]\n`;
  
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
  prompt += `1. RÉFLÉCHIS d'abord : analyse chaque élément et chaque catégorie, identifie les liens logiques\n`;
  prompt += `2. Écris ta réflexion complète avant de donner les associations\n`;
  prompt += `3. Donne les associations finales seulement après avoir terminé ton raisonnement\n`;
  prompt += `4. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REFLEXION: [Analyse de chaque élément et catégorie, identification des liens logiques]\n`;
  prompt += `REPONSE:\n`;
  items.forEach((item, index) => {
    prompt += `${index + 1}. ${item.text} → [nom de la catégorie]\n`;
  });
  prompt += `\n`;
  
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
  prompt += `1. RÉFLÉCHIS d'abord : analyse l'affirmation en détail, identifie les points clés\n`;
  prompt += `2. Écris ta réflexion complète avant de donner la réponse Vrai/Faux\n`;
  prompt += `3. Donne la réponse finale seulement après avoir terminé ton raisonnement\n`;
  prompt += `4. Sois concis mais précis\n\n`;
  
  prompt += `FORMAT DE RÉPONSE (IMPORTANT - RESPECTE CE FORMAT):\n`;
  prompt += `REFLEXION: [Analyse détaillée de l'affirmation, identification des points clés qui permettent de déterminer si c'est vrai ou faux]\n`;
  prompt += `REPONSE: [Vrai ou Faux]\n`;
  
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
        temperature: 0.7,
        maxOutputTokens: 800,
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
    
    // Extraire la réflexion et la réponse
    const reflexionMatch = text.match(/REFLEXION:\s*(.+?)(?=\nREPONSE:)/is);
    const reponseMatch = text.match(/REPONSE:\s*(.+?)$/is);
    
    return {
      reasoning: reflexionMatch ? reflexionMatch[1].trim() : 'Pas de réflexion fournie.',
      answer: reponseMatch ? reponseMatch[1].trim() : text.substring(0, 100),
      rawText: text
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      reasoning: 'Impossible d\'extraire la réflexion',
      answer: 'Erreur de parsing',
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

