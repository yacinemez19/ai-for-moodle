// ============================================
// VARIABLES GLOBALES
// ============================================

let testHistory = [];
let currentRAGStatus = 'unknown';
const optionLetters = 'abcdefghijklmnopqrstuvwxyz';

// ============================================
// QUESTIONS PRÉDÉFINIES
// ============================================

const predefinedQuestions = [
  {
    type: 'multichoice',
    question: "Qu'est-ce qu'un bilan en comptabilité ?",
    options: [
      { letter: 'a', text: "Un document qui retrace l'activité sur une période" },
      { letter: 'b', text: "Une photographie du patrimoine à un instant T" },
      { letter: 'c', text: "Un tableau de suivi des stocks" }
    ]
  },
  {
    type: 'multichoice',
    question: "Qu'est-ce qu'un segment de marché en marketing ?",
    options: [
      { letter: 'a', text: "Un prix de vente" },
      { letter: 'b', text: "Un sous-ensemble homogène de consommateurs" },
      { letter: 'c', text: "Un canal de distribution" }
    ]
  },
  {
    type: 'truefalse',
    question: "Le bilan doit toujours être équilibré (Actif = Passif)",
    options: []
  },
  {
    type: 'multichoice',
    question: "Que signifie l'acronyme 'SWOT' en analyse stratégique ?",
    options: [
      { letter: 'a', text: "Strengths, Weaknesses, Opportunities, Threats" },
      { letter: 'b', text: "Sales, Work, Operations, Tactics" },
      { letter: 'c', text: "Strategy, Workflow, Objectives, Training" }
    ]
  },
  {
    type: 'multichoice',
    question: "Quel est le principe de base de la méthode des coûts complets ?",
    options: [
      { letter: 'a', text: "Affecter tous les coûts aux produits" },
      { letter: 'b', text: "Ne compter que les coûts variables" },
      { letter: 'c', text: "Ignorer les coûts fixes" }
    ]
  },
  {
    type: 'truefalse',
    question: "En marketing, les 4P représentent : Produit, Prix, Place, Promotion",
    options: []
  }
];

// ============================================
// INITIALISATION
// ============================================

async function init() {
  await checkRAGStatus();
  loadTestHistory();
  renderPredefinedQuestions();
  setupEventListeners();
}

// ============================================
// VÉRIFICATION DU STATUT RAG
// ============================================

async function checkRAGStatus() {
  try {
    const result = await chrome.storage.local.get(['fileStoreId', 'fileStoreStatus', 'fileStoreFiles']);
    
    const statusCard = document.getElementById('rag-status');
    const statusIcon = statusCard.querySelector('.status-icon');
    const statusText = statusCard.querySelector('.status-text');
    
    if (result.fileStoreStatus === 'active' && result.fileStoreFiles && result.fileStoreFiles.length > 0) {
      currentRAGStatus = 'active';
      statusIcon.textContent = '🟢';
      statusText.textContent = `RAG actif avec ${result.fileStoreFiles.length} fichier(s) indexé(s)`;
      statusCard.classList.add('active');
    } else {
      currentRAGStatus = 'inactive';
      statusIcon.textContent = '⚪';
      statusText.textContent = 'RAG non configuré - Utilisez la connaissance générale';
      statusCard.classList.add('inactive');
    }
  } catch (error) {
    console.error('Erreur vérification RAG:', error);
    currentRAGStatus = 'error';
    const statusCard = document.getElementById('rag-status');
    statusCard.querySelector('.status-icon').textContent = '❌';
    statusCard.querySelector('.status-text').textContent = 'Erreur de configuration';
  }
}

// ============================================
// AFFICHAGE DES QUESTIONS PRÉDÉFINIES
// ============================================

function renderPredefinedQuestions() {
  const container = document.getElementById('predefined-questions');
  
  container.innerHTML = predefinedQuestions.map((q, index) => {
    const typeLabel = q.type === 'truefalse' ? 'Vrai/Faux' : 'QCM';
    return `
      <div class="question-card" data-index="${index}">
        <div class="question-type">${typeLabel}</div>
        <div class="question-text">${q.question}</div>
      </div>
    `;
  }).join('');
  
  // Event listeners
  document.querySelectorAll('.question-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.index);
      testPredefinedQuestion(predefinedQuestions[index]);
    });
  });
}

// ============================================
// GESTION DES OPTIONS
// ============================================

