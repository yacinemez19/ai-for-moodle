// ============================================
// VARIABLES GLOBALES
// ============================================

let questions = [];
let results = [];
let currentFilter = 'all';

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  checkAPIConfiguration();
});

function initializeUI() {
  // Bouton charger les questions
  document.getElementById('loadBtn').addEventListener('click', loadQuestions);
  
  // Bouton démarrer le test
  document.getElementById('startBtn').addEventListener('click', startBenchmark);
  
  // Boutons de filtre
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentFilter = e.target.dataset.filter;
      updateFilterButtons();
      displayResults();
    });
  });
  
  // Bouton export
  document.getElementById('exportBtn').addEventListener('click', exportResults);
}

async function checkAPIConfiguration() {
  try {
    const storage = await chrome.storage.local.get(['apiKey', 'fileStoreStatus', 'fileStoreId']);
    
    if (storage.apiKey) {
      document.getElementById('apiKeyStatus').textContent = '✅ Configurée';
      document.getElementById('apiKeyStatus').style.color = '#48bb78';
    }
    
    if (storage.fileStoreStatus === 'active' && storage.fileStoreId) {
      document.getElementById('ragStatus').textContent = '✅ Oui';
      document.getElementById('ragStatus').style.color = '#48bb78';
    }
  } catch (error) {
    console.error('Erreur vérification config:', error);
  }
}

// ============================================
// CHARGEMENT DES QUESTIONS
// ============================================

