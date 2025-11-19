// ============================================
// 1. CONSTRUCTION DU PROMPT
// ============================================

function buildPromptMultichoice(questionData) {
  const { questionText, subtype, options } = questionData;
  
  let prompt = `Tu es un assistant éducatif expert. Réponds à cette question de QCM de manière précise.\n\n`;
  prompt += `QUESTION:\n${questionText}\n\n`;
  prompt += `OPTIONS:\n`;
  
  options.forEach(opt => {
    prompt += `${opt.letter} ${opt.text}\n`;
  });
  
  if (subtype === 'multiple') {
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

function buildPromptMatch(questionData) {
  const { questionText, items, choices } = questionData;
  
  let prompt = `Tu es un assistant éducatif expert. Réponds à cette question d'association/correspondance de manière précise.\n\n`;
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

function buildPromptTrueFalse(questionData) {
  const { questionText } = questionData;
  
  let prompt = `Tu es un assistant éducatif expert. Réponds à cette question Vrai/Faux de manière précise.\n\n`;
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
  if (questionData.type === 'multichoice') {
    return buildPromptMultichoice(questionData);
  } else if (questionData.type === 'match') {
    return buildPromptMatch(questionData);
  } else if (questionData.type === 'truefalse') {
    return buildPromptTrueFalse(questionData);
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