function setupEventListeners() {
  // Type de question
  document.getElementById('question-type').addEventListener('change', (e) => {
    const optionsContainer = document.getElementById('options-container');
    if (e.target.value === 'truefalse') {
      optionsContainer.style.display = 'none';
    } else {
      optionsContainer.style.display = 'block';
    }
  });
  
  // Ajouter une option
  document.getElementById('add-option-btn').addEventListener('click', addOption);
  
  // Supprimer une option
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-option-btn')) {
      e.target.closest('.option-item').remove();
    }
  });
  
  // Test de la question personnalisée
  document.getElementById('test-custom-btn').addEventListener('click', testCustomQuestion);
  
  // Boutons du résultat
  document.getElementById('copy-result-btn').addEventListener('click', copyResult);
  document.getElementById('test-another-btn').addEventListener('click', () => {
    document.getElementById('result-section').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // Effacer l'historique
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  
  // Retour au popup
  document.getElementById('back-to-popup-btn').addEventListener('click', () => {
    window.close();
  });
}

function addOption() {
  const optionsList = document.getElementById('options-list');
  const currentCount = optionsList.querySelectorAll('.option-item').length;
  
  if (currentCount >= 26) {
    alert('Maximum 26 options');
    return;
  }
  
  const letter = optionLetters[currentCount];
  const optionHtml = `
    <div class="option-item">
      <input type="text" class="option-input" placeholder="Option ${letter.toUpperCase()}" data-letter="${letter}">
      <button class="remove-option-btn" title="Supprimer">❌</button>
    </div>
  `;
  
  optionsList.insertAdjacentHTML('beforeend', optionHtml);
}

// ============================================
// TEST DES QUESTIONS
// ============================================

async function testPredefinedQuestion(questionData) {
  await testQuestion(questionData);
}

async function testCustomQuestion() {
  const questionText = document.getElementById('custom-question').value.trim();
  const questionType = document.getElementById('question-type').value;
  
  if (!questionText) {
    alert('Veuillez entrer une question');
    return;
  }
  
  let options = [];
  
  if (questionType !== 'truefalse') {
    const optionInputs = document.querySelectorAll('.option-input');
    options = Array.from(optionInputs)
      .map(input => ({
        letter: input.dataset.letter + '.',
        text: input.value.trim()
      }))
      .filter(opt => opt.text !== '');
    
    if (options.length < 2) {
      alert('Veuillez entrer au moins 2 options');
      return;
    }
  }
  
  const questionData = {
    type: questionType === 'multiple' ? 'multichoice' : questionType,
    subtype: questionType === 'multiple' ? 'multiple' : 'single',
    questionText: questionText,
    options: options
  };
  
  await testQuestion(questionData);
}

async function testQuestion(questionData) {
  showLoading(true);
  
  const startTime = Date.now();
  
  try {
    // Envoyer au background pour analyse
    const response = await chrome.runtime.sendMessage({
      action: 'analyze',
      data: questionData
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.success) {
      displayResult(questionData, response.data, responseTime);
      addToHistory(questionData, response.data, responseTime);
    } else {
      throw new Error(response.error);
    }
    
  } catch (error) {
    console.error('Erreur de test:', error);
    alert(`Erreur : ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================

function displayResult(questionData, responseData, responseTime) {
  const resultSection = document.getElementById('result-section');
  
  // Question testée
  document.getElementById('tested-question').textContent = questionData.questionText;
  
  // Réponse
  document.getElementById('answer-result').textContent = responseData.answer;
  
  // Justification
  document.getElementById('justification-result').textContent = responseData.reasoning;
  
  // Temps de réponse
  document.getElementById('response-time').textContent = `${responseTime} ms (${(responseTime / 1000).toFixed(2)} secondes)`;
  
  // Mode utilisé
  const modeText = currentRAGStatus === 'active' 
    ? '🟢 RAG activé (réponse basée sur vos cours)' 
    : '⚪ Connaissance générale (RAG non activé)';
  document.getElementById('mode-used').textContent = modeText;
  
  // Afficher la section
  resultSection.style.display = 'block';
  
  // Scroll vers le résultat
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// HISTORIQUE
// ============================================

function addToHistory(questionData, responseData, responseTime) {
  const historyItem = {
    timestamp: new Date().toISOString(),
    question: questionData.questionText,
    answer: responseData.answer,
    reasoning: responseData.reasoning,
    responseTime: responseTime,
    ragActive: currentRAGStatus === 'active'
  };
  
  testHistory.unshift(historyItem);
  
  // Limiter à 50 entrées
  if (testHistory.length > 50) {
    testHistory = testHistory.slice(0, 50);
  }
  
  saveTestHistory();
  renderHistory();
}

function loadTestHistory() {
  const saved = localStorage.getItem('testHistory');
  if (saved) {
    try {
      testHistory = JSON.parse(saved);
      renderHistory();
    } catch (e) {
      console.error('Erreur chargement historique:', e);
    }
  }
}

function saveTestHistory() {
  localStorage.setItem('testHistory', JSON.stringify(testHistory));
}

function renderHistory() {
  const container = document.getElementById('history-list');
  
  if (testHistory.length === 0) {
    container.innerHTML = '<p class="empty-message">Aucun test effectué pour le moment</p>';
    return;
  }
  
  container.innerHTML = testHistory.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString('fr-FR');
    const dateStr = date.toLocaleDateString('fr-FR');
    const ragIcon = item.ragActive ? '🟢' : '⚪';
    
    return `
      <div class="history-item">
        <div class="history-time">${ragIcon} ${dateStr} à ${timeStr} (${item.responseTime}ms)</div>
        <div class="history-question">${item.question}</div>
        <div class="history-answer">→ ${item.answer}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (confirm('Voulez-vous vraiment effacer l\'historique des tests ?')) {
    testHistory = [];
    saveTestHistory();
    renderHistory();
  }
}

// ============================================
// UTILITAIRES
// ============================================

function showLoading(show) {
  document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function copyResult() {
  const question = document.getElementById('tested-question').textContent;
  const answer = document.getElementById('answer-result').textContent;
  const justification = document.getElementById('justification-result').textContent;
  const responseTime = document.getElementById('response-time').textContent;
  const mode = document.getElementById('mode-used').textContent;
  
  const text = `
📝 QUESTION :
${question}

✅ RÉPONSE :
${answer}

💡 JUSTIFICATION :
${justification}

⏱️ TEMPS DE RÉPONSE :
${responseTime}

🔍 MODE :
${mode}
  `.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-result-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copié !';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });
}

// ============================================
// LANCEMENT
// ============================================

init();