function loadQuestions() {
  const jsonInput = document.getElementById('jsonInput').value.trim();
  const statusDiv = document.getElementById('loadStatus');
  
  if (!jsonInput) {
    showStatus(statusDiv, 'Veuillez coller un JSON valide', 'error');
    return;
  }
  
  try {
    const data = JSON.parse(jsonInput);
    
    // Valider que c'est un tableau
    if (!Array.isArray(data)) {
      throw new Error('Le JSON doit être un tableau de questions');
    }
    
    // Valider la structure des questions
    for (let i = 0; i < data.length; i++) {
      const q = data[i];
      if (!q.question || !q.possibilites || !q.reponse) {
        throw new Error(`Question ${i + 1}: structure invalide (manque question, possibilites ou reponse)`);
      }
    }
    
    questions = data;
    document.getElementById('questionCount').textContent = questions.length;
    
    showStatus(statusDiv, `✅ ${questions.length} question(s) chargée(s) avec succès`, 'success');
    document.getElementById('configSection').style.display = 'block';
    
  } catch (error) {
    showStatus(statusDiv, `❌ Erreur de parsing: ${error.message}`, 'error');
  }
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-message ${type}`;
}

// ============================================
// DÉMARRAGE DU BENCHMARK
// ============================================

async function startBenchmark() {
  if (questions.length === 0) {
    alert('Veuillez d\'abord charger des questions');
    return;
  }
  
  // Vérifier que l'API est configurée
  const storage = await chrome.storage.local.get(['apiKey']);
  if (!storage.apiKey) {
    alert('❌ Clé API Gemini non configurée.\nVeuillez ouvrir le popup de l\'extension pour la configurer.');
    return;
  }
  
  // Réinitialiser les résultats
  results = [];
  
  // Afficher la section de progression
  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('startBtn').disabled = true;
  document.getElementById('loadBtn').disabled = true;
  
  // Masquer les sections de résultats
  document.getElementById('statsSection').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('exportSection').style.display = 'none';
  
  // Traiter chaque question
  for (let i = 0; i < questions.length; i++) {
    await processQuestion(i);
    updateProgress(i + 1, questions.length);
  }
  
  // Afficher les résultats finaux
  displayFinalResults();
  
  // Réactiver les boutons
  document.getElementById('startBtn').disabled = false;
  document.getElementById('loadBtn').disabled = false;
}

async function processQuestion(index) {
  const question = questions[index];
  
  console.log(`[Benchmark] Traitement question ${index + 1}/${questions.length}`);
  
  try {
    // Convertir au format attendu par background.js
    const questionData = convertToMoodleFormat(question);
    
    // Envoyer à background.js pour analyse
    const response = await chrome.runtime.sendMessage({
      action: 'analyze',
      data: questionData
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    // Parser la réponse du LLM
    const llmAnswer = parseLLMAnswer(response.data.answer);
    const expectedAnswer = normalizeAnswer(question.reponse);
    
    // Comparer les réponses
    const isCorrect = compareAnswers(llmAnswer, expectedAnswer);
    
    results.push({
      questionIndex: index + 1,
      question: question.question,
      options: question.possibilites,
      expectedAnswer: expectedAnswer,
      llmAnswer: llmAnswer,
      llmReasoning: response.data.reasoning,
      llmRawText: response.data.rawText,
      isCorrect: isCorrect,
      status: 'success'
    });
    
  } catch (error) {
    console.error(`[Benchmark] Erreur question ${index + 1}:`, error);
    
    results.push({
      questionIndex: index + 1,
      question: question.question,
      options: question.possibilites,
      expectedAnswer: normalizeAnswer(question.reponse),
      llmAnswer: null,
      llmReasoning: null,
      llmRawText: error.message,
      isCorrect: false,
      status: 'error',
      error: error.message
    });
  }
}

// ============================================
// CONVERSION ET PARSING
// ============================================

function convertToMoodleFormat(question) {
  // Déterminer si c'est une question à choix multiples ou unique
  const isMultiple = Array.isArray(question.reponse);
  
  return {
    type: 'multichoice',
    subtype: isMultiple ? 'multiple' : 'single',
    questionText: question.question,
    options: question.possibilites.map(p => ({
      letter: p.id,
      text: p.texte
    }))
  };
}

function parseLLMAnswer(answerText) {
  // Le LLM doit répondre au format: "a." ou "a. et c." ou "a, b, c"
  const cleaned = answerText.toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+et\s+/g, ',')
    .replace(/\s+/g, '');
  
  // Extraire toutes les lettres
  const letters = cleaned.match(/[a-z]/g) || [];
  
  return letters.sort();
}

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.map(a => a.toLowerCase()).sort();
  }
  return [answer.toLowerCase()];
}

function compareAnswers(llmAnswer, expectedAnswer) {
  if (llmAnswer.length !== expectedAnswer.length) {
    return false;
  }
  
  for (let i = 0; i < llmAnswer.length; i++) {
    if (llmAnswer[i] !== expectedAnswer[i]) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  document.getElementById('progressBar').style.width = `${percentage}%`;
  document.getElementById('progressText').textContent = `${current} / ${total} questions traitées`;
}

function displayFinalResults() {
  // Calculer les statistiques
  const correct = results.filter(r => r.isCorrect && r.status === 'success').length;
  const incorrect = results.filter(r => !r.isCorrect && r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
  
  // Afficher les statistiques
  document.getElementById('correctCount').textContent = correct;
  document.getElementById('incorrectCount').textContent = incorrect;
  document.getElementById('errorCount').textContent = errors;
  document.getElementById('accuracyRate').textContent = `${accuracy}%`;
  
  // Afficher les sections
  document.getElementById('statsSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('exportSection').style.display = 'block';
  
  // Afficher les résultats détaillés
  displayResults();
}

function displayResults() {
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';
  
  // Filtrer les résultats
  let filteredResults = results;
  if (currentFilter === 'correct') {
    filteredResults = results.filter(r => r.isCorrect && r.status === 'success');
  } else if (currentFilter === 'incorrect') {
    filteredResults = results.filter(r => !r.isCorrect && r.status === 'success');
  } else if (currentFilter === 'error') {
    filteredResults = results.filter(r => r.status === 'error');
  }
  
  // Afficher chaque résultat
  filteredResults.forEach(result => {
    const resultDiv = createResultElement(result);
    resultsList.appendChild(resultDiv);
  });
  
  if (filteredResults.length === 0) {
    resultsList.innerHTML = '<p style="text-align: center; color: #718096; padding: 40px;">Aucun résultat à afficher pour ce filtre</p>';
  }
}

function createResultElement(result) {
  const div = document.createElement('div');
  div.className = `result-item ${result.status === 'error' ? 'error' : (result.isCorrect ? 'correct' : 'incorrect')}`;
  
  // Statut
  let statusText = result.status === 'error' ? 'ERREUR' : (result.isCorrect ? '✅ CORRECT' : '❌ INCORRECT');
  let statusClass = result.status === 'error' ? 'error' : (result.isCorrect ? 'correct' : 'incorrect');
  
  // Options HTML
  let optionsHTML = '';
  if (result.options && result.options.length > 0) {
    optionsHTML = '<ul class="options-list">';
    result.options.forEach(opt => {
      optionsHTML += `<li><strong>${opt.id}.</strong> ${opt.texte}</li>`;
    });
    optionsHTML += '</ul>';
  }
  
  // Réponse LLM
  let llmAnswerHTML = result.llmAnswer ? result.llmAnswer.join(', ') : 'N/A';
  
  // Réponse attendue
  let expectedAnswerHTML = result.expectedAnswer.join(', ');
  
  // Justification
  let reasoningHTML = '';
  if (result.llmReasoning) {
    reasoningHTML = `
      <div class="reasoning">
        <h4>💡 Justification du LLM:</h4>
        <p>${result.llmReasoning}</p>
      </div>
    `;
  }
  
  // Message d'erreur
  let errorHTML = '';
  if (result.status === 'error') {
    errorHTML = `
      <div class="reasoning" style="border-left-color: #ed8936;">
        <h4>⚠️ Erreur:</h4>
        <p>${result.error}</p>
      </div>
    `;
  }
  
  div.innerHTML = `
    <div class="result-header">
      <span class="result-number">Question ${result.questionIndex}</span>
      <span class="result-status ${statusClass}">${statusText}</span>
    </div>
    
    <div class="question-text">${result.question}</div>
    
    ${optionsHTML}
    
    <div class="answer-comparison">
      <div class="answer-box expected">
        <h4>✔️ Réponse attendue</h4>
        <div class="answer-value">${expectedAnswerHTML}</div>
      </div>
      
      <div class="answer-box llm">
        <h4>🤖 Réponse du LLM</h4>
        <div class="answer-value">${llmAnswerHTML}</div>
      </div>
    </div>
    
    ${reasoningHTML}
    ${errorHTML}
  `;
  
  return div;
}

function updateFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === currentFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ============================================
// EXPORT DES RÉSULTATS
// ============================================

function exportResults() {
  const exportData = {
    metadata: {
      date: new Date().toISOString(),
      totalQuestions: results.length,
      correct: results.filter(r => r.isCorrect && r.status === 'success').length,
      incorrect: results.filter(r => !r.isCorrect && r.status === 'success').length,
      errors: results.filter(r => r.status === 'error').length,
      accuracy: ((results.filter(r => r.isCorrect && r.status === 'success').length / results.length) * 100).toFixed(2) + '%'
    },
    results: results
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `benchmark_results_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

